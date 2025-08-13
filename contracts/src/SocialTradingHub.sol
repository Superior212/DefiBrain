// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SocialTradingHub
 * @dev Core contract for social trading features including trader following, copy trading, and performance tracking
 */
contract SocialTradingHub is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct TraderProfile {
        address trader;
        string name;
        string description;
        uint256 totalFollowers;
        uint256 totalAUM; // Assets Under Management
        uint256 performanceScore; // 0-10000 (100.00%)
        uint256 riskScore; // 0-10000 (100.00%)
        bool isVerified;
        bool isActive;
        uint256 createdAt;
    }

    struct FollowPosition {
        address follower;
        address trader;
        uint256 allocatedAmount;
        uint256 copyPercentage; // 0-10000 (100.00%)
        bool isActive;
        uint256 startedAt;
    }

    struct TradeSignal {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 timestamp;
        bool executed;
        string strategy;
    }

    // State variables
    mapping(address => TraderProfile) public traderProfiles;
    mapping(address => address[]) public traderFollowers;
    mapping(address => address[]) public followerTraders;
    mapping(bytes32 => FollowPosition) public followPositions;
    mapping(uint256 => TradeSignal) public tradeSignals;
    
    address[] public verifiedTraders;
    uint256 public nextSignalId;
    uint256 public platformFee = 250; // 2.5%
    uint256 public constant MAX_COPY_PERCENTAGE = 10000; // 100%
    uint256 public constant MIN_COPY_PERCENTAGE = 100; // 1%

    // Events
    event TraderRegistered(address indexed trader, string name);
    event TraderVerified(address indexed trader);
    event FollowStarted(address indexed follower, address indexed trader, uint256 amount, uint256 copyPercentage);
    event FollowStopped(address indexed follower, address indexed trader);
    event TradeSignalCreated(uint256 indexed signalId, address indexed trader, address tokenIn, address tokenOut);
    event TradeExecuted(uint256 indexed signalId, address indexed follower, uint256 amountIn, uint256 amountOut);
    event PerformanceUpdated(address indexed trader, uint256 newScore);

    modifier onlyVerifiedTrader() {
        require(traderProfiles[msg.sender].isVerified, "Not a verified trader");
        _;
    }

    modifier validCopyPercentage(uint256 _percentage) {
        require(_percentage >= MIN_COPY_PERCENTAGE && _percentage <= MAX_COPY_PERCENTAGE, "Invalid copy percentage");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register as a trader
     */
    function registerTrader(string memory _name, string memory _description) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(traderProfiles[msg.sender].trader == address(0), "Trader already registered");

        traderProfiles[msg.sender] = TraderProfile({
            trader: msg.sender,
            name: _name,
            description: _description,
            totalFollowers: 0,
            totalAUM: 0,
            performanceScore: 5000, // Start with 50%
            riskScore: 5000, // Start with 50%
            isVerified: false,
            isActive: true,
            createdAt: block.timestamp
        });

        emit TraderRegistered(msg.sender, _name);
    }

    /**
     * @dev Verify a trader (only owner)
     */
    function verifyTrader(address _trader) external onlyOwner {
        require(traderProfiles[_trader].trader != address(0), "Trader not registered");
        require(!traderProfiles[_trader].isVerified, "Trader already verified");

        traderProfiles[_trader].isVerified = true;
        verifiedTraders.push(_trader);

        emit TraderVerified(_trader);
    }

    /**
     * @dev Follow a trader with copy trading
     */
    function followTrader(
        address _trader,
        uint256 _copyPercentage,
        IERC20 _token,
        uint256 _amount
    ) external nonReentrant validCopyPercentage(_copyPercentage) {
        require(traderProfiles[_trader].isVerified, "Trader not verified");
        require(traderProfiles[_trader].isActive, "Trader not active");
        require(_trader != msg.sender, "Cannot follow yourself");
        require(_amount > 0, "Amount must be greater than 0");

        bytes32 positionId = keccak256(abi.encodePacked(msg.sender, _trader));
        require(!followPositions[positionId].isActive, "Already following this trader");

        // Transfer tokens to contract
        _token.safeTransferFrom(msg.sender, address(this), _amount);

        // Create follow position
        followPositions[positionId] = FollowPosition({
            follower: msg.sender,
            trader: _trader,
            allocatedAmount: _amount,
            copyPercentage: _copyPercentage,
            isActive: true,
            startedAt: block.timestamp
        });

        // Update mappings
        traderFollowers[_trader].push(msg.sender);
        followerTraders[msg.sender].push(_trader);
        
        // Update trader stats
        traderProfiles[_trader].totalFollowers++;
        traderProfiles[_trader].totalAUM = traderProfiles[_trader].totalAUM + _amount;

        emit FollowStarted(msg.sender, _trader, _amount, _copyPercentage);
    }

    /**
     * @dev Stop following a trader
     */
    function unfollowTrader(address _trader, IERC20 _token) external nonReentrant {
        bytes32 positionId = keccak256(abi.encodePacked(msg.sender, _trader));
        FollowPosition storage position = followPositions[positionId];
        
        require(position.isActive, "Not following this trader");
        require(position.follower == msg.sender, "Not your position");

        // Return allocated funds
        uint256 returnAmount = position.allocatedAmount;
        position.isActive = false;

        // Update trader stats
        traderProfiles[_trader].totalFollowers--;
        traderProfiles[_trader].totalAUM = traderProfiles[_trader].totalAUM - returnAmount;

        // Transfer tokens back
        _token.safeTransfer(msg.sender, returnAmount);

        emit FollowStopped(msg.sender, _trader);
    }

    /**
     * @dev Create a trade signal (only verified traders)
     */
    function createTradeSignal(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minAmountOut,
        string memory _strategy
    ) external onlyVerifiedTrader returns (uint256) {
        require(_tokenIn != _tokenOut, "Tokens must be different");
        require(_amountIn > 0, "Amount must be greater than 0");

        uint256 signalId = nextSignalId++;
        
        tradeSignals[signalId] = TradeSignal({
            trader: msg.sender,
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountIn: _amountIn,
            minAmountOut: _minAmountOut,
            timestamp: block.timestamp,
            executed: false,
            strategy: _strategy
        });

        emit TradeSignalCreated(signalId, msg.sender, _tokenIn, _tokenOut);
        return signalId;
    }

    /**
     * @dev Update trader performance score (only owner)
     */
    function updatePerformanceScore(address _trader, uint256 _newScore) external onlyOwner {
        require(_newScore <= 10000, "Score cannot exceed 100%");
        require(traderProfiles[_trader].trader != address(0), "Trader not registered");

        traderProfiles[_trader].performanceScore = _newScore;
        emit PerformanceUpdated(_trader, _newScore);
    }

    /**
     * @dev Get trader followers
     */
    function getTraderFollowers(address _trader) external view returns (address[] memory) {
        return traderFollowers[_trader];
    }

    /**
     * @dev Get traders followed by user
     */
    function getFollowedTraders(address _follower) external view returns (address[] memory) {
        return followerTraders[_follower];
    }

    /**
     * @dev Get all verified traders
     */
    function getVerifiedTraders() external view returns (address[] memory) {
        return verifiedTraders;
    }

    /**
     * @dev Get follow position details
     */
    function getFollowPosition(address _follower, address _trader) external view returns (FollowPosition memory) {
        bytes32 positionId = keccak256(abi.encodePacked(_follower, _trader));
        return followPositions[positionId];
    }

    /**
     * @dev Set platform fee (only owner)
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%");
        platformFee = _fee;
    }

    /**
     * @dev Emergency pause trader (only owner)
     */
    function pauseTrader(address _trader) external onlyOwner {
        traderProfiles[_trader].isActive = false;
    }

    /**
     * @dev Unpause trader (only owner)
     */
    function unpauseTrader(address _trader) external onlyOwner {
        traderProfiles[_trader].isActive = true;
    }
}