import os
from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/defibrain_ai"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # External API Keys
    COINGECKO_API_KEY: str = "CG-zqWbUJB7Fo8qkshipDFtxTkq"
    COINMARKETCAP_API_KEY: str = "043b48c9-6188-4133-a4ad-c02e8c241acb"
    TWELVEDATA_API_KEY: str = "dd051cd1d7084f97943731801b6e5b02"
    ALPHA_VANTAGE_API_KEY: str = "TM4JAD2B7EHIFFKJ"
    NEWSAPI_KEY: str = "4cd2c941-ed71-4fa9-ae44-ee8bd1bc39db"
    
    # Web3 Configuration
    ETHEREUM_RPC_URL: str = "https://eth-mainnet.alchemyapi.io/v2/your-api-key"
    POLYGON_RPC_URL: str = "https://polygon-mainnet.alchemyapi.io/v2/your-api-key"
    ARBITRUM_RPC_URL: str = "https://arb-mainnet.alchemyapi.io/v2/your-api-key"
    MANTLE_RPC_URL: str = "https://rpc.mantle.xyz"
    
    # AI Model Configuration
    MODEL_UPDATE_INTERVAL: int = 3600  # seconds
    PREDICTION_CACHE_TTL: int = 300  # seconds
    MAX_PREDICTION_HORIZON: int = 168  # hours (1 week)
    
    # Data Sources
    SUPPORTED_TOKENS: List[str] = [
        "ETH", "BTC", "USDC", "USDT", "DAI", "WETH", "MATIC", "ARB", "OP"
    ]
    
    SUPPORTED_PROTOCOLS: List[str] = [
        "aave", "compound", "uniswap", "curve", "convex", "yearn", "lido", "rocket-pool"
    ]
    
    # ML Model Paths
    PRICE_PREDICTION_MODEL_PATH: str = "./models/price_predictor.pkl"
    YIELD_OPTIMIZATION_MODEL_PATH: str = "./models/yield_optimizer.pkl"
    SENTIMENT_MODEL_PATH: str = "./models/sentiment_analyzer.pkl"
    
    # Feature Engineering
    TECHNICAL_INDICATORS: List[str] = [
        "sma_20", "sma_50", "ema_12", "ema_26", "rsi", "macd", "bollinger_bands",
        "volume_sma", "price_change_24h", "volatility_7d"
    ]
    
    # Risk Management
    MAX_POSITION_SIZE: float = 0.3  # 30% max allocation per protocol
    MIN_DIVERSIFICATION: int = 3  # minimum number of protocols
    RISK_FREE_RATE: float = 0.02  # 2% annual risk-free rate
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Model hyperparameters
MODEL_CONFIG = {
    "price_predictor": {
        "lstm_units": [64, 32, 16],
        "dropout_rate": 0.2,
        "learning_rate": 0.001,
        "batch_size": 32,
        "epochs": 100,
        "sequence_length": 60,
        "features": [
            "open", "high", "low", "close", "volume",
            "sma_20", "ema_12", "rsi", "macd", "volatility"
        ]
    },
    "yield_optimizer": {
        "hidden_layers": [128, 64, 32],
        "activation": "relu",
        "dropout_rate": 0.3,
        "learning_rate": 0.0001,
        "batch_size": 64,
        "epochs": 200,
        "features": [
            "apy", "tvl", "volume_24h", "risk_score", "protocol_age",
            "audit_score", "token_price_volatility", "liquidity_depth"
        ]
    },
    "sentiment_analyzer": {
        "model_name": "distilbert-base-uncased",
        "max_length": 512,
        "batch_size": 16,
        "learning_rate": 2e-5,
        "epochs": 3
    }
}

# Data collection intervals
DATA_COLLECTION_INTERVALS = {
    "price_data": 60,  # 1 minute
    "protocol_data": 300,  # 5 minutes
    "news_sentiment": 900,  # 15 minutes
    "social_sentiment": 300,  # 5 minutes
    "on_chain_metrics": 600,  # 10 minutes
}