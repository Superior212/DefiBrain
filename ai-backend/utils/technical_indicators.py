import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
import talib
from scipy import stats
import logging

logger = logging.getLogger(__name__)

class TechnicalIndicators:
    """Technical analysis indicators for cryptocurrency market analysis"""
    
    def __init__(self):
        self.indicators = {}
    
    def add_all_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add all technical indicators to the dataframe"""
        try:
            # Ensure required columns exist
            required_columns = ['open', 'high', 'low', 'close', 'volume']
            for col in required_columns:
                if col not in df.columns:
                    logger.warning(f"Missing column {col} in dataframe")
                    return df
            
            # Make a copy to avoid modifying original
            data = df.copy()
            
            # Price-based indicators
            data = self.add_moving_averages(data)
            data = self.add_bollinger_bands(data)
            data = self.add_price_channels(data)
            
            # Momentum indicators
            data = self.add_rsi(data)
            data = self.add_macd(data)
            data = self.add_stochastic(data)
            data = self.add_williams_r(data)
            data = self.add_cci(data)
            
            # Volume indicators
            data = self.add_volume_indicators(data)
            
            # Volatility indicators
            data = self.add_volatility_indicators(data)
            
            # Trend indicators
            data = self.add_trend_indicators(data)
            
            # Support/Resistance levels
            data = self.add_support_resistance(data)
            
            return data
            
        except Exception as e:
            logger.error(f"Error adding technical indicators: {e}")
            return df
    
    def add_moving_averages(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add various moving averages"""
        try:
            close = df['close'].values
            
            # Simple Moving Averages
            df['sma_5'] = talib.SMA(close, timeperiod=5)
            df['sma_10'] = talib.SMA(close, timeperiod=10)
            df['sma_20'] = talib.SMA(close, timeperiod=20)
            df['sma_50'] = talib.SMA(close, timeperiod=50)
            df['sma_100'] = talib.SMA(close, timeperiod=100)
            df['sma_200'] = talib.SMA(close, timeperiod=200)
            
            # Exponential Moving Averages
            df['ema_5'] = talib.EMA(close, timeperiod=5)
            df['ema_10'] = talib.EMA(close, timeperiod=10)
            df['ema_20'] = talib.EMA(close, timeperiod=20)
            df['ema_50'] = talib.EMA(close, timeperiod=50)
            
            # Weighted Moving Average
            df['wma_20'] = talib.WMA(close, timeperiod=20)
            
            # Hull Moving Average
            df['hma_20'] = self._hull_moving_average(close, 20)
            
            # Moving Average Convergence/Divergence
            df['ma_spread_20_50'] = df['sma_20'] - df['sma_50']
            df['ma_ratio_20_50'] = df['sma_20'] / df['sma_50']
            
        except Exception as e:
            logger.error(f"Error adding moving averages: {e}")
        
        return df
    
    def add_bollinger_bands(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add Bollinger Bands"""
        try:
            close = df['close'].values
            
            # Standard Bollinger Bands (20, 2)
            bb_upper, bb_middle, bb_lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
            df['bb_upper'] = bb_upper
            df['bb_middle'] = bb_middle
            df['bb_lower'] = bb_lower
            df['bb_width'] = (bb_upper - bb_lower) / bb_middle
            df['bb_position'] = (close - bb_lower) / (bb_upper - bb_lower)
            
            # Bollinger Band squeeze
            df['bb_squeeze'] = df['bb_width'] < df['bb_width'].rolling(20).quantile(0.1)
            
        except Exception as e:
            logger.error(f"Error adding Bollinger Bands: {e}")
        
        return df
    
    def add_price_channels(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add price channels and support/resistance"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Donchian Channels
            df['dc_upper_20'] = pd.Series(high).rolling(20).max()
            df['dc_lower_20'] = pd.Series(low).rolling(20).min()
            df['dc_middle_20'] = (df['dc_upper_20'] + df['dc_lower_20']) / 2
            
            # Keltner Channels
            atr = talib.ATR(high, low, close, timeperiod=20)
            ema_20 = talib.EMA(close, timeperiod=20)
            df['kc_upper'] = ema_20 + (2 * atr)
            df['kc_lower'] = ema_20 - (2 * atr)
            df['kc_middle'] = ema_20
            
        except Exception as e:
            logger.error(f"Error adding price channels: {e}")
        
        return df
    
    def add_rsi(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add RSI and related indicators"""
        try:
            close = df['close'].values
            
            # Standard RSI
            df['rsi'] = talib.RSI(close, timeperiod=14)
            df['rsi_sma'] = talib.SMA(df['rsi'].values, timeperiod=14)
            
            # RSI divergence signals
            df['rsi_oversold'] = df['rsi'] < 30
            df['rsi_overbought'] = df['rsi'] > 70
            
            # Stochastic RSI
            df['stoch_rsi_k'], df['stoch_rsi_d'] = talib.STOCHRSI(close, timeperiod=14)
            
        except Exception as e:
            logger.error(f"Error adding RSI: {e}")
        
        return df
    
    def add_macd(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add MACD indicators"""
        try:
            close = df['close'].values
            
            # MACD
            macd, macd_signal, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
            df['macd'] = macd
            df['macd_signal'] = macd_signal
            df['macd_histogram'] = macd_hist
            
            # MACD crossover signals
            df['macd_bullish_cross'] = (df['macd'] > df['macd_signal']) & (df['macd'].shift(1) <= df['macd_signal'].shift(1))
            df['macd_bearish_cross'] = (df['macd'] < df['macd_signal']) & (df['macd'].shift(1) >= df['macd_signal'].shift(1))
            
            # MACD zero line crossover
            df['macd_above_zero'] = df['macd'] > 0
            df['macd_zero_cross_up'] = (df['macd'] > 0) & (df['macd'].shift(1) <= 0)
            df['macd_zero_cross_down'] = (df['macd'] < 0) & (df['macd'].shift(1) >= 0)
            
        except Exception as e:
            logger.error(f"Error adding MACD: {e}")
        
        return df
    
    def add_stochastic(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add Stochastic oscillator"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Stochastic %K and %D
            stoch_k, stoch_d = talib.STOCH(high, low, close, fastk_period=14, slowk_period=3, slowd_period=3)
            df['stoch_k'] = stoch_k
            df['stoch_d'] = stoch_d
            
            # Stochastic signals
            df['stoch_oversold'] = (df['stoch_k'] < 20) & (df['stoch_d'] < 20)
            df['stoch_overbought'] = (df['stoch_k'] > 80) & (df['stoch_d'] > 80)
            
        except Exception as e:
            logger.error(f"Error adding Stochastic: {e}")
        
        return df
    
    def add_williams_r(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add Williams %R"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            df['williams_r'] = talib.WILLR(high, low, close, timeperiod=14)
            
        except Exception as e:
            logger.error(f"Error adding Williams %R: {e}")
        
        return df
    
    def add_cci(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add Commodity Channel Index"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            df['cci'] = talib.CCI(high, low, close, timeperiod=20)
            
            # CCI signals
            df['cci_oversold'] = df['cci'] < -100
            df['cci_overbought'] = df['cci'] > 100
            
        except Exception as e:
            logger.error(f"Error adding CCI: {e}")
        
        return df
    
    def add_volume_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volume-based indicators"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            volume = df['volume'].values
            
            # Volume Moving Averages
            df['volume_sma_20'] = talib.SMA(volume, timeperiod=20)
            df['volume_ratio'] = volume / df['volume_sma_20']
            
            # On-Balance Volume
            df['obv'] = talib.OBV(close, volume)
            df['obv_sma'] = talib.SMA(df['obv'].values, timeperiod=20)
            
            # Volume Price Trend
            df['vpt'] = self._volume_price_trend(close, volume)
            
            # Accumulation/Distribution Line
            df['ad_line'] = talib.AD(high, low, close, volume)
            
            # Chaikin Money Flow
            df['cmf'] = self._chaikin_money_flow(high, low, close, volume, 20)
            
            # Volume Weighted Average Price (VWAP)
            df['vwap'] = self._vwap(high, low, close, volume)
            
        except Exception as e:
            logger.error(f"Error adding volume indicators: {e}")
        
        return df
    
    def add_volatility_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility indicators"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Average True Range
            df['atr'] = talib.ATR(high, low, close, timeperiod=14)
            df['atr_percent'] = df['atr'] / close * 100
            
            # True Range
            df['true_range'] = talib.TRANGE(high, low, close)
            
            # Historical Volatility
            df['volatility'] = df['close'].pct_change().rolling(20).std() * np.sqrt(252) * 100
            
            # Volatility ratio
            df['volatility_ratio'] = df['volatility'] / df['volatility'].rolling(50).mean()
            
        except Exception as e:
            logger.error(f"Error adding volatility indicators: {e}")
        
        return df
    
    def add_trend_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add trend indicators"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Average Directional Index (ADX)
            df['adx'] = talib.ADX(high, low, close, timeperiod=14)
            df['plus_di'] = talib.PLUS_DI(high, low, close, timeperiod=14)
            df['minus_di'] = talib.MINUS_DI(high, low, close, timeperiod=14)
            
            # Parabolic SAR
            df['sar'] = talib.SAR(high, low, acceleration=0.02, maximum=0.2)
            
            # Aroon
            df['aroon_up'], df['aroon_down'] = talib.AROON(high, low, timeperiod=25)
            df['aroon_oscillator'] = df['aroon_up'] - df['aroon_down']
            
            # Linear Regression
            df['linear_reg'] = talib.LINEARREG(close, timeperiod=20)
            df['linear_reg_slope'] = talib.LINEARREG_SLOPE(close, timeperiod=20)
            
            # Trend strength
            df['trend_strength'] = self._calculate_trend_strength(close)
            
        except Exception as e:
            logger.error(f"Error adding trend indicators: {e}")
        
        return df
    
    def add_support_resistance(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add support and resistance levels"""
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Pivot Points
            pivot_data = self._calculate_pivot_points(high, low, close)
            for key, value in pivot_data.items():
                df[key] = value
            
            # Fibonacci retracement levels
            fib_data = self._calculate_fibonacci_levels(high, low, 20)
            for key, value in fib_data.items():
                df[key] = value
            
        except Exception as e:
            logger.error(f"Error adding support/resistance: {e}")
        
        return df
    
    def _hull_moving_average(self, data: np.ndarray, period: int) -> np.ndarray:
        """Calculate Hull Moving Average"""
        try:
            wma_half = talib.WMA(data, timeperiod=period//2)
            wma_full = talib.WMA(data, timeperiod=period)
            raw_hma = 2 * wma_half - wma_full
            hma = talib.WMA(raw_hma, timeperiod=int(np.sqrt(period)))
            return hma
        except:
            return np.full_like(data, np.nan)
    
    def _volume_price_trend(self, close: np.ndarray, volume: np.ndarray) -> np.ndarray:
        """Calculate Volume Price Trend"""
        try:
            price_change = np.diff(close, prepend=close[0])
            price_change_pct = price_change / close
            vpt = np.cumsum(volume * price_change_pct)
            return vpt
        except:
            return np.full_like(close, np.nan)
    
    def _chaikin_money_flow(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, volume: np.ndarray, period: int) -> np.ndarray:
        """Calculate Chaikin Money Flow"""
        try:
            mfv = ((close - low) - (high - close)) / (high - low) * volume
            mfv = np.where(high == low, 0, mfv)  # Handle division by zero
            cmf = pd.Series(mfv).rolling(period).sum() / pd.Series(volume).rolling(period).sum()
            return cmf.values
        except:
            return np.full_like(close, np.nan)
    
    def _vwap(self, high: np.ndarray, low: np.ndarray, close: np.ndarray, volume: np.ndarray) -> np.ndarray:
        """Calculate Volume Weighted Average Price"""
        try:
            typical_price = (high + low + close) / 3
            vwap = np.cumsum(typical_price * volume) / np.cumsum(volume)
            return vwap
        except:
            return np.full_like(close, np.nan)
    
    def _calculate_trend_strength(self, close: np.ndarray) -> np.ndarray:
        """Calculate trend strength"""
        try:
            # Use linear regression slope as trend strength
            trend_strength = np.full_like(close, np.nan)
            
            for i in range(20, len(close)):
                y = close[i-20:i]
                x = np.arange(len(y))
                slope, _, r_value, _, _ = stats.linregress(x, y)
                trend_strength[i] = slope * r_value ** 2  # Slope weighted by R-squared
            
            return trend_strength
        except:
            return np.full_like(close, np.nan)
    
    def _calculate_pivot_points(self, high: np.ndarray, low: np.ndarray, close: np.ndarray) -> Dict[str, np.ndarray]:
        """Calculate pivot points"""
        try:
            # Use previous day's data for pivot calculation
            prev_high = np.roll(high, 1)
            prev_low = np.roll(low, 1)
            prev_close = np.roll(close, 1)
            
            pivot = (prev_high + prev_low + prev_close) / 3
            
            # Support and resistance levels
            r1 = 2 * pivot - prev_low
            s1 = 2 * pivot - prev_high
            r2 = pivot + (prev_high - prev_low)
            s2 = pivot - (prev_high - prev_low)
            r3 = prev_high + 2 * (pivot - prev_low)
            s3 = prev_low - 2 * (prev_high - pivot)
            
            return {
                'pivot': pivot,
                'resistance_1': r1,
                'support_1': s1,
                'resistance_2': r2,
                'support_2': s2,
                'resistance_3': r3,
                'support_3': s3
            }
        except:
            return {key: np.full_like(close, np.nan) for key in 
                   ['pivot', 'resistance_1', 'support_1', 'resistance_2', 'support_2', 'resistance_3', 'support_3']}
    
    def _calculate_fibonacci_levels(self, high: np.ndarray, low: np.ndarray, period: int) -> Dict[str, np.ndarray]:
        """Calculate Fibonacci retracement levels"""
        try:
            # Calculate rolling high and low
            rolling_high = pd.Series(high).rolling(period).max().values
            rolling_low = pd.Series(low).rolling(period).min().values
            
            diff = rolling_high - rolling_low
            
            # Fibonacci levels
            fib_levels = {
                'fib_0': rolling_high,
                'fib_236': rolling_high - 0.236 * diff,
                'fib_382': rolling_high - 0.382 * diff,
                'fib_500': rolling_high - 0.500 * diff,
                'fib_618': rolling_high - 0.618 * diff,
                'fib_786': rolling_high - 0.786 * diff,
                'fib_100': rolling_low
            }
            
            return fib_levels
        except:
            return {key: np.full_like(high, np.nan) for key in 
                   ['fib_0', 'fib_236', 'fib_382', 'fib_500', 'fib_618', 'fib_786', 'fib_100']}
    
    def get_signal_summary(self, df: pd.DataFrame) -> Dict:
        """Get summary of all technical signals"""
        if len(df) == 0:
            return {}
        
        latest = df.iloc[-1]
        signals = {
            'bullish_signals': 0,
            'bearish_signals': 0,
            'neutral_signals': 0,
            'signal_details': []
        }
        
        # RSI signals
        if latest.get('rsi', 50) < 30:
            signals['bullish_signals'] += 1
            signals['signal_details'].append({'indicator': 'RSI', 'signal': 'oversold', 'strength': 0.7})
        elif latest.get('rsi', 50) > 70:
            signals['bearish_signals'] += 1
            signals['signal_details'].append({'indicator': 'RSI', 'signal': 'overbought', 'strength': 0.7})
        
        # MACD signals
        if latest.get('macd_bullish_cross', False):
            signals['bullish_signals'] += 1
            signals['signal_details'].append({'indicator': 'MACD', 'signal': 'bullish_crossover', 'strength': 0.6})
        elif latest.get('macd_bearish_cross', False):
            signals['bearish_signals'] += 1
            signals['signal_details'].append({'indicator': 'MACD', 'signal': 'bearish_crossover', 'strength': 0.6})
        
        # Moving average signals
        price = latest.get('close', 0)
        sma_20 = latest.get('sma_20', 0)
        sma_50 = latest.get('sma_50', 0)
        
        if price > sma_20 > sma_50:
            signals['bullish_signals'] += 1
            signals['signal_details'].append({'indicator': 'MA', 'signal': 'bullish_alignment', 'strength': 0.5})
        elif price < sma_20 < sma_50:
            signals['bearish_signals'] += 1
            signals['signal_details'].append({'indicator': 'MA', 'signal': 'bearish_alignment', 'strength': 0.5})
        
        # Bollinger Band signals
        bb_position = latest.get('bb_position', 0.5)
        if bb_position < 0.1:
            signals['bullish_signals'] += 1
            signals['signal_details'].append({'indicator': 'BB', 'signal': 'oversold', 'strength': 0.4})
        elif bb_position > 0.9:
            signals['bearish_signals'] += 1
            signals['signal_details'].append({'indicator': 'BB', 'signal': 'overbought', 'strength': 0.4})
        
        # Volume signals
        volume_ratio = latest.get('volume_ratio', 1)
        if volume_ratio > 2:
            signals['bullish_signals'] += 1
            signals['signal_details'].append({'indicator': 'Volume', 'signal': 'high_volume', 'strength': 0.3})
        
        # Calculate overall signal
        total_signals = signals['bullish_signals'] + signals['bearish_signals']
        if total_signals > 0:
            signal_ratio = (signals['bullish_signals'] - signals['bearish_signals']) / total_signals
            
            if signal_ratio > 0.3:
                signals['overall_signal'] = 'bullish'
            elif signal_ratio < -0.3:
                signals['overall_signal'] = 'bearish'
            else:
                signals['overall_signal'] = 'neutral'
        else:
            signals['overall_signal'] = 'neutral'
        
        signals['signal_strength'] = abs(signal_ratio) if total_signals > 0 else 0
        
        return signals
    
    def detect_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect chart patterns"""
        patterns = []
        
        if len(df) < 50:
            return patterns
        
        try:
            high = df['high'].values
            low = df['low'].values
            close = df['close'].values
            
            # Candlestick patterns using TA-Lib
            pattern_functions = {
                'doji': talib.CDLDOJI,
                'hammer': talib.CDLHAMMER,
                'hanging_man': talib.CDLHANGINGMAN,
                'shooting_star': talib.CDLSHOOTINGSTAR,
                'engulfing_bullish': talib.CDLENGULFING,
                'morning_star': talib.CDLMORNINGSTAR,
                'evening_star': talib.CDLEVENINGSTAR,
                'three_white_soldiers': talib.CDL3WHITESOLDIERS,
                'three_black_crows': talib.CDL3BLACKCROWS
            }
            
            open_prices = df['open'].values
            
            for pattern_name, pattern_func in pattern_functions.items():
                try:
                    if pattern_name in ['engulfing_bullish']:
                        pattern_result = pattern_func(open_prices, high, low, close)
                    else:
                        pattern_result = pattern_func(open_prices, high, low, close)
                    
                    # Find recent patterns (last 10 periods)
                    recent_patterns = pattern_result[-10:]
                    for i, value in enumerate(recent_patterns):
                        if value != 0:
                            patterns.append({
                                'pattern': pattern_name,
                                'signal': 'bullish' if value > 0 else 'bearish',
                                'strength': abs(value) / 100,
                                'periods_ago': len(recent_patterns) - i - 1
                            })
                except Exception as e:
                    logger.debug(f"Error detecting pattern {pattern_name}: {e}")
            
        except Exception as e:
            logger.error(f"Error detecting patterns: {e}")
        
        return patterns