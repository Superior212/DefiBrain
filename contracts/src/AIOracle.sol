// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PriceOracle.sol";

/**
 * @title AIOracle
 * @dev Advanced AI-powered oracle for market predictions, risk assessment, and trading signals
 */
contract AIOracle is Ownable, ReentrancyGuard, AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    struct MarketPrediction {
        address asset;
        uint256 predictedPrice;
        uint256 confidence; // 0-10000 (100.00%)
        uint256 timeframe; // seconds
        uint256 timestamp;
        address oracle;
        bool validated;
        uint256 actualPrice;
        uint256 accuracy;
    }

    struct RiskAssessment {
        address asset;
        uint256 volatilityScore; // 0-10000
        uint256 liquidityScore; // 0-10000
        uint256 marketCapScore; // 0-10000
        uint256 overallRisk; // 0-10000
        uint256 timestamp;
        address assessor;
    }

    struct TradingSignal {
        address asset;
        uint8 signalType; // 0=BUY, 1=SELL, 2=HOLD
        uint256 strength; // 0-10000
        uint256 targetPrice;
        uint256 stopLoss;
        uint256 timeframe;
        uint256 timestamp;
        address generator;
        bool executed;
    }

    struct AIModel {
        string name;
        string version;
        uint256 accuracy; // Historical accuracy 0-10000
        uint256 totalPredictions;
        uint256 correctPredictions;
        bool isActive;
        address deployer;
        uint256 createdAt;
    }

    // State variables
    mapping(uint256 => MarketPrediction) public predictions;
    mapping(uint256 => RiskAssessment) public riskAssessments;
    mapping(uint256 => TradingSignal) public tradingSignals;
    mapping(bytes32 => AIModel) public aiModels;
    mapping(address => uint256[]) public assetPredictions;
    mapping(address => uint256) public oracleReputation;
    
    PriceOracle public priceOracle;
    uint256 public nextPredictionId;
    uint256 public nextRiskId;
    uint256 public nextSignalId;
    uint256 public validationThreshold = 7500; // 75% confidence required
    uint256 public reputationDecay = 100; // 1% per failed prediction

    // Events
    event PredictionCreated(uint256 indexed predictionId, address indexed asset, uint256 predictedPrice, uint256 confidence);
    event PredictionValidated(uint256 indexed predictionId, uint256 actualPrice, uint256 accuracy);
    event RiskAssessmentCreated(uint256 indexed riskId, address indexed asset, uint256 overallRisk);
    event TradingSignalGenerated(uint256 indexed signalId, address indexed asset, uint8 signalType, uint256 strength);
    event AIModelRegistered(bytes32 indexed modelId, string name, address deployer);
    event OracleReputationUpdated(address indexed oracle, uint256 newReputation);

    modifier onlyOracle() {
        require(hasRole(ORACLE_ROLE, msg.sender), "Not authorized oracle");
        _;
    }

    modifier onlyValidator() {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Not authorized validator");
        _;
    }

    constructor(address _priceOracle) Ownable(msg.sender) {
        priceOracle = PriceOracle(_priceOracle);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        
        // Initialize reputation for deployer
        oracleReputation[msg.sender] = 10000; // 100% starting reputation
    }

    /**
     * @dev Create a market prediction
     */
    function createPrediction(
        address _asset,
        uint256 _predictedPrice,
        uint256 _confidence,
        uint256 _timeframe
    ) external onlyOracle returns (uint256) {
        require(_confidence <= 10000, "Confidence cannot exceed 100%");
        require(_timeframe > 0, "Timeframe must be positive");
        require(_predictedPrice > 0, "Predicted price must be positive");

        uint256 predictionId = nextPredictionId++;
        
        predictions[predictionId] = MarketPrediction({
            asset: _asset,
            predictedPrice: _predictedPrice,
            confidence: _confidence,
            timeframe: _timeframe,
            timestamp: block.timestamp,
            oracle: msg.sender,
            validated: false,
            actualPrice: 0,
            accuracy: 0
        });

        assetPredictions[_asset].push(predictionId);

        emit PredictionCreated(predictionId, _asset, _predictedPrice, _confidence);
        return predictionId;
    }

    /**
     * @dev Validate a prediction after timeframe expires
     */
    function validatePrediction(uint256 _predictionId) external onlyValidator {
        MarketPrediction storage prediction = predictions[_predictionId];
        require(!prediction.validated, "Prediction already validated");
        require(block.timestamp >= prediction.timestamp + prediction.timeframe, "Timeframe not expired");

        // Get actual price from oracle
        (uint256 actualPrice, ) = priceOracle.getPrice(prediction.asset);
        require(actualPrice > 0, "Cannot get actual price");

        prediction.actualPrice = actualPrice;
        prediction.validated = true;

        // Calculate accuracy
        uint256 priceDiff = prediction.predictedPrice > actualPrice 
            ? prediction.predictedPrice - actualPrice 
            : actualPrice - prediction.predictedPrice;
        
        uint256 accuracy = actualPrice > 0 
            ? 10000 - (priceDiff * 10000 / actualPrice)
            : 0;
        
        if (accuracy > 10000) accuracy = 0; // Cap at 0 for very bad predictions
        prediction.accuracy = accuracy;

        // Update oracle reputation
        _updateOracleReputation(prediction.oracle, accuracy);

        emit PredictionValidated(_predictionId, actualPrice, accuracy);
    }

    /**
     * @dev Create risk assessment for an asset
     */
    function createRiskAssessment(
        address _asset,
        uint256 _volatilityScore,
        uint256 _liquidityScore,
        uint256 _marketCapScore
    ) external onlyOracle returns (uint256) {
        require(_volatilityScore <= 10000, "Volatility score too high");
        require(_liquidityScore <= 10000, "Liquidity score too high");
        require(_marketCapScore <= 10000, "Market cap score too high");

        uint256 riskId = nextRiskId++;
        
        // Calculate overall risk (weighted average)
        uint256 overallRisk = (_volatilityScore * 40 + _liquidityScore * 30 + _marketCapScore * 30) / 100;
        
        riskAssessments[riskId] = RiskAssessment({
            asset: _asset,
            volatilityScore: _volatilityScore,
            liquidityScore: _liquidityScore,
            marketCapScore: _marketCapScore,
            overallRisk: overallRisk,
            timestamp: block.timestamp,
            assessor: msg.sender
        });

        emit RiskAssessmentCreated(riskId, _asset, overallRisk);
        return riskId;
    }

    /**
     * @dev Generate trading signal
     */
    function generateTradingSignal(
        address _asset,
        uint8 _signalType,
        uint256 _strength,
        uint256 _targetPrice,
        uint256 _stopLoss,
        uint256 _timeframe
    ) external onlyOracle returns (uint256) {
        require(_signalType <= 2, "Invalid signal type");
        require(_strength <= 10000, "Strength cannot exceed 100%");
        require(_timeframe > 0, "Timeframe must be positive");

        uint256 signalId = nextSignalId++;
        
        tradingSignals[signalId] = TradingSignal({
            asset: _asset,
            signalType: _signalType,
            strength: _strength,
            targetPrice: _targetPrice,
            stopLoss: _stopLoss,
            timeframe: _timeframe,
            timestamp: block.timestamp,
            generator: msg.sender,
            executed: false
        });

        emit TradingSignalGenerated(signalId, _asset, _signalType, _strength);
        return signalId;
    }

    /**
     * @dev Register a new AI model
     */
    function registerAIModel(
        string memory _name,
        string memory _version,
        address _deployer
    ) external onlyOwner returns (bytes32) {
        bytes32 modelId = keccak256(abi.encodePacked(_name, _version, _deployer));
        require(aiModels[modelId].deployer == address(0), "Model already registered");

        aiModels[modelId] = AIModel({
            name: _name,
            version: _version,
            accuracy: 5000, // Start with 50%
            totalPredictions: 0,
            correctPredictions: 0,
            isActive: true,
            deployer: _deployer,
            createdAt: block.timestamp
        });

        emit AIModelRegistered(modelId, _name, _deployer);
        return modelId;
    }

    /**
     * @dev Update oracle reputation based on prediction accuracy
     */
    function _updateOracleReputation(address _oracle, uint256 _accuracy) internal {
        uint256 currentReputation = oracleReputation[_oracle];
        
        if (_accuracy >= validationThreshold) {
            // Increase reputation for good predictions
            uint256 increase = (_accuracy - validationThreshold) / 10;
            oracleReputation[_oracle] = currentReputation + increase > 10000 
                ? 10000 
                : currentReputation + increase;
        } else {
            // Decrease reputation for poor predictions
            uint256 decrease = reputationDecay;
            oracleReputation[_oracle] = currentReputation > decrease 
                ? currentReputation - decrease 
                : 0;
        }

        emit OracleReputationUpdated(_oracle, oracleReputation[_oracle]);
    }

    /**
     * @dev Get predictions for an asset
     */
    function getAssetPredictions(address _asset) external view returns (uint256[] memory) {
        return assetPredictions[_asset];
    }

    /**
     * @dev Get oracle reputation
     */
    function getOracleReputation(address _oracle) external view returns (uint256) {
        return oracleReputation[_oracle];
    }

    /**
     * @dev Get latest risk assessment for asset
     */
    function getLatestRiskAssessment(address _asset) external view returns (RiskAssessment memory) {
        uint256 latestId = 0;
        uint256 latestTimestamp = 0;
        
        for (uint256 i = 0; i < nextRiskId; i++) {
            if (riskAssessments[i].asset == _asset && riskAssessments[i].timestamp > latestTimestamp) {
                latestId = i;
                latestTimestamp = riskAssessments[i].timestamp;
            }
        }
        
        return riskAssessments[latestId];
    }

    /**
     * @dev Set validation threshold
     */
    function setValidationThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 10000, "Threshold cannot exceed 100%");
        validationThreshold = _threshold;
    }

    /**
     * @dev Set reputation decay rate
     */
    function setReputationDecay(uint256 _decay) external onlyOwner {
        require(_decay <= 1000, "Decay cannot exceed 10%");
        reputationDecay = _decay;
    }

    /**
     * @dev Grant oracle role
     */
    function grantOracleRole(address _oracle) external onlyOwner {
        _grantRole(ORACLE_ROLE, _oracle);
        if (oracleReputation[_oracle] == 0) {
            oracleReputation[_oracle] = 5000; // 50% starting reputation
        }
    }

    /**
     * @dev Revoke oracle role
     */
    function revokeOracleRole(address _oracle) external onlyOwner {
        _revokeRole(ORACLE_ROLE, _oracle);
    }

    /**
     * @dev Grant validator role
     */
    function grantValidatorRole(address _validator) external onlyOwner {
        _grantRole(VALIDATOR_ROLE, _validator);
    }

    /**
     * @dev Revoke validator role
     */
    function revokeValidatorRole(address _validator) external onlyOwner {
        _revokeRole(VALIDATOR_ROLE, _validator);
    }
}