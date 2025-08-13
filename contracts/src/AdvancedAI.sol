// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PriceOracle.sol";
import "./PortfolioTracker.sol";
import "./AIOracle.sol";

/**
 * @title AdvancedAI
 * @dev Advanced AI features for predictive analytics, automated trading, and intelligent portfolio management
 * @author DefiBrain Team
 */
contract AdvancedAI is Ownable, ReentrancyGuard {
    // AI Model types
    enum ModelType {
        PRICE_PREDICTION,
        RISK_ASSESSMENT,
        PORTFOLIO_OPTIMIZATION,
        SENTIMENT_ANALYSIS,
        MARKET_REGIME_DETECTION,
        YIELD_FORECASTING,
        LIQUIDITY_PREDICTION
    }
    
    // AI Model structure
    struct AIModel {
        uint256 id;
        string name;
        ModelType modelType;
        address creator;
        string ipfsHash;
        uint256 accuracy;
        uint256 trainingDataSize;
        uint256 lastUpdated;
        bool isActive;
        uint256 usageCount;
        uint256 reputationScore;
    }
    
    // Prediction structure
    struct Prediction {
        uint256 modelId;
        address asset;
        uint256 predictedPrice;
        uint256 confidence;
        uint256 timeHorizon;
        uint256 timestamp;
        bool isResolved;
        uint256 actualPrice;
        uint256 accuracy;
    }
    
    // Trading Signal
    struct TradingSignal {
        address asset;
        uint8 signal; // 0: SELL, 1: HOLD, 2: BUY
        uint256 strength; // 0-100
        uint256 confidence;
        string reasoning;
        uint256 timestamp;
        uint256 expiryTime;
        bool isActive;
    }
    
    // Portfolio Recommendation
    struct PortfolioRecommendation {
        address user;
        address[] assets;
        uint256[] allocations; // percentages (sum = 100)
        uint256 expectedReturn;
        uint256 riskScore;
        string strategy;
        uint256 timestamp;
        bool isImplemented;
    }
    
    // Market Regime
    enum MarketRegime {
        BULL_MARKET,
        BEAR_MARKET,
        SIDEWAYS,
        HIGH_VOLATILITY,
        LOW_VOLATILITY,
        CRISIS
    }
    
    // Market Analysis
    struct MarketAnalysis {
        MarketRegime currentRegime;
        uint256 confidence;
        uint256 volatilityIndex;
        uint256 sentimentScore;
        uint256 liquidityIndex;
        string analysis;
        uint256 timestamp;
    }
    
    // State variables
    mapping(uint256 => AIModel) public aiModels;
    mapping(uint256 => Prediction) public predictions;
    mapping(address => TradingSignal[]) public tradingSignals;
    mapping(address => PortfolioRecommendation[]) public portfolioRecommendations;
    mapping(address => bool) public authorizedAIProviders;
    mapping(address => uint256) public aiProviderReputations;
    
    uint256 public modelCount;
    uint256 public predictionCount;
    MarketAnalysis public currentMarketAnalysis;
    
    // External contracts
    PriceOracle public priceOracle;
    PortfolioTracker public portfolioTracker;
    AIOracle public aiOracle;
    
    // Configuration
    uint256 public minimumAccuracy = 70; // 70%
    uint256 public minimumConfidence = 60; // 60%
    uint256 public maxPredictionHorizon = 30 days;
    uint256 public reputationThreshold = 80;
    
    // Events
    event AIModelRegistered(
        uint256 indexed modelId,
        string name,
        ModelType modelType,
        address indexed creator
    );
    
    event PredictionMade(
        uint256 indexed predictionId,
        uint256 indexed modelId,
        address indexed asset,
        uint256 predictedPrice,
        uint256 confidence
    );
    
    event TradingSignalGenerated(
        address indexed asset,
        uint8 signal,
        uint256 strength,
        uint256 confidence
    );
    
    event PortfolioRecommendationCreated(
        address indexed user,
        address[] assets,
        uint256[] allocations,
        uint256 expectedReturn
    );
    
    event MarketRegimeUpdated(
        MarketRegime newRegime,
        uint256 confidence,
        uint256 timestamp
    );
    
    event AIProviderAuthorized(address indexed provider, bool authorized);
    
    constructor(
        address _priceOracle,
        address _portfolioTracker,
        address _aiOracle
    ) Ownable(msg.sender) {
        priceOracle = PriceOracle(_priceOracle);
        portfolioTracker = PortfolioTracker(_portfolioTracker);
        aiOracle = AIOracle(_aiOracle);
    }
    
    /**
     * @dev Register a new AI model
     */
    function registerAIModel(
        string memory name,
        ModelType modelType,
        string memory ipfsHash,
        uint256 accuracy,
        uint256 trainingDataSize
    ) external returns (uint256) {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        require(accuracy >= minimumAccuracy, "Accuracy below minimum threshold");
        require(bytes(name).length > 0, "Model name required");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        uint256 modelId = ++modelCount;
        
        aiModels[modelId] = AIModel({
            id: modelId,
            name: name,
            modelType: modelType,
            creator: msg.sender,
            ipfsHash: ipfsHash,
            accuracy: accuracy,
            trainingDataSize: trainingDataSize,
            lastUpdated: block.timestamp,
            isActive: true,
            usageCount: 0,
            reputationScore: 50 // Starting reputation
        });
        
        emit AIModelRegistered(modelId, name, modelType, msg.sender);
        
        return modelId;
    }
    
    /**
     * @dev Make a prediction using an AI model
     */
    function makePrediction(
        uint256 modelId,
        address asset,
        uint256 predictedPrice,
        uint256 confidence,
        uint256 timeHorizon
    ) external returns (uint256) {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        require(aiModels[modelId].isActive, "Model not active");
        require(aiModels[modelId].creator == msg.sender, "Not model creator");
        require(confidence >= minimumConfidence, "Confidence below threshold");
        require(timeHorizon <= maxPredictionHorizon, "Time horizon too long");
        
        uint256 predictionId = ++predictionCount;
        
        predictions[predictionId] = Prediction({
            modelId: modelId,
            asset: asset,
            predictedPrice: predictedPrice,
            confidence: confidence,
            timeHorizon: timeHorizon,
            timestamp: block.timestamp,
            isResolved: false,
            actualPrice: 0,
            accuracy: 0
        });
        
        // Update model usage
        aiModels[modelId].usageCount++;
        
        emit PredictionMade(predictionId, modelId, asset, predictedPrice, confidence);
        
        return predictionId;
    }
    
    /**
     * @dev Resolve a prediction and update model accuracy
     */
    function resolvePrediction(uint256 predictionId) external {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        
        Prediction storage prediction = predictions[predictionId];
        require(!prediction.isResolved, "Prediction already resolved");
        require(
            block.timestamp >= prediction.timestamp + prediction.timeHorizon,
            "Prediction period not ended"
        );
        
        // Get actual price from oracle
        (uint256 actualPrice, ) = priceOracle.getPrice(prediction.asset);
        prediction.actualPrice = actualPrice;
        
        // Calculate accuracy
        uint256 priceDiff = actualPrice > prediction.predictedPrice
            ? actualPrice - prediction.predictedPrice
            : prediction.predictedPrice - actualPrice;
        
        uint256 accuracy = 100 - (priceDiff * 100) / prediction.predictedPrice;
        if (accuracy > 100) accuracy = 0; // Cap at 0 for very bad predictions
        
        prediction.accuracy = accuracy;
        prediction.isResolved = true;
        
        // Update model reputation
        _updateModelReputation(prediction.modelId, accuracy);
    }
    
    /**
     * @dev Generate trading signal based on AI analysis
     */
    function generateTradingSignal(
        address asset,
        uint8 signal,
        uint256 strength,
        uint256 confidence,
        string memory reasoning,
        uint256 expiryTime
    ) external {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        require(signal <= 2, "Invalid signal type");
        require(strength <= 100, "Invalid strength");
        require(confidence >= minimumConfidence, "Confidence below threshold");
        require(expiryTime > block.timestamp, "Invalid expiry time");
        
        tradingSignals[asset].push(TradingSignal({
            asset: asset,
            signal: signal,
            strength: strength,
            confidence: confidence,
            reasoning: reasoning,
            timestamp: block.timestamp,
            expiryTime: expiryTime,
            isActive: true
        }));
        
        emit TradingSignalGenerated(asset, signal, strength, confidence);
    }
    
    /**
     * @dev Create portfolio recommendation
     */
    function createPortfolioRecommendation(
        address user,
        address[] memory assets,
        uint256[] memory allocations,
        uint256 expectedReturn,
        uint256 riskScore,
        string memory strategy
    ) external {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        require(assets.length == allocations.length, "Arrays length mismatch");
        require(_sumAllocations(allocations) == 100, "Allocations must sum to 100");
        
        portfolioRecommendations[user].push(PortfolioRecommendation({
            user: user,
            assets: assets,
            allocations: allocations,
            expectedReturn: expectedReturn,
            riskScore: riskScore,
            strategy: strategy,
            timestamp: block.timestamp,
            isImplemented: false
        }));
        
        emit PortfolioRecommendationCreated(user, assets, allocations, expectedReturn);
    }
    
    /**
     * @dev Update market regime analysis
     */
    function updateMarketAnalysis(
        MarketRegime regime,
        uint256 confidence,
        uint256 volatilityIndex,
        uint256 sentimentScore,
        uint256 liquidityIndex,
        string memory analysis
    ) external {
        require(authorizedAIProviders[msg.sender], "Not authorized AI provider");
        require(confidence >= minimumConfidence, "Confidence below threshold");
        
        currentMarketAnalysis = MarketAnalysis({
            currentRegime: regime,
            confidence: confidence,
            volatilityIndex: volatilityIndex,
            sentimentScore: sentimentScore,
            liquidityIndex: liquidityIndex,
            analysis: analysis,
            timestamp: block.timestamp
        });
        
        emit MarketRegimeUpdated(regime, confidence, block.timestamp);
    }
    
    /**
     * @dev Get active trading signals for an asset
     */
    function getActiveTradingSignals(address asset)
        external
        view
        returns (TradingSignal[] memory)
    {
        TradingSignal[] memory allSignals = tradingSignals[asset];
        uint256 activeCount = 0;
        
        // Count active signals
        for (uint256 i = 0; i < allSignals.length; i++) {
            if (allSignals[i].isActive && allSignals[i].expiryTime > block.timestamp) {
                activeCount++;
            }
        }
        
        // Create array of active signals
        TradingSignal[] memory activeSignals = new TradingSignal[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allSignals.length; i++) {
            if (allSignals[i].isActive && allSignals[i].expiryTime > block.timestamp) {
                activeSignals[index] = allSignals[i];
                index++;
            }
        }
        
        return activeSignals;
    }
    
    /**
     * @dev Get portfolio recommendations for a user
     */
    function getPortfolioRecommendations(address user)
        external
        view
        returns (PortfolioRecommendation[] memory)
    {
        return portfolioRecommendations[user];
    }
    
    /**
     * @dev Get AI model information
     */
    function getAIModel(uint256 modelId)
        external
        view
        returns (AIModel memory)
    {
        return aiModels[modelId];
    }
    
    /**
     * @dev Get prediction information
     */
    function getPrediction(uint256 predictionId)
        external
        view
        returns (Prediction memory)
    {
        return predictions[predictionId];
    }
    
    /**
     * @dev Authorize AI provider
     */
    function authorizeAIProvider(address provider, bool authorized) external onlyOwner {
        authorizedAIProviders[provider] = authorized;
        emit AIProviderAuthorized(provider, authorized);
    }
    
    /**
     * @dev Update model reputation based on prediction accuracy
     */
    function _updateModelReputation(uint256 modelId, uint256 accuracy) internal {
        AIModel storage model = aiModels[modelId];
        
        // Weighted average of current reputation and new accuracy
        uint256 weight = model.usageCount > 10 ? 10 : model.usageCount;
        model.reputationScore = (model.reputationScore * (10 - weight) + accuracy * weight) / 10;
        
        // Deactivate model if reputation falls below threshold
        if (model.reputationScore < reputationThreshold) {
            model.isActive = false;
        }
    }
    
    /**
     * @dev Sum allocation percentages
     */
    function _sumAllocations(uint256[] memory allocations) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            sum += allocations[i];
        }
        return sum;
    }
    
    /**
     * @dev Update configuration parameters
     */
    function updateMinimumAccuracy(uint256 newMinimumAccuracy) external onlyOwner {
        minimumAccuracy = newMinimumAccuracy;
    }
    
    function updateMinimumConfidence(uint256 newMinimumConfidence) external onlyOwner {
        minimumConfidence = newMinimumConfidence;
    }
    
    function updateMaxPredictionHorizon(uint256 newMaxHorizon) external onlyOwner {
        maxPredictionHorizon = newMaxHorizon;
    }
    
    function updateReputationThreshold(uint256 newThreshold) external onlyOwner {
        reputationThreshold = newThreshold;
    }
    
    /**
     * @dev Emergency functions
     */
    function pauseModel(uint256 modelId) external onlyOwner {
        aiModels[modelId].isActive = false;
    }
    
    function unpauseModel(uint256 modelId) external onlyOwner {
        require(aiModels[modelId].reputationScore >= reputationThreshold, "Reputation too low");
        aiModels[modelId].isActive = true;
    }
}