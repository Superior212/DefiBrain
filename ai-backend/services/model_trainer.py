import asyncio
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import logging
import pickle
import json
import os
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, GRU, Conv1D, MaxPooling1D, Flatten
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from dataclasses import dataclass

from config import settings, MODEL_CONFIG
from services.data_service import DataService
from utils.technical_indicators import TechnicalIndicators

logger = logging.getLogger(__name__)

@dataclass
class TrainingResult:
    model_name: str
    model_type: str
    training_score: float
    validation_score: float
    test_score: float
    training_time: float
    model_path: str
    feature_importance: Dict[str, float]
    hyperparameters: Dict[str, Any]
    training_history: Dict[str, List[float]]

@dataclass
class BacktestResult:
    strategy_name: str
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    avg_trade_return: float
    volatility: float
    calmar_ratio: float
    sortino_ratio: float
    trade_history: List[Dict]

class ModelTrainer:
    """Service for training and managing ML models"""
    
    def __init__(self):
        self.data_service = DataService()
        self.technical_indicators = TechnicalIndicators()
        self.models = {}
        self.scalers = {}
        self.feature_columns = {}
        self.model_metadata = {}
        
        # Create model directories
        self.model_dir = Path(settings.MODEL_PATHS['base_dir'])
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        for model_type in ['price_prediction', 'yield_optimization', 'sentiment_analysis']:
            (self.model_dir / model_type).mkdir(parents=True, exist_ok=True)
    
    async def initialize(self):
        """Initialize the model trainer"""
        try:
            await self.data_service.initialize()
            await self._load_existing_models()
            logger.info("Model trainer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize model trainer: {e}")
            raise
    
    async def _load_existing_models(self):
        """Load existing trained models"""
        try:
            for model_type in ['price_prediction', 'yield_optimization', 'sentiment_analysis']:
                model_path = self.model_dir / model_type
                
                for token_dir in model_path.iterdir():
                    if token_dir.is_dir():
                        token = token_dir.name
                        model_file = token_dir / 'model.h5'
                        metadata_file = token_dir / 'metadata.json'
                        scaler_file = token_dir / 'scaler.pkl'
                        
                        if model_file.exists() and metadata_file.exists():
                            try:
                                # Load model
                                if model_type == 'price_prediction':
                                    model = load_model(str(model_file))
                                else:
                                    model = joblib.load(str(model_file))
                                
                                # Load metadata
                                with open(metadata_file, 'r') as f:
                                    metadata = json.load(f)
                                
                                # Load scaler
                                if scaler_file.exists():
                                    scaler = joblib.load(str(scaler_file))
                                    self.scalers[f"{model_type}_{token}"] = scaler
                                
                                self.models[f"{model_type}_{token}"] = model
                                self.model_metadata[f"{model_type}_{token}"] = metadata
                                
                                logger.info(f"Loaded {model_type} model for {token}")
                                
                            except Exception as e:
                                logger.warning(f"Failed to load {model_type} model for {token}: {e}")
            
        except Exception as e:
            logger.error(f"Error loading existing models: {e}")
    
    async def train_price_prediction_model(
        self,
        token: str,
        model_type: str = 'lstm',
        retrain: bool = False
    ) -> TrainingResult:
        """Train price prediction model for a token"""
        try:
            model_key = f"price_prediction_{token}"
            
            # Check if model exists and retrain is False
            if not retrain and model_key in self.models:
                logger.info(f"Price prediction model for {token} already exists")
                return self._get_existing_training_result(model_key)
            
            logger.info(f"Training price prediction model for {token} using {model_type}")
            
            # Collect training data
            training_data = await self._collect_price_training_data(token)
            
            if training_data is None or len(training_data) < 100:
                raise ValueError(f"Insufficient training data for {token}")
            
            # Prepare features
            X, y, feature_columns = self._prepare_price_features(training_data)
            
            if len(X) < 50:
                raise ValueError(f"Insufficient processed data for {token}")
            
            # Split data
            train_size = int(len(X) * 0.8)
            val_size = int(len(X) * 0.1)
            
            X_train = X[:train_size]
            y_train = y[:train_size]
            X_val = X[train_size:train_size + val_size]
            y_val = y[train_size:train_size + val_size]
            X_test = X[train_size + val_size:]
            y_test = y[train_size + val_size:]
            
            # Scale features
            scaler = MinMaxScaler()
            X_train_scaled = scaler.fit_transform(X_train.reshape(-1, X_train.shape[-1])).reshape(X_train.shape)
            X_val_scaled = scaler.transform(X_val.reshape(-1, X_val.shape[-1])).reshape(X_val.shape)
            X_test_scaled = scaler.transform(X_test.reshape(-1, X_test.shape[-1])).reshape(X_test.shape)
            
            # Train model
            start_time = datetime.now()
            
            if model_type == 'lstm':
                model, history = self._train_lstm_model(X_train_scaled, y_train, X_val_scaled, y_val)
            elif model_type == 'gru':
                model, history = self._train_gru_model(X_train_scaled, y_train, X_val_scaled, y_val)
            elif model_type == 'cnn_lstm':
                model, history = self._train_cnn_lstm_model(X_train_scaled, y_train, X_val_scaled, y_val)
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Evaluate model
            train_pred = model.predict(X_train_scaled)
            val_pred = model.predict(X_val_scaled)
            test_pred = model.predict(X_test_scaled)
            
            train_score = r2_score(y_train, train_pred)
            val_score = r2_score(y_val, val_pred)
            test_score = r2_score(y_test, test_pred)
            
            # Save model
            model_path = await self._save_price_model(token, model, scaler, feature_columns, {
                'model_type': model_type,
                'train_score': train_score,
                'val_score': val_score,
                'test_score': test_score,
                'training_time': training_time,
                'feature_count': len(feature_columns),
                'training_samples': len(X_train),
                'created_at': datetime.now().isoformat()
            })
            
            # Store in memory
            self.models[model_key] = model
            self.scalers[model_key] = scaler
            self.feature_columns[model_key] = feature_columns
            
            return TrainingResult(
                model_name=f"{token}_price_prediction",
                model_type=model_type,
                training_score=train_score,
                validation_score=val_score,
                test_score=test_score,
                training_time=training_time,
                model_path=model_path,
                feature_importance={},  # Not applicable for neural networks
                hyperparameters=MODEL_CONFIG['price_prediction'],
                training_history=history.history if hasattr(history, 'history') else {}
            )
            
        except Exception as e:
            logger.error(f"Error training price prediction model for {token}: {e}")
            raise
    
    async def _collect_price_training_data(self, token: str) -> Optional[pd.DataFrame]:
        """Collect historical price data for training"""
        try:
            # Get 1 year of hourly data
            data = await self.data_service.get_price_data(
                token=token,
                timeframe='1h',
                limit=8760  # 1 year of hourly data
            )
            
            if data is None or len(data) < 100:
                # Try daily data if hourly is not available
                data = await self.data_service.get_price_data(
                    token=token,
                    timeframe='1d',
                    limit=365  # 1 year of daily data
                )
            
            return data
            
        except Exception as e:
            logger.error(f"Error collecting training data for {token}: {e}")
            return None
    
    def _prepare_price_features(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Prepare features for price prediction"""
        try:
            # Add technical indicators
            data_with_indicators = self.technical_indicators.add_all_indicators(data)
            
            # Select features
            feature_columns = [
                'open', 'high', 'low', 'close', 'volume',
                'sma_5', 'sma_10', 'sma_20', 'sma_50',
                'ema_5', 'ema_10', 'ema_20',
                'rsi', 'macd', 'macd_signal', 'macd_histogram',
                'bb_upper', 'bb_lower', 'bb_width',
                'atr', 'volatility',
                'stoch_k', 'stoch_d',
                'williams_r', 'cci'
            ]
            
            # Filter available columns
            available_columns = [col for col in feature_columns if col in data_with_indicators.columns]
            
            # Fill missing values
            feature_data = data_with_indicators[available_columns].fillna(method='ffill').fillna(method='bfill')
            
            # Create sequences for LSTM
            sequence_length = MODEL_CONFIG['price_prediction']['sequence_length']
            
            X, y = [], []
            for i in range(sequence_length, len(feature_data)):
                X.append(feature_data.iloc[i-sequence_length:i].values)
                y.append(feature_data['close'].iloc[i])  # Predict next close price
            
            return np.array(X), np.array(y), available_columns
            
        except Exception as e:
            logger.error(f"Error preparing price features: {e}")
            raise
    
    def _train_lstm_model(self, X_train, y_train, X_val, y_val) -> Tuple[tf.keras.Model, Any]:
        """Train LSTM model for price prediction"""
        try:
            config = MODEL_CONFIG['price_prediction']
            
            model = Sequential([
                LSTM(config['lstm_units'], return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
                Dropout(config['dropout_rate']),
                LSTM(config['lstm_units'] // 2, return_sequences=False),
                Dropout(config['dropout_rate']),
                Dense(50, activation='relu'),
                Dense(1)
            ])
            
            model.compile(
                optimizer=Adam(learning_rate=config['learning_rate']),
                loss='mse',
                metrics=['mae']
            )
            
            callbacks = [
                EarlyStopping(patience=config['early_stopping_patience'], restore_best_weights=True),
                ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-7)
            ]
            
            history = model.fit(
                X_train, y_train,
                epochs=config['epochs'],
                batch_size=config['batch_size'],
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=0
            )
            
            return model, history
            
        except Exception as e:
            logger.error(f"Error training LSTM model: {e}")
            raise
    
    def _train_gru_model(self, X_train, y_train, X_val, y_val) -> Tuple[tf.keras.Model, Any]:
        """Train GRU model for price prediction"""
        try:
            config = MODEL_CONFIG['price_prediction']
            
            model = Sequential([
                GRU(config['lstm_units'], return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
                Dropout(config['dropout_rate']),
                GRU(config['lstm_units'] // 2, return_sequences=False),
                Dropout(config['dropout_rate']),
                Dense(50, activation='relu'),
                Dense(1)
            ])
            
            model.compile(
                optimizer=Adam(learning_rate=config['learning_rate']),
                loss='mse',
                metrics=['mae']
            )
            
            callbacks = [
                EarlyStopping(patience=config['early_stopping_patience'], restore_best_weights=True),
                ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-7)
            ]
            
            history = model.fit(
                X_train, y_train,
                epochs=config['epochs'],
                batch_size=config['batch_size'],
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=0
            )
            
            return model, history
            
        except Exception as e:
            logger.error(f"Error training GRU model: {e}")
            raise
    
    def _train_cnn_lstm_model(self, X_train, y_train, X_val, y_val) -> Tuple[tf.keras.Model, Any]:
        """Train CNN-LSTM hybrid model for price prediction"""
        try:
            config = MODEL_CONFIG['price_prediction']
            
            model = Sequential([
                Conv1D(filters=64, kernel_size=3, activation='relu', input_shape=(X_train.shape[1], X_train.shape[2])),
                MaxPooling1D(pool_size=2),
                LSTM(config['lstm_units'], return_sequences=True),
                Dropout(config['dropout_rate']),
                LSTM(config['lstm_units'] // 2, return_sequences=False),
                Dropout(config['dropout_rate']),
                Dense(50, activation='relu'),
                Dense(1)
            ])
            
            model.compile(
                optimizer=Adam(learning_rate=config['learning_rate']),
                loss='mse',
                metrics=['mae']
            )
            
            callbacks = [
                EarlyStopping(patience=config['early_stopping_patience'], restore_best_weights=True),
                ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-7)
            ]
            
            history = model.fit(
                X_train, y_train,
                epochs=config['epochs'],
                batch_size=config['batch_size'],
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=0
            )
            
            return model, history
            
        except Exception as e:
            logger.error(f"Error training CNN-LSTM model: {e}")
            raise
    
    async def _save_price_model(
        self,
        token: str,
        model: tf.keras.Model,
        scaler: MinMaxScaler,
        feature_columns: List[str],
        metadata: Dict
    ) -> str:
        """Save price prediction model and metadata"""
        try:
            model_dir = self.model_dir / 'price_prediction' / token
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # Save model
            model_path = model_dir / 'model.h5'
            model.save(str(model_path))
            
            # Save scaler
            scaler_path = model_dir / 'scaler.pkl'
            joblib.dump(scaler, str(scaler_path))
            
            # Save metadata
            metadata_path = model_dir / 'metadata.json'
            metadata['feature_columns'] = feature_columns
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Saved price prediction model for {token} to {model_path}")
            return str(model_path)
            
        except Exception as e:
            logger.error(f"Error saving price model for {token}: {e}")
            raise
    
    async def train_yield_optimization_model(
        self,
        protocols: List[str],
        retrain: bool = False
    ) -> TrainingResult:
        """Train yield optimization model"""
        try:
            model_key = "yield_optimization_global"
            
            if not retrain and model_key in self.models:
                logger.info("Yield optimization model already exists")
                return self._get_existing_training_result(model_key)
            
            logger.info("Training yield optimization model")
            
            # Collect training data
            training_data = await self._collect_yield_training_data(protocols)
            
            if training_data is None or len(training_data) < 50:
                raise ValueError("Insufficient training data for yield optimization")
            
            # Prepare features
            X, y = self._prepare_yield_features(training_data)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_val_scaled = scaler.transform(X_val)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            start_time = datetime.now()
            model, history = self._train_yield_neural_network(
                X_train_scaled, y_train, X_val_scaled, y_val
            )
            training_time = (datetime.now() - start_time).total_seconds()
            
            # Evaluate model
            train_pred = model.predict(X_train_scaled)
            val_pred = model.predict(X_val_scaled)
            test_pred = model.predict(X_test_scaled)
            
            train_score = r2_score(y_train, train_pred)
            val_score = r2_score(y_val, val_pred)
            test_score = r2_score(y_test, test_pred)
            
            # Save model
            model_path = await self._save_yield_model(model, scaler, {
                'train_score': train_score,
                'val_score': val_score,
                'test_score': test_score,
                'training_time': training_time,
                'protocols': protocols,
                'created_at': datetime.now().isoformat()
            })
            
            # Store in memory
            self.models[model_key] = model
            self.scalers[model_key] = scaler
            
            return TrainingResult(
                model_name="yield_optimization",
                model_type="neural_network",
                training_score=train_score,
                validation_score=val_score,
                test_score=test_score,
                training_time=training_time,
                model_path=model_path,
                feature_importance={},
                hyperparameters=MODEL_CONFIG['yield_optimization'],
                training_history=history.history if hasattr(history, 'history') else {}
            )
            
        except Exception as e:
            logger.error(f"Error training yield optimization model: {e}")
            raise
    
    async def _collect_yield_training_data(self, protocols: List[str]) -> Optional[pd.DataFrame]:
        """Collect historical yield data for training"""
        try:
            # Get protocol data
            protocol_data = await self.data_service.get_protocol_data(protocols)
            
            # Get market data for correlation
            market_data = await self.data_service.get_market_data(['ETH', 'BTC'])
            
            # Combine data into training dataset
            training_records = []
            
            for protocol, data in protocol_data.items():
                if data:
                    record = {
                        'protocol': protocol,
                        'tvl': data.tvl,
                        'apy': data.apy,
                        'volume_24h': data.volume_24h,
                        'eth_price': market_data.get('ETH', {}).get('current_price', 0),
                        'btc_price': market_data.get('BTC', {}).get('current_price', 0),
                        'timestamp': data.timestamp
                    }
                    training_records.append(record)
            
            if training_records:
                return pd.DataFrame(training_records)
            
            return None
            
        except Exception as e:
            logger.error(f"Error collecting yield training data: {e}")
            return None
    
    def _prepare_yield_features(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare features for yield optimization"""
        try:
            # Feature engineering
            features = []
            targets = []
            
            for _, row in data.iterrows():
                feature_vector = [
                    row['tvl'],
                    row['volume_24h'],
                    row['eth_price'],
                    row['btc_price'],
                    np.log1p(row['tvl']),  # Log transform
                    row['volume_24h'] / row['tvl'] if row['tvl'] > 0 else 0,  # Volume/TVL ratio
                ]
                
                features.append(feature_vector)
                targets.append(row['apy'])
            
            return np.array(features), np.array(targets)
            
        except Exception as e:
            logger.error(f"Error preparing yield features: {e}")
            raise
    
    def _train_yield_neural_network(self, X_train, y_train, X_val, y_val) -> Tuple[tf.keras.Model, Any]:
        """Train neural network for yield optimization"""
        try:
            config = MODEL_CONFIG['yield_optimization']
            
            model = Sequential([
                Dense(config['hidden_units'], activation='relu', input_shape=(X_train.shape[1],)),
                Dropout(config['dropout_rate']),
                Dense(config['hidden_units'] // 2, activation='relu'),
                Dropout(config['dropout_rate']),
                Dense(config['hidden_units'] // 4, activation='relu'),
                Dense(1, activation='linear')
            ])
            
            model.compile(
                optimizer=Adam(learning_rate=config['learning_rate']),
                loss='mse',
                metrics=['mae']
            )
            
            callbacks = [
                EarlyStopping(patience=config['early_stopping_patience'], restore_best_weights=True),
                ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-7)
            ]
            
            history = model.fit(
                X_train, y_train,
                epochs=config['epochs'],
                batch_size=config['batch_size'],
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=0
            )
            
            return model, history
            
        except Exception as e:
            logger.error(f"Error training yield neural network: {e}")
            raise
    
    async def _save_yield_model(
        self,
        model: tf.keras.Model,
        scaler: StandardScaler,
        metadata: Dict
    ) -> str:
        """Save yield optimization model"""
        try:
            model_dir = self.model_dir / 'yield_optimization' / 'global'
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # Save model
            model_path = model_dir / 'model.h5'
            model.save(str(model_path))
            
            # Save scaler
            scaler_path = model_dir / 'scaler.pkl'
            joblib.dump(scaler, str(scaler_path))
            
            # Save metadata
            metadata_path = model_dir / 'metadata.json'
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Saved yield optimization model to {model_path}")
            return str(model_path)
            
        except Exception as e:
            logger.error(f"Error saving yield model: {e}")
            raise
    
    async def backtest_strategy(
        self,
        strategy_name: str,
        tokens: List[str],
        start_date: datetime,
        end_date: datetime,
        initial_capital: float = 10000
    ) -> BacktestResult:
        """Backtest a trading strategy"""
        try:
            logger.info(f"Backtesting strategy {strategy_name} from {start_date} to {end_date}")
            
            # Get historical data for all tokens
            historical_data = {}
            for token in tokens:
                data = await self.data_service.get_price_data(
                    token=token,
                    timeframe='1d',
                    limit=365
                )
                if data is not None:
                    historical_data[token] = data
            
            if not historical_data:
                raise ValueError("No historical data available for backtesting")
            
            # Run backtest simulation
            backtest_result = await self._run_backtest_simulation(
                strategy_name,
                historical_data,
                start_date,
                end_date,
                initial_capital
            )
            
            return backtest_result
            
        except Exception as e:
            logger.error(f"Error backtesting strategy {strategy_name}: {e}")
            raise
    
    async def _run_backtest_simulation(
        self,
        strategy_name: str,
        historical_data: Dict[str, pd.DataFrame],
        start_date: datetime,
        end_date: datetime,
        initial_capital: float
    ) -> BacktestResult:
        """Run backtest simulation"""
        try:
            portfolio_value = initial_capital
            trades = []
            daily_returns = []
            max_portfolio_value = initial_capital
            max_drawdown = 0
            
            # Simple buy-and-hold strategy for demonstration
            for token, data in historical_data.items():
                # Filter data by date range
                mask = (data.index >= start_date) & (data.index <= end_date)
                token_data = data.loc[mask]
                
                if len(token_data) < 2:
                    continue
                
                # Calculate returns
                token_returns = token_data['close'].pct_change().dropna()
                daily_returns.extend(token_returns.tolist())
                
                # Simulate trades (simplified)
                entry_price = token_data['close'].iloc[0]
                exit_price = token_data['close'].iloc[-1]
                
                trade_return = (exit_price - entry_price) / entry_price
                trade_value = (initial_capital / len(historical_data)) * (1 + trade_return)
                
                trades.append({
                    'token': token,
                    'entry_date': token_data.index[0].isoformat(),
                    'exit_date': token_data.index[-1].isoformat(),
                    'entry_price': entry_price,
                    'exit_price': exit_price,
                    'return': trade_return,
                    'value': trade_value
                })
            
            # Calculate portfolio metrics
            total_return = sum(trade['return'] for trade in trades) / len(trades) if trades else 0
            portfolio_value = initial_capital * (1 + total_return)
            
            # Calculate risk metrics
            if daily_returns:
                returns_array = np.array(daily_returns)
                volatility = np.std(returns_array) * np.sqrt(252)  # Annualized
                
                # Sharpe ratio (assuming 2% risk-free rate)
                risk_free_rate = 0.02
                sharpe_ratio = (total_return - risk_free_rate) / volatility if volatility > 0 else 0
                
                # Sortino ratio
                downside_returns = returns_array[returns_array < 0]
                downside_volatility = np.std(downside_returns) * np.sqrt(252) if len(downside_returns) > 0 else 0
                sortino_ratio = (total_return - risk_free_rate) / downside_volatility if downside_volatility > 0 else 0
                
                # Max drawdown (simplified)
                cumulative_returns = np.cumprod(1 + returns_array)
                running_max = np.maximum.accumulate(cumulative_returns)
                drawdowns = (cumulative_returns - running_max) / running_max
                max_drawdown = abs(np.min(drawdowns)) if len(drawdowns) > 0 else 0
            else:
                volatility = 0
                sharpe_ratio = 0
                sortino_ratio = 0
                max_drawdown = 0
            
            # Win rate
            winning_trades = len([t for t in trades if t['return'] > 0])
            win_rate = winning_trades / len(trades) if trades else 0
            
            # Average trade return
            avg_trade_return = total_return
            
            # Calmar ratio
            calmar_ratio = total_return / max_drawdown if max_drawdown > 0 else 0
            
            return BacktestResult(
                strategy_name=strategy_name,
                total_return=total_return,
                sharpe_ratio=sharpe_ratio,
                max_drawdown=max_drawdown,
                win_rate=win_rate,
                total_trades=len(trades),
                avg_trade_return=avg_trade_return,
                volatility=volatility,
                calmar_ratio=calmar_ratio,
                sortino_ratio=sortino_ratio,
                trade_history=trades
            )
            
        except Exception as e:
            logger.error(f"Error running backtest simulation: {e}")
            raise
    
    def _get_existing_training_result(self, model_key: str) -> TrainingResult:
        """Get training result for existing model"""
        metadata = self.model_metadata.get(model_key, {})
        
        return TrainingResult(
            model_name=model_key,
            model_type=metadata.get('model_type', 'unknown'),
            training_score=metadata.get('train_score', 0),
            validation_score=metadata.get('val_score', 0),
            test_score=metadata.get('test_score', 0),
            training_time=metadata.get('training_time', 0),
            model_path=metadata.get('model_path', ''),
            feature_importance={},
            hyperparameters={},
            training_history={}
        )
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of all models"""
        status = {
            'total_models': len(self.models),
            'models': {},
            'last_updated': datetime.now().isoformat()
        }
        
        for model_key, model in self.models.items():
            metadata = self.model_metadata.get(model_key, {})
            status['models'][model_key] = {
                'type': metadata.get('model_type', 'unknown'),
                'created_at': metadata.get('created_at', ''),
                'train_score': metadata.get('train_score', 0),
                'val_score': metadata.get('val_score', 0),
                'test_score': metadata.get('test_score', 0)
            }
        
        return status
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            await self.data_service.cleanup()
            logger.info("Model trainer cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")