// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PriceOracle.sol";

/**
 * @title CrossChainBridge
 * @dev Cross-chain bridge adapters for DefiBrain platform
 * @notice Enables asset transfers and strategy execution across multiple chains
 */
contract CrossChainBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Structs
    struct ChainConfig {
        uint256 chainId;
        string name;
        address bridgeContract;
        uint256 minTransferAmount;
        uint256 maxTransferAmount;
        uint256 transferFee; // in basis points
        bool active;
    }
    
    struct BridgeRequest {
        address user;
        address token;
        uint256 amount;
        uint256 sourceChain;
        uint256 destinationChain;
        address destinationAddress;
        uint256 timestamp;
        uint256 nonce;
        BridgeStatus status;
        bytes32 txHash;
    }
    
    struct CrossChainStrategy {
        uint256 strategyId;
        string name;
        uint256[] supportedChains;
        address[] requiredTokens;
        uint256 minInvestment;
        uint256 expectedAPY;
        bool active;
    }
    
    enum BridgeStatus {
        PENDING,
        CONFIRMED,
        COMPLETED,
        FAILED,
        CANCELLED
    }
    
    // State variables
    PriceOracle public priceOracle;
    
    // Chain configurations
    mapping(uint256 => ChainConfig) public chainConfigs;
    uint256[] public supportedChains;
    
    // Bridge requests
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => bytes32[]) public userBridgeRequests;
    uint256 public requestNonce;
    
    // Cross-chain strategies
    mapping(uint256 => CrossChainStrategy) public crossChainStrategies;
    uint256 public strategyCounter;
    
    // Token mappings across chains
    mapping(uint256 => mapping(address => address)) public tokenMappings; // chainId => sourceToken => destinationToken
    
    // Bridge operators
    mapping(address => bool) public bridgeOperators;
    
    // Fee collection
    mapping(address => uint256) public collectedFees;
    
    // Constants
    uint256 public constant MAX_TRANSFER_FEE = 1000; // 10% max fee
    uint256 public constant BRIDGE_TIMEOUT = 24 hours;
    
    // Events
    event ChainAdded(uint256 indexed chainId, string name, address bridgeContract);
    event ChainUpdated(uint256 indexed chainId, bool active);
    event BridgeRequestCreated(bytes32 indexed requestId, address indexed user, uint256 amount, uint256 sourceChain, uint256 destinationChain);
    event BridgeRequestCompleted(bytes32 indexed requestId, bytes32 txHash);
    event BridgeRequestFailed(bytes32 indexed requestId, string reason);
    event CrossChainStrategyCreated(uint256 indexed strategyId, string name, uint256[] supportedChains);
    event TokenMappingAdded(uint256 indexed chainId, address sourceToken, address destinationToken);
    event BridgeOperatorAdded(address indexed operator);
    event BridgeOperatorRemoved(address indexed operator);
    event FeesCollected(address indexed token, uint256 amount);
    
    modifier onlyBridgeOperator() {
        require(bridgeOperators[msg.sender], "Not a bridge operator");
        _;
    }
    
    constructor(address _priceOracle) Ownable(msg.sender) {
        require(_priceOracle != address(0), "Invalid price oracle");
        priceOracle = PriceOracle(_priceOracle);
        bridgeOperators[msg.sender] = true;
    }
    
    /**
     * @dev Add a new supported chain
     * @param chainId The chain ID
     * @param name Chain name
     * @param bridgeContract Bridge contract address on the chain
     * @param minTransferAmount Minimum transfer amount
     * @param maxTransferAmount Maximum transfer amount
     * @param transferFee Transfer fee in basis points
     */
    function addChain(
        uint256 chainId,
        string calldata name,
        address bridgeContract,
        uint256 minTransferAmount,
        uint256 maxTransferAmount,
        uint256 transferFee
    ) external onlyOwner {
        require(chainId != 0, "Invalid chain ID");
        require(bridgeContract != address(0), "Invalid bridge contract");
        require(transferFee <= MAX_TRANSFER_FEE, "Fee too high");
        require(minTransferAmount < maxTransferAmount, "Invalid transfer limits");
        
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            name: name,
            bridgeContract: bridgeContract,
            minTransferAmount: minTransferAmount,
            maxTransferAmount: maxTransferAmount,
            transferFee: transferFee,
            active: true
        });
        
        supportedChains.push(chainId);
        
        emit ChainAdded(chainId, name, bridgeContract);
    }
    
    /**
     * @dev Update chain configuration
     * @param chainId The chain ID to update
     * @param active Whether the chain is active
     */
    function updateChain(uint256 chainId, bool active) external onlyOwner {
        require(chainConfigs[chainId].chainId != 0, "Chain not found");
        chainConfigs[chainId].active = active;
        emit ChainUpdated(chainId, active);
    }
    
    /**
     * @dev Add token mapping between chains
     * @param chainId Destination chain ID
     * @param sourceToken Source token address
     * @param destinationToken Destination token address
     */
    function addTokenMapping(
        uint256 chainId,
        address sourceToken,
        address destinationToken
    ) external onlyOwner {
        require(chainConfigs[chainId].chainId != 0, "Chain not supported");
        require(sourceToken != address(0) && destinationToken != address(0), "Invalid token addresses");
        
        tokenMappings[chainId][sourceToken] = destinationToken;
        
        emit TokenMappingAdded(chainId, sourceToken, destinationToken);
    }
    
    /**
     * @dev Create a bridge request to transfer tokens to another chain
     * @param token Token address to bridge
     * @param amount Amount to bridge
     * @param destinationChain Destination chain ID
     * @param destinationAddress Recipient address on destination chain
     */
    function createBridgeRequest(
        address token,
        uint256 amount,
        uint256 destinationChain,
        address destinationAddress
    ) external nonReentrant returns (bytes32 requestId) {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        require(destinationAddress != address(0), "Invalid destination address");
        require(chainConfigs[destinationChain].active, "Destination chain not active");
        require(tokenMappings[destinationChain][token] != address(0), "Token not supported on destination chain");
        
        ChainConfig memory destChain = chainConfigs[destinationChain];
        require(amount >= destChain.minTransferAmount, "Amount below minimum");
        require(amount <= destChain.maxTransferAmount, "Amount above maximum");
        
        // Calculate fee
        uint256 fee = (amount * destChain.transferFee) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Create request ID
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            destinationChain,
            destinationAddress,
            block.timestamp,
            requestNonce++
        ));
        
        // Store bridge request
        bridgeRequests[requestId] = BridgeRequest({
            user: msg.sender,
            token: token,
            amount: netAmount,
            sourceChain: block.chainid,
            destinationChain: destinationChain,
            destinationAddress: destinationAddress,
            timestamp: block.timestamp,
            nonce: requestNonce - 1,
            status: BridgeStatus.PENDING,
            txHash: bytes32(0)
        });
        
        userBridgeRequests[msg.sender].push(requestId);
        
        // Collect fee
        if (fee > 0) {
            collectedFees[token] += fee;
        }
        
        emit BridgeRequestCreated(requestId, msg.sender, netAmount, block.chainid, destinationChain);
    }
    
    /**
     * @dev Confirm bridge request completion (called by bridge operators)
     * @param requestId The bridge request ID
     * @param txHash Transaction hash on destination chain
     */
    function confirmBridgeRequest(
        bytes32 requestId,
        bytes32 txHash
    ) external onlyBridgeOperator {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(request.user != address(0), "Request not found");
        require(request.status == BridgeStatus.PENDING, "Request not pending");
        
        request.status = BridgeStatus.COMPLETED;
        request.txHash = txHash;
        
        emit BridgeRequestCompleted(requestId, txHash);
    }
    
    /**
     * @dev Mark bridge request as failed (called by bridge operators)
     * @param requestId The bridge request ID
     * @param reason Failure reason
     */
    function failBridgeRequest(
        bytes32 requestId,
        string calldata reason
    ) external onlyBridgeOperator {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(request.user != address(0), "Request not found");
        require(request.status == BridgeStatus.PENDING, "Request not pending");
        
        request.status = BridgeStatus.FAILED;
        
        // Refund tokens to user
        IERC20(request.token).safeTransfer(request.user, request.amount);
        
        emit BridgeRequestFailed(requestId, reason);
    }
    
    /**
     * @dev Cancel bridge request (user can cancel if timeout exceeded)
     * @param requestId The bridge request ID
     */
    function cancelBridgeRequest(bytes32 requestId) external {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(request.user == msg.sender, "Not request owner");
        require(request.status == BridgeStatus.PENDING, "Request not pending");
        require(block.timestamp >= request.timestamp + BRIDGE_TIMEOUT, "Timeout not reached");
        
        request.status = BridgeStatus.CANCELLED;
        
        // Refund tokens to user
        IERC20(request.token).safeTransfer(request.user, request.amount);
    }
    
    /**
     * @dev Create a cross-chain strategy
     * @param name Strategy name
     * @param supportedChains Array of supported chain IDs
     * @param requiredTokens Array of required token addresses
     * @param minInvestment Minimum investment amount
     * @param expectedAPY Expected APY in basis points
     */
    function createCrossChainStrategy(
        string calldata name,
        uint256[] calldata supportedChains,
        address[] calldata requiredTokens,
        uint256 minInvestment,
        uint256 expectedAPY
    ) external onlyOwner returns (uint256 strategyId) {
        require(bytes(name).length > 0, "Invalid strategy name");
        require(supportedChains.length > 1, "Need at least 2 chains");
        require(requiredTokens.length > 0, "Need at least 1 token");
        
        // Validate all chains are supported
        for (uint256 i = 0; i < supportedChains.length; i++) {
            require(chainConfigs[supportedChains[i]].active, "Unsupported chain");
        }
        
        strategyId = strategyCounter++;
        
        crossChainStrategies[strategyId] = CrossChainStrategy({
            strategyId: strategyId,
            name: name,
            supportedChains: supportedChains,
            requiredTokens: requiredTokens,
            minInvestment: minInvestment,
            expectedAPY: expectedAPY,
            active: true
        });
        
        emit CrossChainStrategyCreated(strategyId, name, supportedChains);
    }
    
    /**
     * @dev Get bridge request details
     * @param requestId The bridge request ID
     * @return Bridge request struct
     */
    function getBridgeRequest(bytes32 requestId) external view returns (BridgeRequest memory) {
        return bridgeRequests[requestId];
    }
    
    /**
     * @dev Get user's bridge requests
     * @param user User address
     * @return Array of bridge request IDs
     */
    function getUserBridgeRequests(address user) external view returns (bytes32[] memory) {
        return userBridgeRequests[user];
    }
    
    /**
     * @dev Get cross-chain strategy details
     * @param strategyId Strategy ID
     * @return Strategy struct
     */
    function getCrossChainStrategy(uint256 strategyId) external view returns (CrossChainStrategy memory) {
        return crossChainStrategies[strategyId];
    }
    
    /**
     * @dev Get supported chains
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }
    
    /**
     * @dev Get token mapping for a chain
     * @param chainId Chain ID
     * @param sourceToken Source token address
     * @return Destination token address
     */
    function getTokenMapping(uint256 chainId, address sourceToken) external view returns (address) {
        return tokenMappings[chainId][sourceToken];
    }
    
    /**
     * @dev Estimate bridge cost
     * @param token Token address
     * @param amount Amount to bridge
     * @param destinationChain Destination chain ID
     * @return fee Bridge fee
     * @return netAmount Net amount after fee
     */
    function estimateBridgeCost(
        address token,
        uint256 amount,
        uint256 destinationChain
    ) external view returns (uint256 fee, uint256 netAmount) {
        require(chainConfigs[destinationChain].active, "Chain not active");
        
        ChainConfig memory destChain = chainConfigs[destinationChain];
        fee = (amount * destChain.transferFee) / 10000;
        netAmount = amount - fee;
    }
    
    /**
     * @dev Add bridge operator
     * @param operator Operator address
     */
    function addBridgeOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid operator");
        bridgeOperators[operator] = true;
        emit BridgeOperatorAdded(operator);
    }
    
    /**
     * @dev Remove bridge operator
     * @param operator Operator address
     */
    function removeBridgeOperator(address operator) external onlyOwner {
        bridgeOperators[operator] = false;
        emit BridgeOperatorRemoved(operator);
    }
    
    /**
     * @dev Withdraw collected fees
     * @param token Token address
     * @param to Recipient address
     */
    function withdrawFees(address token, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        
        uint256 amount = collectedFees[token];
        require(amount > 0, "No fees to withdraw");
        
        collectedFees[token] = 0;
        IERC20(token).safeTransfer(to, amount);
        
        emit FeesCollected(token, amount);
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     * @param token Token address
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }
}