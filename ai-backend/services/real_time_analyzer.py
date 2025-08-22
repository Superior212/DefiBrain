import asyncio
import aiohttp
import websockets
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import re
from textblob import TextBlob
import yfinance as yf
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

from config import settings, DATA_COLLECTION_INTERVALS
from utils.technical_indicators import TechnicalIndicators
from services.data_service import DataService

logger = logging.getLogger(__name__)

@dataclass
class MarketSignal:
    timestamp: datetime
    token: str
    signal_type: str  # 'bullish', 'bearish', 'neutral'
    strength: float  # 0-1
    source: str
    data: Dict[str, Any]

@dataclass
class SentimentData:
    timestamp: datetime
    token: str
    sentiment_score: float  # -1 to 1
    confidence: float  # 0-1
    source: str
    text_sample: str

class RealTimeAnalyzer:
    def __init__(self):
        self.is_running = False
        self.websocket_connections = {}
        self.data_service = DataService()
        self.technical_indicators = TechnicalIndicators()
        self.sentiment_analyzer = None
        self.price_data_cache = {}
        self.sentiment_cache = {}
        self.market_signals = []
        self.analysis_tasks = []
        
    async def initialize(self):
        """Initialize the real-time analyzer"""
        try:
            await self.data_service.initialize()
            await self._initialize_sentiment_analyzer()
            logger.info("Real-time analyzer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize real-time analyzer: {e}")
            raise
    
    async def _initialize_sentiment_analyzer(self):
        """Initialize sentiment analysis model"""
        try:
            # Use a pre-trained sentiment analysis model
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                tokenizer="cardiffnlp/twitter-roberta-base-sentiment-latest"
            )
            logger.info("Sentiment analyzer initialized")
        except Exception as e:
            logger.warning(f"Failed to load sentiment analyzer: {e}")
            # Fallback to TextBlob
            self.sentiment_analyzer = None
    
    async def start(self):
        """Start real-time analysis"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start analysis tasks
        self.analysis_tasks = [
            asyncio.create_task(self._price_data_collector()),
            asyncio.create_task(self._news_sentiment_collector()),
            asyncio.create_task(self._social_sentiment_collector()),
            asyncio.create_task(self._technical_analysis_processor()),
            asyncio.create_task(self._market_signal_generator())
        ]
        
        logger.info("Real-time analyzer started")
    
    async def stop(self):
        """Stop real-time analysis"""
        self.is_running = False
        
        # Cancel all tasks
        for task in self.analysis_tasks:
            task.cancel()
        
        # Close websocket connections
        for ws in self.websocket_connections.values():
            if not ws.closed:
                await ws.close()
        
        logger.info("Real-time analyzer stopped")
    
    def is_running_status(self) -> bool:
        return self.is_running
    
    async def _price_data_collector(self):
        """Collect real-time price data"""
        while self.is_running:
            try:
                for token in settings.SUPPORTED_TOKENS:
                    # Get latest price data
                    price_data = await self._fetch_latest_price_data(token)
                    
                    if price_data:
                        self.price_data_cache[token] = price_data
                        
                        # Generate price-based signals
                        await self._analyze_price_movement(token, price_data)
                
                await asyncio.sleep(DATA_COLLECTION_INTERVALS["price_data"])
                
            except Exception as e:
                logger.error(f"Error in price data collection: {e}")
                await asyncio.sleep(60)
    
    async def _fetch_latest_price_data(self, token: str) -> Optional[Dict]:
        """Fetch latest price data for a token"""
        try:
            # Use multiple data sources for redundancy
            sources = [
                self._fetch_from_coingecko,
                self._fetch_from_binance,
                self._fetch_from_coinmarketcap
            ]
            
            for source in sources:
                try:
                    data = await source(token)
                    if data:
                        return data
                except Exception as e:
                    logger.debug(f"Failed to fetch from {source.__name__}: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching price data for {token}: {e}")
            return None
    
    async def _fetch_from_coingecko(self, token: str) -> Optional[Dict]:
        """Fetch price data from CoinGecko"""
        token_map = {
            'ETH': 'ethereum',
            'BTC': 'bitcoin',
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai'
        }
        
        coin_id = token_map.get(token, token.lower())
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    coin_data = data.get(coin_id, {})
                    
                    return {
                        'token': token,
                        'price': coin_data.get('usd', 0),
                        'change_24h': coin_data.get('usd_24h_change', 0),
                        'volume_24h': coin_data.get('usd_24h_vol', 0),
                        'timestamp': datetime.now(),
                        'source': 'coingecko'
                    }
        
        return None
    
    async def _fetch_from_binance(self, token: str) -> Optional[Dict]:
        """Fetch price data from Binance"""
        symbol_map = {
            'ETH': 'ETHUSDT',
            'BTC': 'BTCUSDT',
            'USDC': 'USDCUSDT',
            'USDT': 'USDTUSDT'
        }
        
        symbol = symbol_map.get(token)
        if not symbol:
            return None
        
        url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return {
                        'token': token,
                        'price': float(data.get('lastPrice', 0)),
                        'change_24h': float(data.get('priceChangePercent', 0)),
                        'volume_24h': float(data.get('volume', 0)),
                        'timestamp': datetime.now(),
                        'source': 'binance'
                    }
        
        return None
    
    async def _fetch_from_coinmarketcap(self, token: str) -> Optional[Dict]:
        """Fetch price data from CoinMarketCap"""
        if not settings.COINMARKETCAP_API_KEY:
            return None
        
        url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
        headers = {
            'X-CMC_PRO_API_KEY': settings.COINMARKETCAP_API_KEY
        }
        params = {
            'symbol': token,
            'convert': 'USD'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    token_data = data.get('data', {}).get(token, {})
                    quote = token_data.get('quote', {}).get('USD', {})
                    
                    return {
                        'token': token,
                        'price': quote.get('price', 0),
                        'change_24h': quote.get('percent_change_24h', 0),
                        'volume_24h': quote.get('volume_24h', 0),
                        'timestamp': datetime.now(),
                        'source': 'coinmarketcap'
                    }
        
        return None
    
    async def _analyze_price_movement(self, token: str, price_data: Dict):
        """Analyze price movement and generate signals"""
        try:
            change_24h = price_data.get('change_24h', 0)
            volume_24h = price_data.get('volume_24h', 0)
            
            # Generate signals based on price movement
            signals = []
            
            # Strong price movement signal
            if abs(change_24h) > 5:
                signal_type = 'bullish' if change_24h > 0 else 'bearish'
                strength = min(1.0, abs(change_24h) / 20)  # Normalize to 0-1
                
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type=signal_type,
                    strength=strength,
                    source='price_movement',
                    data={'change_24h': change_24h, 'volume_24h': volume_24h}
                ))
            
            # Volume spike signal
            if token in self.price_data_cache:
                prev_data = self.price_data_cache[token]
                prev_volume = prev_data.get('volume_24h', 0)
                
                if prev_volume > 0 and volume_24h > prev_volume * 2:
                    signals.append(MarketSignal(
                        timestamp=datetime.now(),
                        token=token,
                        signal_type='bullish',
                        strength=0.6,
                        source='volume_spike',
                        data={'volume_increase': volume_24h / prev_volume}
                    ))
            
            # Add signals to cache
            self.market_signals.extend(signals)
            
            # Keep only recent signals (last 24 hours)
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.market_signals = [
                signal for signal in self.market_signals 
                if signal.timestamp > cutoff_time
            ]
            
        except Exception as e:
            logger.error(f"Error analyzing price movement for {token}: {e}")
    
    async def _news_sentiment_collector(self):
        """Collect and analyze news sentiment"""
        while self.is_running:
            try:
                for token in settings.SUPPORTED_TOKENS:
                    news_data = await self._fetch_news_data(token)
                    
                    if news_data:
                        sentiment_data = await self._analyze_news_sentiment(token, news_data)
                        
                        if sentiment_data:
                            self.sentiment_cache[f"{token}_news"] = sentiment_data
                
                await asyncio.sleep(DATA_COLLECTION_INTERVALS["news_sentiment"])
                
            except Exception as e:
                logger.error(f"Error in news sentiment collection: {e}")
                await asyncio.sleep(300)
    
    async def _fetch_news_data(self, token: str) -> Optional[List[Dict]]:
        """Fetch news data for a token"""
        if not settings.NEWSAPI_KEY:
            return None
        
        query = f"{token} cryptocurrency OR {token} crypto OR {token} blockchain"
        url = "https://newsapi.org/v2/everything"
        params = {
            'q': query,
            'language': 'en',
            'sortBy': 'publishedAt',
            'pageSize': 20,
            'apiKey': settings.NEWSAPI_KEY
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('articles', [])
        except Exception as e:
            logger.error(f"Error fetching news for {token}: {e}")
        
        return None
    
    async def _analyze_news_sentiment(self, token: str, news_data: List[Dict]) -> Optional[SentimentData]:
        """Analyze sentiment of news articles"""
        if not news_data:
            return None
        
        sentiments = []
        text_samples = []
        
        for article in news_data[:10]:  # Analyze top 10 articles
            title = article.get('title', '')
            description = article.get('description', '')
            text = f"{title} {description}"
            
            if len(text.strip()) < 10:
                continue
            
            sentiment_score = await self._get_sentiment_score(text)
            
            if sentiment_score is not None:
                sentiments.append(sentiment_score)
                text_samples.append(text[:100])  # First 100 chars
        
        if not sentiments:
            return None
        
        # Calculate average sentiment
        avg_sentiment = np.mean(sentiments)
        confidence = 1.0 - np.std(sentiments)  # Lower std = higher confidence
        
        return SentimentData(
            timestamp=datetime.now(),
            token=token,
            sentiment_score=avg_sentiment,
            confidence=max(0.1, min(1.0, confidence)),
            source='news',
            text_sample='; '.join(text_samples[:3])
        )
    
    async def _get_sentiment_score(self, text: str) -> Optional[float]:
        """Get sentiment score for text"""
        try:
            if self.sentiment_analyzer:
                # Use transformer model
                result = self.sentiment_analyzer(text[:512])  # Limit text length
                
                if result and len(result) > 0:
                    label = result[0]['label'].lower()
                    score = result[0]['score']
                    
                    # Convert to -1 to 1 scale
                    if 'positive' in label:
                        return score
                    elif 'negative' in label:
                        return -score
                    else:
                        return 0.0
            else:
                # Fallback to TextBlob
                blob = TextBlob(text)
                return blob.sentiment.polarity
                
        except Exception as e:
            logger.debug(f"Error getting sentiment score: {e}")
        
        return None
    
    async def _social_sentiment_collector(self):
        """Collect social media sentiment (Twitter, Reddit)"""
        while self.is_running:
            try:
                # This would integrate with Twitter API, Reddit API, etc.
                # For now, simulate social sentiment
                for token in settings.SUPPORTED_TOKENS:
                    social_sentiment = await self._simulate_social_sentiment(token)
                    
                    if social_sentiment:
                        self.sentiment_cache[f"{token}_social"] = social_sentiment
                
                await asyncio.sleep(DATA_COLLECTION_INTERVALS["social_sentiment"])
                
            except Exception as e:
                logger.error(f"Error in social sentiment collection: {e}")
                await asyncio.sleep(300)
    
    async def _simulate_social_sentiment(self, token: str) -> SentimentData:
        """Simulate social sentiment data"""
        # Generate realistic sentiment based on price movement
        price_data = self.price_data_cache.get(token, {})
        change_24h = price_data.get('change_24h', 0)
        
        # Sentiment tends to follow price movement with some noise
        base_sentiment = np.tanh(change_24h / 10)  # Normalize price change
        noise = np.random.normal(0, 0.2)  # Add noise
        sentiment_score = np.clip(base_sentiment + noise, -1, 1)
        
        return SentimentData(
            timestamp=datetime.now(),
            token=token,
            sentiment_score=sentiment_score,
            confidence=0.7,
            source='social_simulation',
            text_sample=f"Simulated social sentiment for {token}"
        )
    
    async def _technical_analysis_processor(self):
        """Process technical analysis indicators"""
        while self.is_running:
            try:
                for token in settings.SUPPORTED_TOKENS:
                    # Get historical data for technical analysis
                    historical_data = await self.data_service.get_recent_price_data(token, hours=168)
                    
                    if historical_data is not None and len(historical_data) > 50:
                        technical_signals = await self._generate_technical_signals(token, historical_data)
                        
                        if technical_signals:
                            self.market_signals.extend(technical_signals)
                
                await asyncio.sleep(DATA_COLLECTION_INTERVALS["price_data"] * 5)  # Less frequent
                
            except Exception as e:
                logger.error(f"Error in technical analysis: {e}")
                await asyncio.sleep(300)
    
    async def _generate_technical_signals(self, token: str, data: pd.DataFrame) -> List[MarketSignal]:
        """Generate technical analysis signals"""
        signals = []
        
        try:
            # Add technical indicators
            data_with_indicators = self.technical_indicators.add_all_indicators(data)
            
            if len(data_with_indicators) < 20:
                return signals
            
            latest = data_with_indicators.iloc[-1]
            prev = data_with_indicators.iloc[-2]
            
            # RSI signals
            rsi = latest.get('rsi', 50)
            if rsi < 30:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bullish',
                    strength=0.7,
                    source='rsi_oversold',
                    data={'rsi': rsi}
                ))
            elif rsi > 70:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bearish',
                    strength=0.7,
                    source='rsi_overbought',
                    data={'rsi': rsi}
                ))
            
            # MACD signals
            macd = latest.get('macd', 0)
            macd_signal = latest.get('macd_signal', 0)
            prev_macd = prev.get('macd', 0)
            prev_macd_signal = prev.get('macd_signal', 0)
            
            # MACD crossover
            if macd > macd_signal and prev_macd <= prev_macd_signal:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bullish',
                    strength=0.6,
                    source='macd_bullish_crossover',
                    data={'macd': macd, 'signal': macd_signal}
                ))
            elif macd < macd_signal and prev_macd >= prev_macd_signal:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bearish',
                    strength=0.6,
                    source='macd_bearish_crossover',
                    data={'macd': macd, 'signal': macd_signal}
                ))
            
            # Moving average signals
            price = latest.get('close', 0)
            sma_20 = latest.get('sma_20', 0)
            sma_50 = latest.get('sma_50', 0)
            
            if price > sma_20 > sma_50:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bullish',
                    strength=0.5,
                    source='ma_bullish_alignment',
                    data={'price': price, 'sma_20': sma_20, 'sma_50': sma_50}
                ))
            elif price < sma_20 < sma_50:
                signals.append(MarketSignal(
                    timestamp=datetime.now(),
                    token=token,
                    signal_type='bearish',
                    strength=0.5,
                    source='ma_bearish_alignment',
                    data={'price': price, 'sma_20': sma_20, 'sma_50': sma_50}
                ))
            
        except Exception as e:
            logger.error(f"Error generating technical signals for {token}: {e}")
        
        return signals
    
    async def _market_signal_generator(self):
        """Generate composite market signals"""
        while self.is_running:
            try:
                for token in settings.SUPPORTED_TOKENS:
                    composite_signal = await self._generate_composite_signal(token)
                    
                    if composite_signal:
                        # Store composite signal
                        self.market_signals.append(composite_signal)
                
                await asyncio.sleep(300)  # Generate composite signals every 5 minutes
                
            except Exception as e:
                logger.error(f"Error generating market signals: {e}")
                await asyncio.sleep(300)
    
    async def _generate_composite_signal(self, token: str) -> Optional[MarketSignal]:
        """Generate composite signal from all data sources"""
        try:
            # Get recent signals for this token
            recent_signals = [
                signal for signal in self.market_signals
                if signal.token == token and 
                signal.timestamp > datetime.now() - timedelta(hours=1)
            ]
            
            if not recent_signals:
                return None
            
            # Calculate weighted signal strength
            bullish_strength = sum(
                signal.strength for signal in recent_signals 
                if signal.signal_type == 'bullish'
            )
            bearish_strength = sum(
                signal.strength for signal in recent_signals 
                if signal.signal_type == 'bearish'
            )
            
            # Get sentiment data
            news_sentiment = self.sentiment_cache.get(f"{token}_news")
            social_sentiment = self.sentiment_cache.get(f"{token}_social")
            
            sentiment_score = 0
            if news_sentiment:
                sentiment_score += news_sentiment.sentiment_score * 0.6
            if social_sentiment:
                sentiment_score += social_sentiment.sentiment_score * 0.4
            
            # Combine technical and sentiment signals
            net_technical = bullish_strength - bearish_strength
            combined_score = net_technical + sentiment_score
            
            # Determine signal type and strength
            if combined_score > 0.3:
                signal_type = 'bullish'
                strength = min(1.0, combined_score)
            elif combined_score < -0.3:
                signal_type = 'bearish'
                strength = min(1.0, abs(combined_score))
            else:
                signal_type = 'neutral'
                strength = 0.5
            
            return MarketSignal(
                timestamp=datetime.now(),
                token=token,
                signal_type=signal_type,
                strength=strength,
                source='composite',
                data={
                    'technical_score': net_technical,
                    'sentiment_score': sentiment_score,
                    'combined_score': combined_score,
                    'signal_count': len(recent_signals)
                }
            )
            
        except Exception as e:
            logger.error(f"Error generating composite signal for {token}: {e}")
            return None
    
    async def analyze_market(
        self,
        tokens: List[str],
        include_sentiment: bool = True,
        include_technical: bool = True
    ) -> Dict:
        """Analyze market for given tokens"""
        analysis = {
            'tokens': {},
            'market_overview': {},
            'timestamp': datetime.now().isoformat()
        }
        
        for token in tokens:
            token_analysis = {
                'price_data': self.price_data_cache.get(token, {}),
                'signals': [],
                'sentiment': {},
                'technical_indicators': {},
                'overall_signal': 'neutral'
            }
            
            # Get recent signals
            recent_signals = [
                {
                    'type': signal.signal_type,
                    'strength': signal.strength,
                    'source': signal.source,
                    'timestamp': signal.timestamp.isoformat(),
                    'data': signal.data
                }
                for signal in self.market_signals
                if signal.token == token and 
                signal.timestamp > datetime.now() - timedelta(hours=6)
            ]
            
            token_analysis['signals'] = recent_signals
            
            # Add sentiment data
            if include_sentiment:
                news_sentiment = self.sentiment_cache.get(f"{token}_news")
                social_sentiment = self.sentiment_cache.get(f"{token}_social")
                
                if news_sentiment:
                    token_analysis['sentiment']['news'] = {
                        'score': news_sentiment.sentiment_score,
                        'confidence': news_sentiment.confidence,
                        'timestamp': news_sentiment.timestamp.isoformat()
                    }
                
                if social_sentiment:
                    token_analysis['sentiment']['social'] = {
                        'score': social_sentiment.sentiment_score,
                        'confidence': social_sentiment.confidence,
                        'timestamp': social_sentiment.timestamp.isoformat()
                    }
            
            # Add technical indicators
            if include_technical:
                try:
                    historical_data = await self.data_service.get_recent_price_data(token, hours=24)
                    if historical_data is not None and len(historical_data) > 20:
                        data_with_indicators = self.technical_indicators.add_all_indicators(historical_data)
                        latest = data_with_indicators.iloc[-1]
                        
                        token_analysis['technical_indicators'] = {
                            'rsi': latest.get('rsi', 50),
                            'macd': latest.get('macd', 0),
                            'sma_20': latest.get('sma_20', 0),
                            'sma_50': latest.get('sma_50', 0),
                            'volatility': latest.get('volatility', 0)
                        }
                except Exception as e:
                    logger.error(f"Error getting technical indicators for {token}: {e}")
            
            # Determine overall signal
            composite_signals = [s for s in recent_signals if s['source'] == 'composite']
            if composite_signals:
                latest_composite = max(composite_signals, key=lambda x: x['timestamp'])
                token_analysis['overall_signal'] = latest_composite['type']
            
            analysis['tokens'][token] = token_analysis
        
        # Market overview
        all_signals = [s for token_data in analysis['tokens'].values() for s in token_data['signals']]
        
        bullish_signals = len([s for s in all_signals if s['type'] == 'bullish'])
        bearish_signals = len([s for s in all_signals if s['type'] == 'bearish'])
        
        analysis['market_overview'] = {
            'total_signals': len(all_signals),
            'bullish_signals': bullish_signals,
            'bearish_signals': bearish_signals,
            'market_sentiment': 'bullish' if bullish_signals > bearish_signals else 'bearish' if bearish_signals > bullish_signals else 'neutral',
            'signal_strength': (bullish_signals - bearish_signals) / max(1, len(all_signals))
        }
        
        return analysis