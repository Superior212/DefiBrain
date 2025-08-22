import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization, Input, Concatenate
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import asyncio
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import logging

from config import MODEL_CONFIG, settings
from services.data_service import DataService
from utils.risk_calculator import RiskCalculator

logger = logging.getLogger(__name__)

class YieldOptimizer:
    def __init__(self):
        self.allocation_model = None
        self.risk_model = None
        self.yield_predictor = None
        self.scalers = {}
        self.encoders = {}
        self.is_initialized = False
        self.data_service = DataService()
        self.risk_calculator = RiskCalculator()
        self.config = MODEL_CONFIG["yield_optimizer"]
        
    async def initialize(self):
        """Initialize the yield optimizer with pre-trained models"""
        try:
            await self.data_service.initialize()
            await self._load_or_train_models()
            self.is_initialized = True
            logger.info("Yield Optimizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Yield Optimizer: {e}")
            raise
    
    def is_ready(self) -> bool:
        return self.is_initialized
    
    async def _load_or_train_models(self):
        """Load existing models or train new ones"""
        try:
            # Try to load existing models
            allocation_model_path = "./models/allocation_optimizer.h5"
            risk_model_path = "./models/risk_predictor.pkl"
            yield_model_path = "./models/yield_predictor.h5"
            
            if self._models_exist([allocation_model_path, risk_model_path, yield_model_path]):
                self.allocation_model = load_model(allocation_model_path)
                self.risk_model = joblib.load(risk_model_path)
                self.yield_predictor = load_model(yield_model_path)
                
                # Load scalers and encoders
                self.scalers = joblib.load("./models/yield_scalers.pkl")
                self.encoders = joblib.load("./models/yield_encoders.pkl")
                
                logger.info("Loaded existing yield optimization models")
            else:
                # Train new models
                await self._train_models()
                logger.info("Trained new yield optimization models")
                
        except Exception as e:
            logger.error(f"Error loading/training yield models: {e}")
            await self._create_dummy_models()
    
    def _models_exist(self, model_paths: List[str]) -> bool:
        """Check if all model files exist"""
        import os
        return all(os.path.exists(path) for path in model_paths)
    
    async def _train_models(self):
        """Train all yield optimization models"""
        # Get historical protocol data
        protocol_data = await self.data_service.get_historical_protocol_data(days=365)
        
        if protocol_data is None or len(protocol_data) < 1000:
            logger.warning("Insufficient protocol data, creating dummy models")
            await self._create_dummy_models()
            return
        
        # Prepare training data
        X, y_allocation, y_risk, y_yield = await self._prepare_training_data(protocol_data)
        
        if len(X) == 0:
            await self._create_dummy_models()
            return
        
        # Train allocation optimizer
        await self._train_allocation_model(X, y_allocation)
        
        # Train risk predictor
        await self._train_risk_model(X, y_risk)
        
        # Train yield predictor
        await self._train_yield_model(X, y_yield)
        
        # Save models
        self.allocation_model.save("./models/allocation_optimizer.h5")
        joblib.dump(self.risk_model, "./models/risk_predictor.pkl")
        self.yield_predictor.save("./models/yield_predictor.h5")
        joblib.dump(self.scalers, "./models/yield_scalers.pkl")
        joblib.dump(self.encoders, "./models/yield_encoders.pkl")
    
    async def _prepare_training_data(self, protocol_data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data for all models"""
        # Feature engineering
        features_df = protocol_data.copy()
        
        # Add protocol features
        features_df['tvl_change_7d'] = features_df.groupby('protocol')['tvl'].pct_change(7)
        features_df['apy_volatility'] = features_df.groupby('protocol')['apy'].rolling(30).std().reset_index(0, drop=True)
        features_df['volume_to_tvl_ratio'] = features_df['volume_24h'] / features_df['tvl']
        features_df['protocol_age_days'] = (pd.to_datetime(features_df['timestamp']) - pd.to_datetime(features_df['launch_date'])).dt.days
        
        # Add market features
        features_df['market_cap_rank'] = features_df.groupby('timestamp')['market_cap'].rank(ascending=False)
        features_df['relative_apy'] = features_df.groupby('timestamp')['apy'].transform(lambda x: (x - x.mean()) / x.std())
        
        # Add risk features
        features_df['audit_score'] = features_df['audit_count'] * features_df['audit_quality']
        features_df['liquidity_score'] = np.log1p(features_df['liquidity_depth'])
        features_df['volatility_score'] = features_df['price_volatility_30d'] * features_df['apy_volatility']
        
        # Encode categorical features
        categorical_features = ['protocol', 'blockchain', 'category']
        for feature in categorical_features:
            if feature not in self.encoders:
                self.encoders[feature] = LabelEncoder()
                features_df[f'{feature}_encoded'] = self.encoders[feature].fit_transform(features_df[feature].astype(str))
            else:
                features_df[f'{feature}_encoded'] = self.encoders[feature].transform(features_df[feature].astype(str))
        
        # Select features
        feature_columns = [
            'apy', 'tvl', 'volume_24h', 'market_cap', 'liquidity_depth',
            'price_volatility_30d', 'tvl_change_7d', 'apy_volatility',
            'volume_to_tvl_ratio', 'protocol_age_days', 'market_cap_rank',
            'relative_apy', 'audit_score', 'liquidity_score', 'volatility_score'
        ] + [f'{f}_encoded' for f in categorical_features]
        
        # Remove NaN values
        features_df = features_df.dropna(subset=feature_columns)
        
        if len(features_df) == 0:
            return np.array([]), np.array([]), np.array([]), np.array([])
        
        # Scale features
        if 'features' not in self.scalers:
            self.scalers['features'] = StandardScaler()
            X = self.scalers['features'].fit_transform(features_df[feature_columns])
        else:
            X = self.scalers['features'].transform(features_df[feature_columns])
        
        # Prepare targets
        y_allocation = self._calculate_optimal_allocations(features_df)
        y_risk = features_df['volatility_score'].values
        y_yield = features_df['apy'].values
        
        return X, y_allocation, y_risk, y_yield
    
    def _calculate_optimal_allocations(self, data: pd.DataFrame) -> np.ndarray:
        """Calculate optimal allocations based on risk-adjusted returns"""
        # Calculate Sharpe ratio for each protocol
        data['sharpe_ratio'] = (data['apy'] - settings.RISK_FREE_RATE) / data['apy_volatility']
        
        # Group by timestamp and calculate optimal weights
        allocations = []
        
        for timestamp, group in data.groupby('timestamp'):
            if len(group) < 2:
                continue
            
            # Use mean-variance optimization (simplified)
            returns = group['apy'].values
            risks = group['apy_volatility'].values
            
            # Avoid division by zero
            risks = np.where(risks == 0, 0.01, risks)
            
            # Calculate weights using inverse volatility weighting
            inv_vol_weights = 1 / risks
            weights = inv_vol_weights / inv_vol_weights.sum()
            
            # Apply constraints
            weights = np.clip(weights, 0, settings.MAX_POSITION_SIZE)
            weights = weights / weights.sum()  # Renormalize
            
            allocations.extend(weights)
        
        return np.array(allocations)
    
    async def _train_allocation_model(self, X: np.ndarray, y: np.ndarray):
        """Train the allocation optimization model"""
        if len(X) == 0 or len(y) == 0:
            self._create_dummy_allocation_model(X.shape[1] if len(X) > 0 else 10)
            return
        
        # Build model
        model = self._build_allocation_model(X.shape[1])
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        callbacks = [
            EarlyStopping(patience=15, restore_best_weights=True),
            ReduceLROnPlateau(factor=0.5, patience=7)
        ]
        
        model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=self.config["epochs"],
            batch_size=self.config["batch_size"],
            callbacks=callbacks,
            verbose=0
        )
        
        self.allocation_model = model
    
    def _build_allocation_model(self, input_dim: int) -> Model:
        """Build allocation optimization neural network"""
        inputs = Input(shape=(input_dim,))
        
        # Hidden layers
        x = Dense(self.config["hidden_layers"][0], activation=self.config["activation"])(inputs)
        x = BatchNormalization()(x)
        x = Dropout(self.config["dropout_rate"])(x)
        
        x = Dense(self.config["hidden_layers"][1], activation=self.config["activation"])(x)
        x = BatchNormalization()(x)
        x = Dropout(self.config["dropout_rate"])(x)
        
        x = Dense(self.config["hidden_layers"][2], activation=self.config["activation"])(x)
        x = Dropout(self.config["dropout_rate"] / 2)(x)
        
        # Output layer (allocation weights)
        outputs = Dense(1, activation='sigmoid')(x)  # Single allocation weight
        
        model = Model(inputs=inputs, outputs=outputs)
        
        optimizer = Adam(learning_rate=self.config["learning_rate"])
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
        
        return model
    
    async def _train_risk_model(self, X: np.ndarray, y: np.ndarray):
        """Train the risk prediction model using Random Forest"""
        if len(X) == 0 or len(y) == 0:
            self.risk_model = RandomForestRegressor(n_estimators=10, random_state=42)
            # Fit with dummy data
            dummy_X = np.random.randn(100, X.shape[1] if len(X) > 0 else 10)
            dummy_y = np.random.randn(100)
            self.risk_model.fit(dummy_X, dummy_y)
            return
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train Random Forest model
        self.risk_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.risk_model.fit(X_train, y_train)
        
        # Evaluate
        score = self.risk_model.score(X_test, y_test)
        logger.info(f"Risk model R² score: {score:.4f}")
    
    async def _train_yield_model(self, X: np.ndarray, y: np.ndarray):
        """Train the yield prediction model"""
        if len(X) == 0 or len(y) == 0:
            self._create_dummy_yield_model(X.shape[1] if len(X) > 0 else 10)
            return
        
        # Build model
        model = self._build_yield_model(X.shape[1])
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale targets
        if 'yield' not in self.scalers:
            self.scalers['yield'] = StandardScaler()
            y_train_scaled = self.scalers['yield'].fit_transform(y_train.reshape(-1, 1)).flatten()
            y_test_scaled = self.scalers['yield'].transform(y_test.reshape(-1, 1)).flatten()
        else:
            y_train_scaled = self.scalers['yield'].transform(y_train.reshape(-1, 1)).flatten()
            y_test_scaled = self.scalers['yield'].transform(y_test.reshape(-1, 1)).flatten()
        
        # Train model
        callbacks = [
            EarlyStopping(patience=15, restore_best_weights=True),
            ReduceLROnPlateau(factor=0.5, patience=7)
        ]
        
        model.fit(
            X_train, y_train_scaled,
            validation_data=(X_test, y_test_scaled),
            epochs=self.config["epochs"],
            batch_size=self.config["batch_size"],
            callbacks=callbacks,
            verbose=0
        )
        
        self.yield_predictor = model
    
    def _build_yield_model(self, input_dim: int) -> Sequential:
        """Build yield prediction neural network"""
        model = Sequential([
            Dense(self.config["hidden_layers"][0], activation=self.config["activation"], input_shape=(input_dim,)),
            BatchNormalization(),
            Dropout(self.config["dropout_rate"]),
            
            Dense(self.config["hidden_layers"][1], activation=self.config["activation"]),
            BatchNormalization(),
            Dropout(self.config["dropout_rate"]),
            
            Dense(self.config["hidden_layers"][2], activation=self.config["activation"]),
            Dropout(self.config["dropout_rate"] / 2),
            
            Dense(1)  # Yield prediction
        ])
        
        optimizer = Adam(learning_rate=self.config["learning_rate"])
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
        
        return model
    
    async def _create_dummy_models(self):
        """Create dummy models when insufficient data"""
        input_dim = 15  # Default feature dimension
        
        self._create_dummy_allocation_model(input_dim)
        self._create_dummy_risk_model(input_dim)
        self._create_dummy_yield_model(input_dim)
        
        # Create dummy scalers
        self.scalers['features'] = StandardScaler()
        self.scalers['yield'] = StandardScaler()
        
        # Fit with dummy data
        dummy_data = np.random.randn(100, input_dim)
        dummy_targets = np.random.randn(100)
        
        self.scalers['features'].fit(dummy_data)
        self.scalers['yield'].fit(dummy_targets.reshape(-1, 1))
    
    def _create_dummy_allocation_model(self, input_dim: int):
        """Create dummy allocation model"""
        self.allocation_model = Sequential([
            Dense(32, activation='relu', input_shape=(input_dim,)),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])
        self.allocation_model.compile(optimizer='adam', loss='mse')
    
    def _create_dummy_risk_model(self, input_dim: int):
        """Create dummy risk model"""
        self.risk_model = RandomForestRegressor(n_estimators=10, random_state=42)
        dummy_X = np.random.randn(100, input_dim)
        dummy_y = np.random.randn(100)
        self.risk_model.fit(dummy_X, dummy_y)
    
    def _create_dummy_yield_model(self, input_dim: int):
        """Create dummy yield model"""
        self.yield_predictor = Sequential([
            Dense(32, activation='relu', input_shape=(input_dim,)),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        self.yield_predictor.compile(optimizer='adam', loss='mse')
    
    async def optimize_allocation(
        self,
        portfolio_value: float,
        risk_tolerance: str,
        protocols: List[str],
        current_positions: Dict[str, float]
    ) -> Dict:
        """Optimize portfolio allocation across protocols"""
        try:
            # Get current protocol data
            protocol_data = await self.data_service.get_current_protocol_data(protocols)
            
            if not protocol_data:
                return self._get_default_optimization(protocols, portfolio_value)
            
            # Prepare features for each protocol
            optimizations = []
            
            for protocol in protocols:
                if protocol not in protocol_data:
                    continue
                
                features = await self._prepare_protocol_features(protocol_data[protocol])
                
                # Predict allocation weight
                allocation_weight = self.allocation_model.predict(features.reshape(1, -1))[0][0]
                
                # Predict risk
                risk_score = self.risk_model.predict(features.reshape(1, -1))[0]
                
                # Predict yield
                yield_pred = self.yield_predictor.predict(features.reshape(1, -1))[0][0]
                
                # Unscale yield prediction
                if 'yield' in self.scalers:
                    yield_pred = self.scalers['yield'].inverse_transform([[yield_pred]])[0][0]
                
                optimizations.append({
                    'protocol': protocol,
                    'allocation_weight': float(allocation_weight),
                    'risk_score': float(risk_score),
                    'predicted_apy': float(yield_pred),
                    'current_allocation': current_positions.get(protocol, 0.0)
                })
            
            # Apply risk tolerance adjustments
            optimizations = self._apply_risk_tolerance(optimizations, risk_tolerance)
            
            # Normalize allocations
            total_weight = sum(opt['allocation_weight'] for opt in optimizations)
            if total_weight > 0:
                for opt in optimizations:
                    opt['allocation_weight'] /= total_weight
                    opt['target_amount'] = opt['allocation_weight'] * portfolio_value
            
            # Calculate portfolio metrics
            expected_apy = sum(opt['allocation_weight'] * opt['predicted_apy'] for opt in optimizations)
            portfolio_risk = self._calculate_portfolio_risk(optimizations)
            
            return {
                'allocations': optimizations,
                'expected_apy': expected_apy,
                'risk_score': portfolio_risk,
                'diversification_score': len([opt for opt in optimizations if opt['allocation_weight'] > 0.05]),
                'rebalancing_needed': self._check_rebalancing_needed(optimizations),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error optimizing allocation: {e}")
            return self._get_default_optimization(protocols, portfolio_value)
    
    async def _prepare_protocol_features(self, protocol_data: Dict) -> np.ndarray:
        """Prepare features for a single protocol"""
        # Extract features from protocol data
        features = [
            protocol_data.get('apy', 0),
            protocol_data.get('tvl', 0),
            protocol_data.get('volume_24h', 0),
            protocol_data.get('market_cap', 0),
            protocol_data.get('liquidity_depth', 0),
            protocol_data.get('price_volatility_30d', 0),
            protocol_data.get('tvl_change_7d', 0),
            protocol_data.get('apy_volatility', 0.1),
            protocol_data.get('volume_to_tvl_ratio', 0),
            protocol_data.get('protocol_age_days', 365),
            protocol_data.get('market_cap_rank', 100),
            protocol_data.get('relative_apy', 0),
            protocol_data.get('audit_score', 5),
            protocol_data.get('liquidity_score', 0),
            protocol_data.get('volatility_score', 0.1)
        ]
        
        # Scale features
        features_array = np.array(features).reshape(1, -1)
        if 'features' in self.scalers:
            features_scaled = self.scalers['features'].transform(features_array)
        else:
            features_scaled = features_array
        
        return features_scaled.flatten()
    
    def _apply_risk_tolerance(self, optimizations: List[Dict], risk_tolerance: str) -> List[Dict]:
        """Apply risk tolerance to allocations"""
        risk_multipliers = {
            'conservative': 0.5,
            'moderate': 1.0,
            'aggressive': 1.5
        }
        
        multiplier = risk_multipliers.get(risk_tolerance, 1.0)
        
        for opt in optimizations:
            # Adjust allocation based on risk
            risk_adjustment = 1.0 / (1.0 + opt['risk_score'] / multiplier)
            opt['allocation_weight'] *= risk_adjustment
        
        return optimizations
    
    def _calculate_portfolio_risk(self, optimizations: List[Dict]) -> float:
        """Calculate overall portfolio risk score"""
        if not optimizations:
            return 0.5
        
        weighted_risk = sum(
            opt['allocation_weight'] * opt['risk_score'] 
            for opt in optimizations
        )
        
        return min(1.0, max(0.0, weighted_risk))
    
    def _check_rebalancing_needed(self, optimizations: List[Dict]) -> bool:
        """Check if portfolio rebalancing is needed"""
        threshold = 0.05  # 5% threshold
        
        for opt in optimizations:
            current = opt['current_allocation']
            target = opt['allocation_weight']
            
            if abs(current - target) > threshold:
                return True
        
        return False
    
    def _get_default_optimization(self, protocols: List[str], portfolio_value: float) -> Dict:
        """Get default optimization when models fail"""
        equal_weight = 1.0 / len(protocols) if protocols else 0
        
        allocations = []
        for protocol in protocols:
            allocations.append({
                'protocol': protocol,
                'allocation_weight': equal_weight,
                'risk_score': 0.5,
                'predicted_apy': 5.0,  # Default 5% APY
                'current_allocation': 0.0,
                'target_amount': equal_weight * portfolio_value
            })
        
        return {
            'allocations': allocations,
            'expected_apy': 5.0,
            'risk_score': 0.5,
            'diversification_score': len(protocols),
            'rebalancing_needed': True,
            'timestamp': datetime.now().isoformat()
        }
    
    async def generate_portfolio_insights(self, address: str) -> Dict:
        """Generate AI-powered portfolio insights"""
        try:
            # Get portfolio data
            portfolio_data = await self.data_service.get_portfolio_data(address)
            
            if not portfolio_data:
                return self._get_default_insights()
            
            # Analyze current allocation
            current_analysis = await self._analyze_current_allocation(portfolio_data)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(portfolio_data)
            
            # Calculate risk analysis
            risk_analysis = await self._analyze_portfolio_risk(portfolio_data)
            
            return {
                'current_analysis': current_analysis,
                'recommendations': recommendations,
                'risk_analysis': risk_analysis,
                'performance_metrics': await self._calculate_performance_metrics(portfolio_data),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating portfolio insights: {e}")
            return self._get_default_insights()
    
    async def _analyze_current_allocation(self, portfolio_data: Dict) -> Dict:
        """Analyze current portfolio allocation"""
        positions = portfolio_data.get('positions', [])
        
        if not positions:
            return {'status': 'empty', 'message': 'No positions found'}
        
        total_value = sum(pos['value'] for pos in positions)
        
        analysis = {
            'total_value': total_value,
            'position_count': len(positions),
            'diversification_score': min(1.0, len(positions) / 5),  # Optimal: 5+ positions
            'concentration_risk': max(pos['value'] / total_value for pos in positions),
            'protocol_distribution': {}
        }
        
        # Calculate protocol distribution
        for pos in positions:
            protocol = pos.get('protocol', 'unknown')
            if protocol not in analysis['protocol_distribution']:
                analysis['protocol_distribution'][protocol] = 0
            analysis['protocol_distribution'][protocol] += pos['value'] / total_value
        
        return analysis
    
    async def _generate_recommendations(self, portfolio_data: Dict) -> List[Dict]:
        """Generate AI-powered recommendations"""
        recommendations = []
        
        positions = portfolio_data.get('positions', [])
        total_value = sum(pos['value'] for pos in positions) if positions else 0
        
        # Diversification recommendation
        if len(positions) < 3:
            recommendations.append({
                'type': 'diversification',
                'priority': 'high',
                'title': 'Increase Diversification',
                'description': 'Consider adding more protocols to reduce concentration risk',
                'action': 'Add 2-3 more DeFi protocols to your portfolio'
            })
        
        # Concentration risk recommendation
        if positions:
            max_allocation = max(pos['value'] / total_value for pos in positions)
            if max_allocation > 0.4:
                recommendations.append({
                    'type': 'rebalancing',
                    'priority': 'medium',
                    'title': 'Reduce Concentration Risk',
                    'description': f'Your largest position represents {max_allocation:.1%} of your portfolio',
                    'action': 'Consider rebalancing to reduce single-protocol exposure'
                })
        
        # Yield optimization recommendation
        recommendations.append({
            'type': 'yield_optimization',
            'priority': 'low',
            'title': 'Optimize Yield Strategy',
            'description': 'AI models suggest potential yield improvements',
            'action': 'Review suggested protocol allocations for better returns'
        })
        
        return recommendations
    
    async def _analyze_portfolio_risk(self, portfolio_data: Dict) -> Dict:
        """Analyze portfolio risk metrics"""
        positions = portfolio_data.get('positions', [])
        
        if not positions:
            return {'overall_risk': 0.5, 'risk_factors': []}
        
        risk_factors = []
        total_risk = 0
        total_weight = 0
        
        for pos in positions:
            weight = pos['value'] / sum(p['value'] for p in positions)
            protocol_risk = pos.get('risk_score', 0.5)
            
            total_risk += weight * protocol_risk
            total_weight += weight
            
            if protocol_risk > 0.7:
                risk_factors.append(f"High risk in {pos.get('protocol', 'unknown')} protocol")
        
        overall_risk = total_risk / total_weight if total_weight > 0 else 0.5
        
        # Add concentration risk factor
        max_allocation = max(pos['value'] / sum(p['value'] for p in positions) for pos in positions)
        if max_allocation > 0.3:
            risk_factors.append(f"Concentration risk: {max_allocation:.1%} in single protocol")
        
        return {
            'overall_risk': overall_risk,
            'risk_level': 'low' if overall_risk < 0.3 else 'medium' if overall_risk < 0.7 else 'high',
            'risk_factors': risk_factors,
            'diversification_benefit': 1.0 - max_allocation if positions else 0
        }
    
    async def _calculate_performance_metrics(self, portfolio_data: Dict) -> Dict:
        """Calculate portfolio performance metrics"""
        # This would typically use historical data
        # For now, return estimated metrics
        
        positions = portfolio_data.get('positions', [])
        
        if not positions:
            return {'total_return': 0, 'apy': 0, 'sharpe_ratio': 0}
        
        # Estimate metrics based on current positions
        weighted_apy = sum(
            pos.get('apy', 5.0) * pos['value'] / sum(p['value'] for p in positions)
            for pos in positions
        )
        
        return {
            'estimated_apy': weighted_apy,
            'total_return': portfolio_data.get('total_return', 0),
            'sharpe_ratio': max(0, (weighted_apy - settings.RISK_FREE_RATE) / 10),  # Simplified
            'volatility': sum(pos.get('volatility', 0.1) for pos in positions) / len(positions)
        }
    
    def _get_default_insights(self) -> Dict:
        """Get default insights when analysis fails"""
        return {
            'current_analysis': {'status': 'unavailable'},
            'recommendations': [
                {
                    'type': 'general',
                    'priority': 'medium',
                    'title': 'Start Building Your Portfolio',
                    'description': 'Begin with established DeFi protocols',
                    'action': 'Consider starting with blue-chip protocols like Aave or Compound'
                }
            ],
            'risk_analysis': {'overall_risk': 0.5, 'risk_factors': []},
            'performance_metrics': {'estimated_apy': 0, 'total_return': 0},
            'timestamp': datetime.now().isoformat()
        }