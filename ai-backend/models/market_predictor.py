import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import asyncio
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import logging

from config import MODEL_CONFIG, settings
from services.data_service import DataService
from utils.technical_indicators import TechnicalIndicators

logger = logging.getLogger(__name__)

class MarketPredictor:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.is_initialized = False
        self.data_service = DataService()
        self.technical_indicators = TechnicalIndicators()
        self.config = MODEL_CONFIG["price_predictor"]
        
    async def initialize(self):
        """Initialize the market predictor with pre-trained models"""
        try:
            await self.data_service.initialize()
            await self._load_or_train_models()
            self.is_initialized = True
            logger.info("Market Predictor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Market Predictor: {e}")
            raise
    
    def is_ready(self) -> bool:
        return self.is_initialized
    
    async def _load_or_train_models(self):
        """Load existing models or train new ones"""
        for token in settings.SUPPORTED_TOKENS:
            try:
                # Try to load existing model
                model_path = f"./models/price_predictor_{token.lower()}.h5"
                scaler_path = f"./models/scaler_{token.lower()}.pkl"
                
                if self._model_exists(model_path, scaler_path):
                    self.models[token] = load_model(model_path)
                    self.scalers[token] = joblib.load(scaler_path)
                    logger.info(f"Loaded existing model for {token}")
                else:
                    # Train new model
                    await self._train_model(token)
                    logger.info(f"Trained new model for {token}")
            except Exception as e:
                logger.error(f"Error loading/training model for {token}: {e}")
    
    def _model_exists(self, model_path: str, scaler_path: str) -> bool:
        """Check if model files exist"""
        import os
        return os.path.exists(model_path) and os.path.exists(scaler_path)
    
    async def _train_model(self, token: str):
        """Train LSTM model for a specific token"""
        # Get historical data
        data = await self.data_service.get_historical_price_data(
            token, days=365 * 2  # 2 years of data
        )
        
        if data is None or len(data) < 100:
            logger.warning(f"Insufficient data for {token}, using dummy model")
            self._create_dummy_model(token)
            return
        
        # Prepare features
        features_df = await self._prepare_features(data, token)
        
        # Create sequences for LSTM
        X, y = self._create_sequences(features_df)
        
        if len(X) == 0:
            logger.warning(f"No sequences created for {token}, using dummy model")
            self._create_dummy_model(token)
            return
        
        # Split data
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Scale data
        scaler = MinMaxScaler()
        X_train_scaled = scaler.fit_transform(X_train.reshape(-1, X_train.shape[-1])).reshape(X_train.shape)
        X_test_scaled = scaler.transform(X_test.reshape(-1, X_test.shape[-1])).reshape(X_test.shape)
        
        # Scale target
        y_scaler = MinMaxScaler()
        y_train_scaled = y_scaler.fit_transform(y_train.reshape(-1, 1)).flatten()
        y_test_scaled = y_scaler.transform(y_test.reshape(-1, 1)).flatten()
        
        # Build model
        model = self._build_lstm_model(X_train.shape[1], X_train.shape[2])
        
        # Train model
        callbacks = [
            EarlyStopping(patience=10, restore_best_weights=True),
            ReduceLROnPlateau(factor=0.5, patience=5)
        ]
        
        model.fit(
            X_train_scaled, y_train_scaled,
            validation_data=(X_test_scaled, y_test_scaled),
            epochs=self.config["epochs"],
            batch_size=self.config["batch_size"],
            callbacks=callbacks,
            verbose=0
        )
        
        # Save model and scalers
        model.save(f"./models/price_predictor_{token.lower()}.h5")
        joblib.dump(scaler, f"./models/scaler_{token.lower()}.pkl")
        joblib.dump(y_scaler, f"./models/y_scaler_{token.lower()}.pkl")
        
        self.models[token] = model
        self.scalers[token] = scaler
        
        # Evaluate model
        y_pred = model.predict(X_test_scaled)
        y_pred_unscaled = y_scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
        y_test_unscaled = y_scaler.inverse_transform(y_test_scaled.reshape(-1, 1)).flatten()
        
        mse = mean_squared_error(y_test_unscaled, y_pred_unscaled)
        mae = mean_absolute_error(y_test_unscaled, y_pred_unscaled)
        
        logger.info(f"Model for {token} - MSE: {mse:.4f}, MAE: {mae:.4f}")
    
    def _create_dummy_model(self, token: str):
        """Create a simple dummy model for tokens with insufficient data"""
        model = Sequential([
            Dense(32, activation='relu', input_shape=(10,)),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')
        
        # Create dummy scaler
        scaler = MinMaxScaler()
        dummy_data = np.random.randn(100, 10)
        scaler.fit(dummy_data)
        
        self.models[token] = model
        self.scalers[token] = scaler
    
    def _build_lstm_model(self, sequence_length: int, n_features: int) -> Sequential:
        """Build LSTM model architecture"""
        model = Sequential()
        
        # First LSTM layer
        model.add(LSTM(
            self.config["lstm_units"][0],
            return_sequences=True,
            input_shape=(sequence_length, n_features)
        ))
        model.add(Dropout(self.config["dropout_rate"]))
        model.add(BatchNormalization())
        
        # Second LSTM layer
        model.add(LSTM(
            self.config["lstm_units"][1],
            return_sequences=True
        ))
        model.add(Dropout(self.config["dropout_rate"]))
        model.add(BatchNormalization())
        
        # Third LSTM layer
        model.add(LSTM(self.config["lstm_units"][2]))
        model.add(Dropout(self.config["dropout_rate"]))
        
        # Dense layers
        model.add(Dense(32, activation='relu'))
        model.add(Dropout(0.1))
        model.add(Dense(1))
        
        # Compile model
        optimizer = Adam(learning_rate=self.config["learning_rate"])
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
        
        return model
    
    async def _prepare_features(self, data: pd.DataFrame, token: str) -> pd.DataFrame:
        """Prepare features for model training"""
        features_df = data.copy()
        
        # Add technical indicators
        features_df = self.technical_indicators.add_all_indicators(features_df)
        
        # Add time-based features
        features_df['hour'] = pd.to_datetime(features_df['timestamp']).dt.hour
        features_df['day_of_week'] = pd.to_datetime(features_df['timestamp']).dt.dayofweek
        features_df['month'] = pd.to_datetime(features_df['timestamp']).dt.month
        
        # Add lag features
        for lag in [1, 2, 3, 6, 12, 24]:
            features_df[f'price_lag_{lag}'] = features_df['close'].shift(lag)
            features_df[f'volume_lag_{lag}'] = features_df['volume'].shift(lag)
        
        # Add rolling statistics
        for window in [7, 14, 30]:
            features_df[f'price_mean_{window}'] = features_df['close'].rolling(window).mean()
            features_df[f'price_std_{window}'] = features_df['close'].rolling(window).std()
            features_df[f'volume_mean_{window}'] = features_df['volume'].rolling(window).mean()
        
        # Drop NaN values
        features_df = features_df.dropna()
        
        # Select relevant features
        feature_columns = [
            'open', 'high', 'low', 'close', 'volume',
            'sma_20', 'ema_12', 'rsi', 'macd', 'volatility',
            'hour', 'day_of_week', 'month'
        ] + [col for col in features_df.columns if 'lag_' in col or 'mean_' in col or 'std_' in col]
        
        return features_df[feature_columns]
    
    def _create_sequences(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training"""
        sequence_length = self.config["sequence_length"]
        
        if len(data) < sequence_length + 1:
            return np.array([]), np.array([])
        
        X, y = [], []
        
        for i in range(sequence_length, len(data)):
            X.append(data.iloc[i-sequence_length:i].values)
            y.append(data['close'].iloc[i])
        
        return np.array(X), np.array(y)
    
    async def predict_prices(
        self, 
        tokens: List[str], 
        timeframe: str = "1h", 
        horizon: int = 24
    ) -> Dict[str, List[Dict]]:
        """Predict prices for given tokens"""
        predictions = {}
        
        for token in tokens:
            if token not in self.models:
                logger.warning(f"No model available for {token}")
                continue
            
            try:
                # Get recent data
                recent_data = await self.data_service.get_recent_price_data(token, hours=168)
                
                if recent_data is None or len(recent_data) < self.config["sequence_length"]:
                    logger.warning(f"Insufficient recent data for {token}")
                    continue
                
                # Prepare features
                features_df = await self._prepare_features(recent_data, token)
                
                if len(features_df) < self.config["sequence_length"]:
                    continue
                
                # Make predictions
                token_predictions = await self._predict_token_prices(
                    token, features_df, horizon
                )
                
                predictions[token] = token_predictions
                
            except Exception as e:
                logger.error(f"Error predicting prices for {token}: {e}")
        
        return predictions
    
    async def _predict_token_prices(
        self, 
        token: str, 
        features_df: pd.DataFrame, 
        horizon: int
    ) -> List[Dict]:
        """Predict prices for a specific token"""
        model = self.models[token]
        scaler = self.scalers[token]
        
        # Get the last sequence
        last_sequence = features_df.tail(self.config["sequence_length"]).values
        
        # Scale the sequence
        last_sequence_scaled = scaler.transform(
            last_sequence.reshape(-1, last_sequence.shape[-1])
        ).reshape(1, *last_sequence.shape)
        
        predictions = []
        current_sequence = last_sequence_scaled.copy()
        
        for i in range(horizon):
            # Predict next price
            pred = model.predict(current_sequence, verbose=0)[0][0]
            
            # Create prediction entry
            timestamp = datetime.now() + timedelta(hours=i+1)
            predictions.append({
                "timestamp": timestamp.isoformat(),
                "predicted_price": float(pred),
                "confidence": self._calculate_confidence(i, horizon)
            })
            
            # Update sequence for next prediction (simplified)
            # In practice, you'd want to update with actual features
            new_row = current_sequence[0, -1:].copy()
            new_row[0, 3] = pred  # Update close price
            current_sequence = np.concatenate([
                current_sequence[:, 1:], new_row.reshape(1, 1, -1)
            ], axis=1)
        
        return predictions
    
    def _calculate_confidence(self, step: int, horizon: int) -> float:
        """Calculate confidence score for prediction"""
        # Confidence decreases with prediction horizon
        base_confidence = 0.9
        decay_rate = 0.05
        confidence = base_confidence * np.exp(-decay_rate * step)
        return max(0.1, min(0.9, confidence))
    
    async def get_confidence_scores(self, tokens: List[str]) -> Dict[str, float]:
        """Get model confidence scores for tokens"""
        confidence_scores = {}
        
        for token in tokens:
            if token in self.models:
                # Calculate confidence based on recent prediction accuracy
                confidence_scores[token] = await self._calculate_model_confidence(token)
            else:
                confidence_scores[token] = 0.0
        
        return confidence_scores
    
    async def _calculate_model_confidence(self, token: str) -> float:
        """Calculate model confidence based on recent performance"""
        try:
            # Get recent data for validation
            recent_data = await self.data_service.get_recent_price_data(token, hours=48)
            
            if recent_data is None or len(recent_data) < 24:
                return 0.5  # Default confidence
            
            # Calculate recent prediction accuracy (simplified)
            actual_prices = recent_data['close'].tail(24).values
            price_volatility = np.std(actual_prices) / np.mean(actual_prices)
            
            # Higher volatility = lower confidence
            confidence = max(0.1, min(0.9, 1.0 - price_volatility * 2))
            
            return confidence
            
        except Exception as e:
            logger.error(f"Error calculating confidence for {token}: {e}")
            return 0.5