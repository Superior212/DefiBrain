import asyncio
import aiohttp
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import logging
import json
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import ccxt.async_support as ccxt
import yfinance as yf
from web3 import Web3
from web3.middleware import geth_poa_middleware
import time
from pathlib import Path

from config import settings, DATA_COLLECTION_INTERVALS
from utils.technical_indicators import TechnicalIndicators

logger = logging.getLogger(__name__)

@dataclass
class MarketDataPoint:
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    source: str
    market_cap: Optional[float] = None
    circulating_supply: Optional[float] = None

@dataclass
class ProtocolDataPoint:
    timestamp: datetime
    protocol: str
    tvl: float
    apy: float
    volume_24h: float
    users_count: Optional[int] = None
    transactions_count: Optional[int] = None
    source: str

@dataclass
class NewsDataPoint:
    timestamp: datetime
    title: str
    content: str
    source: str
    sentiment_score: Optional[float] = None
    relevance_score: Optional[float] = None
    symbols: List[str] = None

@dataclass
class SocialDataPoint:
    timestamp: datetime
    platform: str
    symbol: str
    mentions_count: int
    sentiment_score: float
    engagement_score: float
    source: str

class DataPipeline:
    """Service for collecting and preprocessing market data from multiple sources"""
    
    def __init__(self):
        self.redis_client = None
        self.db_engine = None
        self.db_session = None
        self.exchanges = {}
        self.web3_clients = {}
        self.technical_indicators = TechnicalIndicators()
        self.session = None
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Data collection status
        self.collection_status = {
            'price_data': {'last_update': None, 'status': 'idle'},
            'protocol_data': {'last_update': None, 'status': 'idle'},
            'news_data': {'last_update': None, 'status': 'idle'},
            'social_data': {'last_update': None, 'status': 'idle'}
        }
        
        # Data storage
        self.data_cache = {
            'price_data': {},
            'protocol_data': {},
            'news_data': [],
            'social_data': []
        }
    
    async def initialize(self):
        """Initialize the data pipeline"""
        try:
            # Initialize Redis
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                await self.redis_client.ping()
                logger.info("Redis connection established")
            
            # Initialize database
            if settings.DATABASE_URL:
                self.db_engine = create_async_engine(settings.DATABASE_URL)
                self.db_session = sessionmaker(
                    self.db_engine, class_=AsyncSession, expire_on_commit=False
                )
                logger.info("Database connection established")
            
            # Initialize HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                headers={'User-Agent': 'DefiBrain-AI/1.0'}
            )
            
            # Initialize exchanges
            await self._initialize_exchanges()
            
            # Initialize Web3 clients
            self._initialize_web3_clients()
            
            # Create database tables if needed
            await self._create_tables()
            
            logger.info("Data pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize data pipeline: {e}")
            raise
    
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
            # self.exchanges['coinbase'] = ccxt.coinbasepro({...})
            # self.exchanges['kraken'] = ccxt.kraken({...})
            
            logger.info("Exchanges initialized")
            
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
                    w3 = Web3(Web3.HTTPProvider(rpc_url))
                    
                    # Add PoA middleware for some networks
                    if network in ['polygon', 'mantle']:
                        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                    
                    self.web3_clients[network] = w3
                    logger.info(f"Web3 client initialized for {network}")
            
        except Exception as e:
            logger.error(f"Error initializing Web3 clients: {e}")
    
    async def _create_tables(self):
        """Create database tables for storing data"""
        if not self.db_engine:
            return
        
        try:
            async with self.db_engine.begin() as conn:
                # Create price data table
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS price_data (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        symbol VARCHAR(20) NOT NULL,
                        open_price DECIMAL(20, 8),
                        high_price DECIMAL(20, 8),
                        low_price DECIMAL(20, 8),
                        close_price DECIMAL(20, 8),
                        volume DECIMAL(30, 8),
                        market_cap DECIMAL(30, 2),
                        source VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(timestamp, symbol, source)
                    )
                """))
                
                # Create protocol data table
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS protocol_data (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        protocol VARCHAR(100) NOT NULL,
                        tvl DECIMAL(30, 2),
                        apy DECIMAL(10, 4),
                        volume_24h DECIMAL(30, 2),
                        users_count INTEGER,
                        transactions_count INTEGER,
                        source VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(timestamp, protocol, source)
                    )
                """))
                
                # Create news data table
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS news_data (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT,
                        source VARCHAR(100),
                        sentiment_score DECIMAL(5, 4),
                        relevance_score DECIMAL(5, 4),
                        symbols TEXT[],
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                
                # Create social data table
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS social_data (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP NOT NULL,
                        platform VARCHAR(50) NOT NULL,
                        symbol VARCHAR(20) NOT NULL,
                        mentions_count INTEGER,
                        sentiment_score DECIMAL(5, 4),
                        engagement_score DECIMAL(10, 2),
                        source VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(timestamp, platform, symbol, source)
                    )
                """))
                
                logger.info("Database tables created successfully")
                
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
    
    async def start_data_collection(self):
        """Start continuous data collection"""
        try:
            logger.info("Starting data collection pipeline")
            
            # Start collection tasks
            tasks = [
                asyncio.create_task(self._collect_price_data_continuously()),
                asyncio.create_task(self._collect_protocol_data_continuously()),
                asyncio.create_task(self._collect_news_data_continuously()),
                asyncio.create_task(self._collect_social_data_continuously())
            ]
            
            # Wait for all tasks
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"Error in data collection: {e}")
    
    async def _collect_price_data_continuously(self):
        """Continuously collect price data"""
        while True:
            try:
                self.collection_status['price_data']['status'] = 'running'
                
                # Collect data for all supported tokens
                for token in settings.SUPPORTED_TOKENS:
                    try:
                        data_point = await self._fetch_price_data(token)
                        if data_point:
                            await self._store_price_data(data_point)
                            self.data_cache['price_data'][token] = data_point
                    
                    except Exception as e:
                        logger.error(f"Error collecting price data for {token}: {e}")
                
                self.collection_status['price_data']['last_update'] = datetime.now()
                self.collection_status['price_data']['status'] = 'idle'
                
                # Wait for next collection
                await asyncio.sleep(DATA_COLLECTION_INTERVALS['price_data'])
                
            except Exception as e:
                logger.error(f"Error in price data collection loop: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _fetch_price_data(self, token: str) -> Optional[MarketDataPoint]:
        """Fetch price data for a token from multiple sources"""
        try:
            # Try CoinGecko first
            coingecko_data = await self._fetch_from_coingecko(token)
            if coingecko_data:
                return coingecko_data
            
            # Try Binance
            binance_data = await self._fetch_from_binance(token)
            if binance_data:
                return binance_data
            
            # Try Yahoo Finance for traditional assets
            yahoo_data = await self._fetch_from_yahoo(token)
            if yahoo_data:
                return yahoo_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching price data for {token}: {e}")
            return None
    
    async def _fetch_from_coingecko(self, token: str) -> Optional[MarketDataPoint]:
        """Fetch data from CoinGecko API"""
        try:
            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': token.lower(),
                'vs_currencies': 'usd',
                'include_market_cap': 'true',
                'include_24hr_vol': 'true',
                'include_24hr_change': 'true'
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if token.lower() in data:
                        token_data = data[token.lower()]
                        
                        return MarketDataPoint(
                            timestamp=datetime.now(),
                            symbol=token,
                            open=token_data['usd'],  # CoinGecko doesn't provide OHLC in simple API
                            high=token_data['usd'],
                            low=token_data['usd'],
                            close=token_data['usd'],
                            volume=token_data.get('usd_24h_vol', 0),
                            market_cap=token_data.get('usd_market_cap'),
                            source='coingecko'
                        )
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from CoinGecko for {token}: {e}")
            return None
    
    async def _fetch_from_binance(self, token: str) -> Optional[MarketDataPoint]:
        """Fetch data from Binance API"""
        try:
            if 'binance' not in self.exchanges:
                return None
            
            exchange = self.exchanges['binance']
            symbol = f"{token}/USDT"
            
            # Get ticker data
            ticker = await exchange.fetch_ticker(symbol)
            
            if ticker:
                return MarketDataPoint(
                    timestamp=datetime.now(),
                    symbol=token,
                    open=ticker['open'],
                    high=ticker['high'],
                    low=ticker['low'],
                    close=ticker['close'],
                    volume=ticker['baseVolume'],
                    source='binance'
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from Binance for {token}: {e}")
            return None
    
    async def _fetch_from_yahoo(self, token: str) -> Optional[MarketDataPoint]:
        """Fetch data from Yahoo Finance (for traditional assets)"""
        try:
            # This would be for traditional assets like stocks
            # For crypto, we primarily use CoinGecko and Binance
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from Yahoo for {token}: {e}")
            return None
    
    async def _collect_protocol_data_continuously(self):
        """Continuously collect DeFi protocol data"""
        while True:
            try:
                self.collection_status['protocol_data']['status'] = 'running'
                
                # Collect data for all supported protocols
                for protocol in settings.SUPPORTED_PROTOCOLS:
                    try:
                        data_point = await self._fetch_protocol_data(protocol)
                        if data_point:
                            await self._store_protocol_data(data_point)
                            self.data_cache['protocol_data'][protocol] = data_point
                    
                    except Exception as e:
                        logger.error(f"Error collecting protocol data for {protocol}: {e}")
                
                self.collection_status['protocol_data']['last_update'] = datetime.now()
                self.collection_status['protocol_data']['status'] = 'idle'
                
                # Wait for next collection
                await asyncio.sleep(DATA_COLLECTION_INTERVALS['protocol_data'])
                
            except Exception as e:
                logger.error(f"Error in protocol data collection loop: {e}")
                await asyncio.sleep(300)  # Wait before retrying
    
    async def _fetch_protocol_data(self, protocol: str) -> Optional[ProtocolDataPoint]:
        """Fetch protocol data from DeFiLlama and other sources"""
        try:
            # Fetch from DeFiLlama
            url = f"https://api.llama.fi/protocol/{protocol}"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Get latest TVL data
                    if 'tvl' in data and data['tvl']:
                        latest_tvl = data['tvl'][-1]
                        
                        return ProtocolDataPoint(
                            timestamp=datetime.fromtimestamp(latest_tvl['date']),
                            protocol=protocol,
                            tvl=latest_tvl['totalLiquidityUSD'],
                            apy=0,  # Would need additional API calls for APY
                            volume_24h=0,  # Would need additional data
                            source='defillama'
                        )
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching protocol data for {protocol}: {e}")
            return None
    
    async def _collect_news_data_continuously(self):
        """Continuously collect news data"""
        while True:
            try:
                self.collection_status['news_data']['status'] = 'running'
                
                # Collect news from multiple sources
                news_items = await self._fetch_news_data()
                
                for news_item in news_items:
                    await self._store_news_data(news_item)
                    self.data_cache['news_data'].append(news_item)
                
                # Keep only recent news in cache
                cutoff_time = datetime.now() - timedelta(hours=24)
                self.data_cache['news_data'] = [
                    item for item in self.data_cache['news_data']
                    if item.timestamp > cutoff_time
                ]
                
                self.collection_status['news_data']['last_update'] = datetime.now()
                self.collection_status['news_data']['status'] = 'idle'
                
                # Wait for next collection
                await asyncio.sleep(DATA_COLLECTION_INTERVALS['news_data'])
                
            except Exception as e:
                logger.error(f"Error in news data collection loop: {e}")
                await asyncio.sleep(600)  # Wait before retrying
    
    async def _fetch_news_data(self) -> List[NewsDataPoint]:
        """Fetch news data from multiple sources"""
        news_items = []
        
        try:
            # Fetch from NewsAPI
            if settings.NEWS_API_KEY:
                newsapi_items = await self._fetch_from_newsapi()
                news_items.extend(newsapi_items)
            
            # Fetch from CryptoPanic
            cryptopanic_items = await self._fetch_from_cryptopanic()
            news_items.extend(cryptopanic_items)
            
            return news_items
            
        except Exception as e:
            logger.error(f"Error fetching news data: {e}")
            return []
    
    async def _fetch_from_newsapi(self) -> List[NewsDataPoint]:
        """Fetch news from NewsAPI"""
        try:
            url = "https://newsapi.org/v2/everything"
            params = {
                'q': 'cryptocurrency OR bitcoin OR ethereum OR DeFi',
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': 20,
                'apiKey': settings.NEWS_API_KEY
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    news_items = []
                    for article in data.get('articles', []):
                        news_items.append(NewsDataPoint(
                            timestamp=datetime.fromisoformat(article['publishedAt'].replace('Z', '+00:00')),
                            title=article['title'],
                            content=article.get('description', ''),
                            source=article['source']['name'],
                            symbols=[]  # Would need NLP to extract symbols
                        ))
                    
                    return news_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching from NewsAPI: {e}")
            return []
    
    async def _fetch_from_cryptopanic(self) -> List[NewsDataPoint]:
        """Fetch news from CryptoPanic"""
        try:
            url = "https://cryptopanic.com/api/v1/posts/"
            params = {
                'auth_token': settings.CRYPTOPANIC_API_KEY,
                'kind': 'news',
                'filter': 'hot'
            }
            
            if settings.CRYPTOPANIC_API_KEY:
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        news_items = []
                        for post in data.get('results', []):
                            news_items.append(NewsDataPoint(
                                timestamp=datetime.fromisoformat(post['published_at'].replace('Z', '+00:00')),
                                title=post['title'],
                                content=post.get('title', ''),  # CryptoPanic doesn't provide full content
                                source='cryptopanic',
                                symbols=[coin['code'] for coin in post.get('currencies', [])]
                            ))
                        
                        return news_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching from CryptoPanic: {e}")
            return []
    
    async def _collect_social_data_continuously(self):
        """Continuously collect social media data"""
        while True:
            try:
                self.collection_status['social_data']['status'] = 'running'
                
                # Collect social data for all supported tokens
                for token in settings.SUPPORTED_TOKENS:
                    try:
                        social_items = await self._fetch_social_data(token)
                        
                        for social_item in social_items:
                            await self._store_social_data(social_item)
                            self.data_cache['social_data'].append(social_item)
                    
                    except Exception as e:
                        logger.error(f"Error collecting social data for {token}: {e}")
                
                # Keep only recent social data in cache
                cutoff_time = datetime.now() - timedelta(hours=24)
                self.data_cache['social_data'] = [
                    item for item in self.data_cache['social_data']
                    if item.timestamp > cutoff_time
                ]
                
                self.collection_status['social_data']['last_update'] = datetime.now()
                self.collection_status['social_data']['status'] = 'idle'
                
                # Wait for next collection
                await asyncio.sleep(DATA_COLLECTION_INTERVALS['social_data'])
                
            except Exception as e:
                logger.error(f"Error in social data collection loop: {e}")
                await asyncio.sleep(900)  # Wait before retrying
    
    async def _fetch_social_data(self, token: str) -> List[SocialDataPoint]:
        """Fetch social media data for a token"""
        try:
            # For now, return simulated data
            # In production, you would integrate with Twitter API, Reddit API, etc.
            
            social_items = []
            
            # Simulated Twitter data
            social_items.append(SocialDataPoint(
                timestamp=datetime.now(),
                platform='twitter',
                symbol=token,
                mentions_count=np.random.randint(10, 1000),
                sentiment_score=np.random.uniform(-1, 1),
                engagement_score=np.random.uniform(0, 100),
                source='simulated'
            ))
            
            # Simulated Reddit data
            social_items.append(SocialDataPoint(
                timestamp=datetime.now(),
                platform='reddit',
                symbol=token,
                mentions_count=np.random.randint(5, 500),
                sentiment_score=np.random.uniform(-1, 1),
                engagement_score=np.random.uniform(0, 100),
                source='simulated'
            ))
            
            return social_items
            
        except Exception as e:
            logger.error(f"Error fetching social data for {token}: {e}")
            return []
    
    async def _store_price_data(self, data_point: MarketDataPoint):
        """Store price data in database and cache"""
        try:
            # Store in Redis cache
            if self.redis_client:
                cache_key = f"price:{data_point.symbol}:{data_point.source}"
                await self.redis_client.setex(
                    cache_key,
                    settings.CACHE_TTL,
                    json.dumps(asdict(data_point), default=str)
                )
            
            # Store in database
            if self.db_session:
                async with self.db_session() as session:
                    await session.execute(text("""
                        INSERT INTO price_data 
                        (timestamp, symbol, open_price, high_price, low_price, close_price, volume, market_cap, source)
                        VALUES (:timestamp, :symbol, :open, :high, :low, :close, :volume, :market_cap, :source)
                        ON CONFLICT (timestamp, symbol, source) DO NOTHING
                    """), {
                        'timestamp': data_point.timestamp,
                        'symbol': data_point.symbol,
                        'open': data_point.open,
                        'high': data_point.high,
                        'low': data_point.low,
                        'close': data_point.close,
                        'volume': data_point.volume,
                        'market_cap': data_point.market_cap,
                        'source': data_point.source
                    })
                    await session.commit()
            
        except Exception as e:
            logger.error(f"Error storing price data: {e}")
    
    async def _store_protocol_data(self, data_point: ProtocolDataPoint):
        """Store protocol data in database and cache"""
        try:
            # Store in Redis cache
            if self.redis_client:
                cache_key = f"protocol:{data_point.protocol}:{data_point.source}"
                await self.redis_client.setex(
                    cache_key,
                    settings.CACHE_TTL,
                    json.dumps(asdict(data_point), default=str)
                )
            
            # Store in database
            if self.db_session:
                async with self.db_session() as session:
                    await session.execute(text("""
                        INSERT INTO protocol_data 
                        (timestamp, protocol, tvl, apy, volume_24h, users_count, transactions_count, source)
                        VALUES (:timestamp, :protocol, :tvl, :apy, :volume_24h, :users_count, :transactions_count, :source)
                        ON CONFLICT (timestamp, protocol, source) DO NOTHING
                    """), {
                        'timestamp': data_point.timestamp,
                        'protocol': data_point.protocol,
                        'tvl': data_point.tvl,
                        'apy': data_point.apy,
                        'volume_24h': data_point.volume_24h,
                        'users_count': data_point.users_count,
                        'transactions_count': data_point.transactions_count,
                        'source': data_point.source
                    })
                    await session.commit()
            
        except Exception as e:
            logger.error(f"Error storing protocol data: {e}")
    
    async def _store_news_data(self, data_point: NewsDataPoint):
        """Store news data in database"""
        try:
            if self.db_session:
                async with self.db_session() as session:
                    await session.execute(text("""
                        INSERT INTO news_data 
                        (timestamp, title, content, source, sentiment_score, relevance_score, symbols)
                        VALUES (:timestamp, :title, :content, :source, :sentiment_score, :relevance_score, :symbols)
                    """), {
                        'timestamp': data_point.timestamp,
                        'title': data_point.title,
                        'content': data_point.content,
                        'source': data_point.source,
                        'sentiment_score': data_point.sentiment_score,
                        'relevance_score': data_point.relevance_score,
                        'symbols': data_point.symbols or []
                    })
                    await session.commit()
            
        except Exception as e:
            logger.error(f"Error storing news data: {e}")
    
    async def _store_social_data(self, data_point: SocialDataPoint):
        """Store social data in database and cache"""
        try:
            # Store in Redis cache
            if self.redis_client:
                cache_key = f"social:{data_point.platform}:{data_point.symbol}:{data_point.source}"
                await self.redis_client.setex(
                    cache_key,
                    settings.CACHE_TTL,
                    json.dumps(asdict(data_point), default=str)
                )
            
            # Store in database
            if self.db_session:
                async with self.db_session() as session:
                    await session.execute(text("""
                        INSERT INTO social_data 
                        (timestamp, platform, symbol, mentions_count, sentiment_score, engagement_score, source)
                        VALUES (:timestamp, :platform, :symbol, :mentions_count, :sentiment_score, :engagement_score, :source)
                        ON CONFLICT (timestamp, platform, symbol, source) DO NOTHING
                    """), {
                        'timestamp': data_point.timestamp,
                        'platform': data_point.platform,
                        'symbol': data_point.symbol,
                        'mentions_count': data_point.mentions_count,
                        'sentiment_score': data_point.sentiment_score,
                        'engagement_score': data_point.engagement_score,
                        'source': data_point.source
                    })
                    await session.commit()
            
        except Exception as e:
            logger.error(f"Error storing social data: {e}")
    
    async def get_historical_data(
        self,
        data_type: str,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        source: Optional[str] = None
    ) -> pd.DataFrame:
        """Get historical data from database"""
        try:
            if not self.db_session:
                return pd.DataFrame()
            
            table_map = {
                'price': 'price_data',
                'protocol': 'protocol_data',
                'news': 'news_data',
                'social': 'social_data'
            }
            
            if data_type not in table_map:
                raise ValueError(f"Unsupported data type: {data_type}")
            
            table_name = table_map[data_type]
            
            # Build query
            query = f"""
                SELECT * FROM {table_name}
                WHERE timestamp >= :start_date AND timestamp <= :end_date
            """
            
            params = {
                'start_date': start_date,
                'end_date': end_date
            }
            
            if data_type in ['price', 'social']:
                query += " AND symbol = :symbol"
                params['symbol'] = symbol
            elif data_type == 'protocol':
                query += " AND protocol = :symbol"
                params['symbol'] = symbol
            
            if source:
                query += " AND source = :source"
                params['source'] = source
            
            query += " ORDER BY timestamp ASC"
            
            async with self.db_session() as session:
                result = await session.execute(text(query), params)
                rows = result.fetchall()
                
                if rows:
                    columns = result.keys()
                    return pd.DataFrame(rows, columns=columns)
                
                return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            return pd.DataFrame()
    
    async def get_processed_features(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        include_technical: bool = True,
        include_sentiment: bool = True
    ) -> pd.DataFrame:
        """Get processed features for ML models"""
        try:
            # Get price data
            price_data = await self.get_historical_data('price', symbol, start_date, end_date)
            
            if price_data.empty:
                return pd.DataFrame()
            
            # Add technical indicators
            if include_technical:
                price_data = self.technical_indicators.add_all_indicators(price_data)
            
            # Add sentiment data
            if include_sentiment:
                sentiment_data = await self._get_aggregated_sentiment(symbol, start_date, end_date)
                if not sentiment_data.empty:
                    price_data = price_data.merge(
                        sentiment_data,
                        left_on='timestamp',
                        right_on='timestamp',
                        how='left'
                    )
            
            # Fill missing values
            price_data = price_data.fillna(method='ffill').fillna(method='bfill')
            
            return price_data
            
        except Exception as e:
            logger.error(f"Error getting processed features: {e}")
            return pd.DataFrame()
    
    async def _get_aggregated_sentiment(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """Get aggregated sentiment data"""
        try:
            # Get news sentiment
            news_data = await self.get_historical_data('news', symbol, start_date, end_date)
            
            # Get social sentiment
            social_data = await self.get_historical_data('social', symbol, start_date, end_date)
            
            sentiment_records = []
            
            # Process news sentiment
            if not news_data.empty:
                for _, row in news_data.iterrows():
                    if row['sentiment_score'] is not None:
                        sentiment_records.append({
                            'timestamp': row['timestamp'],
                            'news_sentiment': row['sentiment_score'],
                            'news_relevance': row.get('relevance_score', 0.5)
                        })
            
            # Process social sentiment
            if not social_data.empty:
                social_agg = social_data.groupby('timestamp').agg({
                    'sentiment_score': 'mean',
                    'mentions_count': 'sum',
                    'engagement_score': 'mean'
                }).reset_index()
                
                for _, row in social_agg.iterrows():
                    sentiment_records.append({
                        'timestamp': row['timestamp'],
                        'social_sentiment': row['sentiment_score'],
                        'social_mentions': row['mentions_count'],
                        'social_engagement': row['engagement_score']
                    })
            
            if sentiment_records:
                return pd.DataFrame(sentiment_records)
            
            return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"Error getting aggregated sentiment: {e}")
            return pd.DataFrame()
    
    async def get_pipeline_status(self) -> Dict[str, Any]:
        """Get data pipeline status"""
        return {
            'collection_status': self.collection_status,
            'cache_size': {
                'price_data': len(self.data_cache['price_data']),
                'protocol_data': len(self.data_cache['protocol_data']),
                'news_data': len(self.data_cache['news_data']),
                'social_data': len(self.data_cache['social_data'])
            },
            'last_updated': datetime.now().isoformat()
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.session:
                await self.session.close()
            
            if self.redis_client:
                await self.redis_client.close()
            
            if self.db_engine:
                await self.db_engine.dispose()
            
            for exchange in self.exchanges.values():
                await exchange.close()
            
            self.executor.shutdown(wait=True)
            
            logger.info("Data pipeline cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")