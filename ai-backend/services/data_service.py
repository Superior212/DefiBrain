import asyncio
import aiohttp
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import logging
import json
import redis
from dataclasses import dataclass
import yfinance as yf
import ccxt.async_support as ccxt
from web3 import Web3
import time

from config import settings, DATA_COLLECTION_INTERVALS

logger = logging.getLogger(__name__)

@dataclass
class PriceData:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    source: str

@dataclass
class ProtocolData:
    protocol: str
    tvl: float
    apy: float
    volume_24h: float
    timestamp: datetime
    additional_metrics: Dict[str, Any]

class DataService:
    """Service for collecting and managing market data from multiple sources"""
    
    def __init__(self):
        self.redis_client = None
        self.exchanges = {}
        self.web3_clients = {}
        self.price_cache = {}
        self.protocol_cache = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize data service connections"""
        try:
            # Initialize Redis
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                await self._test_redis_connection()
            
            # Initialize exchanges
            await self._initialize_exchanges()
            
            # Initialize Web3 clients
            self._initialize_web3_clients()
            
            self.is_initialized = True
            logger.info("Data service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize data service: {e}")
            raise
    
    async def _test_redis_connection(self):
        """Test Redis connection"""
        try:
            if self.redis_client:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.ping
                )
                logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None
    
    async def _initialize_exchanges(self):
        """Initialize cryptocurrency exchanges"""
        try:
            # Initialize Binance
            self.exchanges['binance'] = ccxt.binance({
                'apiKey': settings.BINANCE_API_KEY,
                'secret': settings.BINANCE_SECRET_KEY,
                'sandbox': False,
                'enableRateLimit': True,
            })
            
            # Initialize other exchanges as needed
            # self.exchanges['coinbase'] = ccxt.coinbasepro()
            # self.exchanges['kraken'] = ccxt.kraken()
            
            logger.info(f"Initialized {len(self.exchanges)} exchanges")
            
        except Exception as e:
            logger.error(f"Error initializing exchanges: {e}")
    
    def _initialize_web3_clients(self):
        """Initialize Web3 clients for different networks"""
        try:
            networks = {
                'ethereum': settings.ETHEREUM_RPC_URL,
                'polygon': settings.POLYGON_RPC_URL,
                'arbitrum': settings.ARBITRUM_RPC_URL,
                'mantle': settings.MANTLE_RPC_URL
            }
            
            for network, rpc_url in networks.items():
                if rpc_url:
                    self.web3_clients[network] = Web3(Web3.HTTPProvider(rpc_url))
                    logger.info(f"Initialized Web3 client for {network}")
            
        except Exception as e:
            logger.error(f"Error initializing Web3 clients: {e}")
    
    async def get_price_data(
        self,
        token: str,
        timeframe: str = '1h',
        limit: int = 100,
        source: str = 'auto'
    ) -> Optional[pd.DataFrame]:
        """Get historical price data for a token"""
        try:
            # Check cache first
            cache_key = f"price_data:{token}:{timeframe}:{limit}"
            cached_data = await self._get_from_cache(cache_key)
            
            if cached_data:
                return pd.DataFrame(cached_data)
            
            # Fetch from source
            if source == 'auto':
                data = await self._fetch_price_data_auto(token, timeframe, limit)
            elif source == 'binance':
                data = await self._fetch_from_binance(token, timeframe, limit)
            elif source == 'coingecko':
                data = await self._fetch_from_coingecko(token, timeframe, limit)
            elif source == 'yfinance':
                data = await self._fetch_from_yfinance(token, timeframe, limit)
            else:
                data = await self._fetch_price_data_auto(token, timeframe, limit)
            
            if data is not None:
                # Cache the data
                await self._set_cache(cache_key, data.to_dict('records'), ttl=300)  # 5 minutes
                return data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting price data for {token}: {e}")
            return None
    
    async def _fetch_price_data_auto(self, token: str, timeframe: str, limit: int) -> Optional[pd.DataFrame]:
        """Fetch price data using the best available source"""
        sources = [
            self._fetch_from_binance,
            self._fetch_from_coingecko,
            self._fetch_from_yfinance
        ]
        
        for source_func in sources:
            try:
                data = await source_func(token, timeframe, limit)
                if data is not None and len(data) > 0:
                    return data
            except Exception as e:
                logger.debug(f"Failed to fetch from {source_func.__name__}: {e}")
                continue
        
        return None
    
    async def _fetch_from_binance(self, token: str, timeframe: str, limit: int) -> Optional[pd.DataFrame]:
        """Fetch price data from Binance"""
        try:
            if 'binance' not in self.exchanges:
                return None
            
            symbol_map = {
                'ETH': 'ETH/USDT',
                'BTC': 'BTC/USDT',
                'USDC': 'USDC/USDT',
                'USDT': 'USDT/USD'
            }
            
            symbol = symbol_map.get(token, f"{token}/USDT")
            
            exchange = self.exchanges['binance']
            ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            
            if not ohlcv:
                return None
            
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            
            return df
            
        except Exception as e:
            logger.debug(f"Error fetching from Binance for {token}: {e}")
            return None
    
    async def _fetch_from_coingecko(self, token: str, timeframe: str, limit: int) -> Optional[pd.DataFrame]:
        """Fetch price data from CoinGecko"""
        try:
            token_map = {
                'ETH': 'ethereum',
                'BTC': 'bitcoin',
                'USDC': 'usd-coin',
                'USDT': 'tether',
                'DAI': 'dai'
            }
            
            coin_id = token_map.get(token, token.lower())
            
            # Convert timeframe to days
            timeframe_days = {
                '1m': 1,
                '5m': 1,
                '15m': 1,
                '1h': 7,
                '4h': 30,
                '1d': 365
            }
            
            days = timeframe_days.get(timeframe, 7)
            
            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
            params = {
                'vs_currency': 'usd',
                'days': days,
                'interval': 'hourly' if timeframe in ['1h', '4h'] else 'daily'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        prices = data.get('prices', [])
                        volumes = data.get('total_volumes', [])
                        
                        if not prices:
                            return None
                        
                        df_data = []
                        for i, (timestamp, price) in enumerate(prices[-limit:]):
                            volume = volumes[i][1] if i < len(volumes) else 0
                            
                            df_data.append({
                                'timestamp': pd.to_datetime(timestamp, unit='ms'),
                                'open': price,  # CoinGecko doesn't provide OHLC, using price
                                'high': price,
                                'low': price,
                                'close': price,
                                'volume': volume
                            })
                        
                        df = pd.DataFrame(df_data)
                        df.set_index('timestamp', inplace=True)
                        
                        return df
            
            return None
            
        except Exception as e:
            logger.debug(f"Error fetching from CoinGecko for {token}: {e}")
            return None
    
    async def _fetch_from_yfinance(self, token: str, timeframe: str, limit: int) -> Optional[pd.DataFrame]:
        """Fetch price data from Yahoo Finance"""
        try:
            symbol_map = {
                'ETH': 'ETH-USD',
                'BTC': 'BTC-USD',
                'USDC': 'USDC-USD',
                'USDT': 'USDT-USD'
            }
            
            symbol = symbol_map.get(token, f"{token}-USD")
            
            # Convert timeframe to yfinance interval
            interval_map = {
                '1m': '1m',
                '5m': '5m',
                '15m': '15m',
                '1h': '1h',
                '4h': '4h',
                '1d': '1d'
            }
            
            interval = interval_map.get(timeframe, '1h')
            
            # Calculate period based on limit and timeframe
            if timeframe == '1d':
                period = f"{limit}d"
            elif timeframe == '1h':
                period = f"{limit//24 + 1}d"
            else:
                period = "7d"
            
            # Run yfinance in executor to avoid blocking
            def fetch_yf_data():
                ticker = yf.Ticker(symbol)
                return ticker.history(period=period, interval=interval)
            
            df = await asyncio.get_event_loop().run_in_executor(None, fetch_yf_data)
            
            if df.empty:
                return None
            
            # Rename columns to match our format
            df.columns = [col.lower() for col in df.columns]
            df = df[['open', 'high', 'low', 'close', 'volume']].tail(limit)
            
            return df
            
        except Exception as e:
            logger.debug(f"Error fetching from yfinance for {token}: {e}")
            return None
    
    async def get_recent_price_data(self, token: str, hours: int = 24) -> Optional[pd.DataFrame]:
        """Get recent price data for the specified number of hours"""
        try:
            # Calculate required data points based on 1-hour intervals
            limit = min(hours, 168)  # Max 1 week
            
            data = await self.get_price_data(token, timeframe='1h', limit=limit)
            
            if data is not None:
                # Filter to exact hours if we have more data
                cutoff_time = datetime.now() - timedelta(hours=hours)
                data = data[data.index >= cutoff_time]
            
            return data
            
        except Exception as e:
            logger.error(f"Error getting recent price data for {token}: {e}")
            return None
    
    async def get_protocol_data(self, protocols: List[str]) -> Dict[str, ProtocolData]:
        """Get DeFi protocol data (TVL, APY, etc.)"""
        protocol_data = {}
        
        for protocol in protocols:
            try:
                data = await self._fetch_protocol_data(protocol)
                if data:
                    protocol_data[protocol] = data
            except Exception as e:
                logger.error(f"Error fetching protocol data for {protocol}: {e}")
        
        return protocol_data
    
    async def _fetch_protocol_data(self, protocol: str) -> Optional[ProtocolData]:
        """Fetch data for a specific DeFi protocol"""
        try:
            # Check cache first
            cache_key = f"protocol_data:{protocol}"
            cached_data = await self._get_from_cache(cache_key)
            
            if cached_data:
                return ProtocolData(**cached_data)
            
            # Fetch from DeFiLlama or other sources
            data = await self._fetch_from_defillama(protocol)
            
            if data:
                # Cache for 1 hour
                await self._set_cache(cache_key, data.__dict__, ttl=3600)
                return data
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching protocol data for {protocol}: {e}")
            return None
    
    async def _fetch_from_defillama(self, protocol: str) -> Optional[ProtocolData]:
        """Fetch protocol data from DeFiLlama"""
        try:
            # Get protocol TVL
            tvl_url = f"https://api.llama.fi/protocol/{protocol}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(tvl_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract latest TVL
                        tvl_data = data.get('tvl', [])
                        if not tvl_data:
                            return None
                        
                        latest_tvl = tvl_data[-1]['totalLiquidityUSD'] if tvl_data else 0
                        
                        # Get yields data
                        yields_data = await self._fetch_protocol_yields(protocol)
                        
                        return ProtocolData(
                            protocol=protocol,
                            tvl=latest_tvl,
                            apy=yields_data.get('apy', 0),
                            volume_24h=yields_data.get('volume_24h', 0),
                            timestamp=datetime.now(),
                            additional_metrics={
                                'chain_tvls': data.get('chainTvls', {}),
                                'token_breakdowns': data.get('tokensInUsd', []),
                                'methodology': data.get('methodology', '')
                            }
                        )
            
            return None
            
        except Exception as e:
            logger.debug(f"Error fetching from DeFiLlama for {protocol}: {e}")
            return None
    
    async def _fetch_protocol_yields(self, protocol: str) -> Dict[str, float]:
        """Fetch yield data for a protocol"""
        try:
            url = f"https://yields.llama.fi/pools"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        pools = data.get('data', [])
                        
                        # Find pools for this protocol
                        protocol_pools = [
                            pool for pool in pools 
                            if protocol.lower() in pool.get('project', '').lower()
                        ]
                        
                        if protocol_pools:
                            # Calculate average APY and total volume
                            total_apy = sum(pool.get('apy', 0) for pool in protocol_pools)
                            avg_apy = total_apy / len(protocol_pools)
                            
                            total_volume = sum(pool.get('volumeUsd7d', 0) for pool in protocol_pools)
                            volume_24h = total_volume / 7  # Approximate daily volume
                            
                            return {
                                'apy': avg_apy,
                                'volume_24h': volume_24h
                            }
            
            return {'apy': 0, 'volume_24h': 0}
            
        except Exception as e:
            logger.debug(f"Error fetching yields for {protocol}: {e}")
            return {'apy': 0, 'volume_24h': 0}
    
    async def get_market_data(self, tokens: List[str]) -> Dict[str, Dict]:
        """Get comprehensive market data for multiple tokens"""
        market_data = {}
        
        # Fetch data concurrently
        tasks = []
        for token in tokens:
            tasks.append(self._get_token_market_data(token))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for token, result in zip(tokens, results):
            if isinstance(result, Exception):
                logger.error(f"Error fetching market data for {token}: {result}")
                market_data[token] = {}
            else:
                market_data[token] = result or {}
        
        return market_data
    
    async def _get_token_market_data(self, token: str) -> Dict:
        """Get comprehensive market data for a single token"""
        try:
            # Get price data
            price_data = await self.get_recent_price_data(token, hours=24)
            
            # Get current price from multiple sources
            current_price_data = await self._get_current_price_data(token)
            
            # Calculate metrics
            metrics = {}
            if price_data is not None and len(price_data) > 0:
                latest = price_data.iloc[-1]
                first = price_data.iloc[0]
                
                metrics = {
                    'current_price': latest['close'],
                    'price_change_24h': ((latest['close'] - first['close']) / first['close']) * 100,
                    'volume_24h': price_data['volume'].sum(),
                    'high_24h': price_data['high'].max(),
                    'low_24h': price_data['low'].min(),
                    'volatility': price_data['close'].pct_change().std() * np.sqrt(24) * 100,
                    'data_points': len(price_data)
                }
            
            # Merge with current price data
            if current_price_data:
                metrics.update(current_price_data)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting market data for {token}: {e}")
            return {}
    
    async def _get_current_price_data(self, token: str) -> Dict:
        """Get current price data from multiple sources"""
        try:
            # Try multiple sources for current price
            sources = [
                self._get_price_from_coingecko,
                self._get_price_from_binance,
                self._get_price_from_coinmarketcap
            ]
            
            for source in sources:
                try:
                    data = await source(token)
                    if data:
                        return data
                except Exception as e:
                    logger.debug(f"Failed to get price from {source.__name__}: {e}")
                    continue
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting current price for {token}: {e}")
            return {}
    
    async def _get_price_from_coingecko(self, token: str) -> Optional[Dict]:
        """Get current price from CoinGecko"""
        try:
            token_map = {
                'ETH': 'ethereum',
                'BTC': 'bitcoin',
                'USDC': 'usd-coin',
                'USDT': 'tether',
                'DAI': 'dai'
            }
            
            coin_id = token_map.get(token, token.lower())
            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': coin_id,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_24hr_vol': 'true',
                'include_market_cap': 'true'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        coin_data = data.get(coin_id, {})
                        
                        return {
                            'current_price': coin_data.get('usd', 0),
                            'price_change_24h': coin_data.get('usd_24h_change', 0),
                            'volume_24h': coin_data.get('usd_24h_vol', 0),
                            'market_cap': coin_data.get('usd_market_cap', 0),
                            'source': 'coingecko'
                        }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error getting price from CoinGecko: {e}")
            return None
    
    async def _get_price_from_binance(self, token: str) -> Optional[Dict]:
        """Get current price from Binance"""
        try:
            symbol_map = {
                'ETH': 'ETHUSDT',
                'BTC': 'BTCUSDT',
                'USDC': 'USDCUSDT',
                'USDT': 'USDTUSDT'
            }
            
            symbol = symbol_map.get(token)
            if not symbol:
                return None
            
            url = f"https://api.binance.com/api/v3/ticker/24hr"
            params = {'symbol': symbol}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        return {
                            'current_price': float(data.get('lastPrice', 0)),
                            'price_change_24h': float(data.get('priceChangePercent', 0)),
                            'volume_24h': float(data.get('volume', 0)),
                            'high_24h': float(data.get('highPrice', 0)),
                            'low_24h': float(data.get('lowPrice', 0)),
                            'source': 'binance'
                        }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error getting price from Binance: {e}")
            return None
    
    async def _get_price_from_coinmarketcap(self, token: str) -> Optional[Dict]:
        """Get current price from CoinMarketCap"""
        try:
            if not settings.COINMARKETCAP_API_KEY:
                return None
            
            url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
            headers = {'X-CMC_PRO_API_KEY': settings.COINMARKETCAP_API_KEY}
            params = {'symbol': token, 'convert': 'USD'}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        token_data = data.get('data', {}).get(token, {})
                        quote = token_data.get('quote', {}).get('USD', {})
                        
                        return {
                            'current_price': quote.get('price', 0),
                            'price_change_24h': quote.get('percent_change_24h', 0),
                            'volume_24h': quote.get('volume_24h', 0),
                            'market_cap': quote.get('market_cap', 0),
                            'source': 'coinmarketcap'
                        }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error getting price from CoinMarketCap: {e}")
            return None
    
    async def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from Redis cache"""
        try:
            if self.redis_client:
                data = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.get, key
                )
                if data:
                    return json.loads(data)
        except Exception as e:
            logger.debug(f"Error getting from cache: {e}")
        
        return None
    
    async def _set_cache(self, key: str, data: Any, ttl: int = 300):
        """Set data in Redis cache"""
        try:
            if self.redis_client:
                await asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: self.redis_client.setex(key, ttl, json.dumps(data, default=str))
                )
        except Exception as e:
            logger.debug(f"Error setting cache: {e}")
    
    async def cleanup(self):
        """Cleanup connections"""
        try:
            # Close exchange connections
            for exchange in self.exchanges.values():
                await exchange.close()
            
            # Close Redis connection
            if self.redis_client:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.close
                )
            
            logger.info("Data service cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def get_supported_tokens(self) -> List[str]:
        """Get list of supported tokens"""
        return settings.SUPPORTED_TOKENS
    
    def get_supported_protocols(self) -> List[str]:
        """Get list of supported DeFi protocols"""
        return settings.SUPPORTED_PROTOCOLS