// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./PortfolioTracker.sol";

/**
 * @title AdvancedAnalytics
 * @dev Provides comprehensive analytics and reporting for the DefiBrain platform
 * @notice Tracks performance metrics, risk analytics, and portfolio insights
 */
contract AdvancedAnalytics is Ownable, ReentrancyGuard {
    
    // Structs
    struct PerformanceMetrics {
        uint256 totalReturn;
        uint256 sharpeRatio;
        uint256 maxDrawdown;
        uint256 volatility;
        uint256 alpha;
        uint256 beta;
        uint256 lastUpdated;
    }
    
    struct RiskMetrics {
        uint256 valueAtRisk; // VaR at 95% confidence
        uint256 conditionalVaR; // Expected shortfall
        uint256 correlationScore;
        uint256 concentrationRisk;
        uint256 liquidityRisk;
        uint256 lastCalculated;
    }
    
    struct PortfolioSnapshot {
        uint256 totalValue;
        uint256 timestamp;
        mapping(address => uint256) assetAllocations;
        uint256 riskScore;
    }
    
    struct TradingSignal {
        address asset;
        uint8 signalType; // 0: buy, 1: sell, 2: hold
        uint256 confidence; // 0-10000 (0-100%)
        uint256 targetPrice;
        uint256 timestamp;
        bool active;
    }
    
    // State variables
    PriceOracle public priceOracle;
    PortfolioTracker public portfolioTracker;
    
    // Analytics data
    mapping(address => PerformanceMetrics) public userPerformance;
    mapping(address => RiskMetrics) public userRiskMetrics;
    mapping(address => mapping(uint256 => PortfolioSnapshot)) public portfolioHistory;
    mapping(address => uint256) public portfolioSnapshotCount;
    
    // Trading signals
    mapping(uint256 => TradingSignal) public tradingSignals;
    uint256 public signalCounter;
    
    // Analytics parameters
    uint256 public constant RISK_FREE_RATE = 200; // 2% annual
    uint256 public constant CONFIDENCE_LEVEL = 9500; // 95%
    uint256 public snapshotInterval = 1 days;
    
    // Events
    event PerformanceUpdated(address indexed user, uint256 totalReturn, uint256 sharpeRatio);
    event RiskMetricsCalculated(address indexed user, uint256 valueAtRisk, uint256 riskScore);
    event PortfolioSnapshotTaken(address indexed user, uint256 totalValue, uint256 timestamp);
    event TradingSignalGenerated(uint256 indexed signalId, address indexed asset, uint8 signalType, uint256 confidence);
    event AnalyticsParametersUpdated(uint256 snapshotInterval);
    
    constructor(
        address _priceOracle,
        address _portfolioTracker
    ) Ownable(msg.sender) {
        require(_priceOracle != address(0), "Invalid price oracle");
        require(_portfolioTracker != address(0), "Invalid portfolio tracker");
        
        priceOracle = PriceOracle(_priceOracle);
        portfolioTracker = PortfolioTracker(_portfolioTracker);
    }
    
    /**
     * @dev Calculate and update performance metrics for a user
     * @param user The user address
     * @param userReturns Array of historical returns
     * @param benchmarkReturns Array of benchmark returns for beta calculation
     */
    function updatePerformanceMetrics(
        address user,
        int256[] calldata userReturns,
        int256[] calldata benchmarkReturns
    ) external onlyOwner {
        require(userReturns.length > 0, "No returns data");
        require(userReturns.length == benchmarkReturns.length, "Mismatched data length");
        
        PerformanceMetrics storage metrics = userPerformance[user];
        
        // Calculate total return
        int256 totalReturn = 0;
        for (uint256 i = 0; i < userReturns.length; i++) {
            totalReturn += userReturns[i];
        }
        metrics.totalReturn = totalReturn >= 0 ? uint256(totalReturn) : 0;
        
        // Calculate volatility (standard deviation)
        metrics.volatility = _calculateVolatility(userReturns);
        
        // Calculate Sharpe ratio
        if (metrics.volatility > 0) {
            uint256 excessReturn = metrics.totalReturn > RISK_FREE_RATE ? 
                metrics.totalReturn - RISK_FREE_RATE : 0;
            metrics.sharpeRatio = (excessReturn * 10000) / metrics.volatility;
        }
        
        // Calculate max drawdown
        metrics.maxDrawdown = _calculateMaxDrawdown(userReturns);
        
        // Calculate beta
        metrics.beta = _calculateBeta(userReturns, benchmarkReturns);
        
        // Calculate alpha
        uint256 expectedReturn = RISK_FREE_RATE + (metrics.beta * (800 - RISK_FREE_RATE) / 10000); // Assuming 8% market return
        metrics.alpha = metrics.totalReturn > expectedReturn ? 
            metrics.totalReturn - expectedReturn : 0;
        
        metrics.lastUpdated = block.timestamp;
        
        emit PerformanceUpdated(user, metrics.totalReturn, metrics.sharpeRatio);
    }
    
    /**
     * @dev Calculate risk metrics for a user
     * @param user The user address
     * @param portfolioValues Array of historical portfolio values
     * @param assetCorrelations Correlation matrix for portfolio assets
     */
    function calculateRiskMetrics(
        address user,
        uint256[] calldata portfolioValues,
        uint256[] calldata assetCorrelations
    ) external onlyOwner {
        require(portfolioValues.length > 0, "No portfolio data");
        
        RiskMetrics storage risk = userRiskMetrics[user];
        
        // Calculate Value at Risk (VaR)
        risk.valueAtRisk = _calculateVaR(portfolioValues);
        
        // Calculate Conditional VaR (Expected Shortfall)
        risk.conditionalVaR = _calculateCVaR(portfolioValues);
        
        // Calculate correlation score
        risk.correlationScore = _calculateCorrelationScore(assetCorrelations);
        
        // Calculate concentration risk (Herfindahl index)
        risk.concentrationRisk = _calculateConcentrationRisk(user);
        
        // Calculate liquidity risk
        risk.liquidityRisk = _calculateLiquidityRisk(user);
        
        risk.lastCalculated = block.timestamp;
        
        uint256 overallRiskScore = (risk.valueAtRisk + risk.concentrationRisk + risk.liquidityRisk) / 3;
        
        emit RiskMetricsCalculated(user, risk.valueAtRisk, overallRiskScore);
    }
    
    /**
     * @dev Take a portfolio snapshot for historical tracking
     * @param user The user address
     */
    function takePortfolioSnapshot(address user) external {
        require(
            block.timestamp >= getLastSnapshotTime(user) + snapshotInterval,
            "Snapshot interval not reached"
        );
        
        uint256 snapshotId = portfolioSnapshotCount[user];
        PortfolioSnapshot storage snapshot = portfolioHistory[user][snapshotId];
        
        // Get current portfolio value from portfolio tracker
        (, uint256 totalValueUSD,) = portfolioTracker.getPortfolio(user);
        snapshot.totalValue = totalValueUSD;
        snapshot.timestamp = block.timestamp;
        
        // Calculate risk score
        RiskMetrics memory risk = userRiskMetrics[user];
        snapshot.riskScore = (risk.valueAtRisk + risk.concentrationRisk + risk.liquidityRisk) / 3;
        
        portfolioSnapshotCount[user]++;
        
        emit PortfolioSnapshotTaken(user, snapshot.totalValue, block.timestamp);
    }
    
    /**
     * @dev Generate trading signal based on analytics
     * @param asset The asset address
     * @param signalType Signal type (0: buy, 1: sell, 2: hold)
     * @param confidence Confidence level (0-10000)
     * @param targetPrice Target price for the signal
     */
    function generateTradingSignal(
        address asset,
        uint8 signalType,
        uint256 confidence,
        uint256 targetPrice
    ) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(signalType <= 2, "Invalid signal type");
        require(confidence <= 10000, "Invalid confidence level");
        
        uint256 signalId = signalCounter++;
        TradingSignal storage signal = tradingSignals[signalId];
        
        signal.asset = asset;
        signal.signalType = signalType;
        signal.confidence = confidence;
        signal.targetPrice = targetPrice;
        signal.timestamp = block.timestamp;
        signal.active = true;
        
        emit TradingSignalGenerated(signalId, asset, signalType, confidence);
    }
    
    /**
     * @dev Get performance metrics for a user
     * @param user The user address
     * @return Performance metrics struct
     */
    function getPerformanceMetrics(address user) external view returns (PerformanceMetrics memory) {
        return userPerformance[user];
    }
    
    /**
     * @dev Get risk metrics for a user
     * @param user The user address
     * @return Risk metrics struct
     */
    function getRiskMetrics(address user) external view returns (RiskMetrics memory) {
        return userRiskMetrics[user];
    }
    
    /**
     * @dev Get portfolio snapshot by ID
     * @param user The user address
     * @param snapshotId The snapshot ID
     * @return totalValue Total portfolio value
     * @return timestamp Snapshot timestamp
     * @return riskScore Risk score at snapshot time
     */
    function getPortfolioSnapshot(address user, uint256 snapshotId) 
        external 
        view 
        returns (uint256 totalValue, uint256 timestamp, uint256 riskScore) 
    {
        PortfolioSnapshot storage snapshot = portfolioHistory[user][snapshotId];
        return (snapshot.totalValue, snapshot.timestamp, snapshot.riskScore);
    }
    
    /**
     * @dev Get active trading signals
     * @param asset The asset address (address(0) for all assets)
     * @return signalIds Array of active signal IDs
     */
    function getActiveTradingSignals(address asset) external view returns (uint256[] memory signalIds) {
        uint256 count = 0;
        
        // Count active signals
        for (uint256 i = 0; i < signalCounter; i++) {
            if (tradingSignals[i].active && 
                (asset == address(0) || tradingSignals[i].asset == asset)) {
                count++;
            }
        }
        
        // Populate array
        signalIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < signalCounter; i++) {
            if (tradingSignals[i].active && 
                (asset == address(0) || tradingSignals[i].asset == asset)) {
                signalIds[index] = i;
                index++;
            }
        }
    }
    
    /**
     * @dev Get last snapshot time for a user
     * @param user The user address
     * @return Last snapshot timestamp
     */
    function getLastSnapshotTime(address user) public view returns (uint256) {
        uint256 count = portfolioSnapshotCount[user];
        if (count == 0) return 0;
        return portfolioHistory[user][count - 1].timestamp;
    }
    
    /**
     * @dev Update analytics parameters
     * @param _snapshotInterval New snapshot interval
     */
    function updateAnalyticsParameters(uint256 _snapshotInterval) external onlyOwner {
        require(_snapshotInterval >= 1 hours, "Interval too short");
        snapshotInterval = _snapshotInterval;
        emit AnalyticsParametersUpdated(_snapshotInterval);
    }
    
    /**
     * @dev Deactivate a trading signal
     * @param signalId The signal ID to deactivate
     */
    function deactivateTradingSignal(uint256 signalId) external onlyOwner {
        require(signalId < signalCounter, "Invalid signal ID");
        tradingSignals[signalId].active = false;
    }
    
    // Internal calculation functions
    
    function _calculateVolatility(int256[] calldata returnValues) internal pure returns (uint256) {
        if (returnValues.length < 2) return 0;
        
        // Calculate mean
        int256 sum = 0;
        for (uint256 i = 0; i < returnValues.length; i++) {
            sum += returnValues[i];
        }
        int256 mean = sum / int256(returnValues.length);
        
        // Calculate variance
        uint256 variance = 0;
        for (uint256 i = 0; i < returnValues.length; i++) {
            int256 diff = returnValues[i] - mean;
            variance += uint256(diff * diff);
        }
        variance = variance / returnValues.length;
        
        // Return square root approximation
        return _sqrt(variance);
    }
    
    function _calculateMaxDrawdown(int256[] calldata returnValues) internal pure returns (uint256) {
        if (returnValues.length == 0) return 0;
        
        int256 peak = 0;
        int256 maxDrawdown = 0;
        int256 cumulative = 0;
        
        for (uint256 i = 0; i < returnValues.length; i++) {
            cumulative += returnValues[i];
            if (cumulative > peak) {
                peak = cumulative;
            }
            int256 drawdown = peak - cumulative;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown >= 0 ? uint256(maxDrawdown) : 0;
    }
    
    function _calculateBeta(int256[] calldata returnValues, int256[] calldata benchmarkReturns) 
        internal 
        pure 
        returns (uint256) 
    {
        if (returnValues.length < 2) return 10000; // Beta of 1.0
        
        // Calculate covariance and variance
        int256 sumReturns = 0;
        int256 sumBenchmark = 0;
        
        for (uint256 i = 0; i < returnValues.length; i++) {
            sumReturns += returnValues[i];
            sumBenchmark += benchmarkReturns[i];
        }
        
        int256 meanReturns = sumReturns / int256(returnValues.length);
        int256 meanBenchmark = sumBenchmark / int256(returnValues.length);
        
        int256 covariance = 0;
        int256 variance = 0;
        
        for (uint256 i = 0; i < returnValues.length; i++) {
            int256 diffReturns = returnValues[i] - meanReturns;
            int256 diffBenchmark = benchmarkReturns[i] - meanBenchmark;
            covariance += diffReturns * diffBenchmark;
            variance += diffBenchmark * diffBenchmark;
        }
        
        if (variance == 0) return 10000; // Beta of 1.0
        
        int256 beta = (covariance * 10000) / variance;
        return beta >= 0 ? uint256(beta) : 0;
    }
    
    function _calculateVaR(uint256[] calldata portfolioValues) internal pure returns (uint256) {
        if (portfolioValues.length < 20) return 0; // Need sufficient data
        
        // Simple VaR calculation using 5th percentile
        uint256[] memory sortedValues = new uint256[](portfolioValues.length);
        for (uint256 i = 0; i < portfolioValues.length; i++) {
            sortedValues[i] = portfolioValues[i];
        }
        
        // Simple bubble sort for small arrays
        for (uint256 i = 0; i < sortedValues.length - 1; i++) {
            for (uint256 j = 0; j < sortedValues.length - i - 1; j++) {
                if (sortedValues[j] > sortedValues[j + 1]) {
                    uint256 temp = sortedValues[j];
                    sortedValues[j] = sortedValues[j + 1];
                    sortedValues[j + 1] = temp;
                }
            }
        }
        
        uint256 percentileIndex = (sortedValues.length * 5) / 100; // 5th percentile
        uint256 currentValue = sortedValues[sortedValues.length - 1];
        uint256 varValue = sortedValues[percentileIndex];
        
        return currentValue > varValue ? currentValue - varValue : 0;
    }
    
    function _calculateCVaR(uint256[] calldata portfolioValues) internal pure returns (uint256) {
        // Simplified CVaR calculation
        uint256 varValue = _calculateVaR(portfolioValues);
        return (varValue * 120) / 100; // Approximate CVaR as 1.2 * VaR
    }
    
    function _calculateCorrelationScore(uint256[] calldata correlations) internal pure returns (uint256) {
        if (correlations.length == 0) return 0;
        
        uint256 sum = 0;
        for (uint256 i = 0; i < correlations.length; i++) {
            sum += correlations[i];
        }
        return sum / correlations.length;
    }
    
    function _calculateConcentrationRisk(address user) internal view returns (uint256) {
        // Simplified concentration risk calculation
        // In a real implementation, this would analyze asset allocation
        return 5000; // Placeholder: 50% concentration risk
    }
    
    function _calculateLiquidityRisk(address user) internal view returns (uint256) {
        // Simplified liquidity risk calculation
        // In a real implementation, this would analyze asset liquidity
        return 3000; // Placeholder: 30% liquidity risk
    }
    
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}