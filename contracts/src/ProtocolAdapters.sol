// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PortfolioTracker.sol";
import "./PriceOracle.sol";

/**
 * @title ProtocolAdapters
 * @dev Unified interface for interacting with major DeFi protocols
 * @notice Provides standardized methods for lending, borrowing, staking, and yield farming
 */
contract ProtocolAdapters is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    PortfolioTracker public immutable portfolioTracker;
    PriceOracle public immutable priceOracle;
    
    // Protocol types
    enum ProtocolType {
        LENDING,        // Aave, Compound
        DEX,           // Uniswap, SushiSwap
        YIELD_FARMING, // Yearn, Convex
        STAKING,       // Lido, RocketPool
        SYNTHETIC      // Synthetix, Mirror
    }
    
    // Adapter structures
    struct ProtocolAdapter {
        string name;
        address contractAddress;
        ProtocolType protocolType;
        bool active;
        uint256 tvl;
        uint256 apy;
        uint256 riskScore;
        bytes4[] supportedFunctions;
    }
    
    struct LendingPosition {
        address protocol;
        address asset;
        uint256 supplied;
        uint256 borrowed;
        uint256 collateralFactor;
        uint256 liquidationThreshold;
    }
    
    struct YieldPosition {
        address protocol;
        address asset;
        uint256 deposited;
        uint256 shares;
        uint256 rewards;
        uint256 apy;
        uint256 depositTime;
    }
    
    struct StakingPosition {
        address protocol;
        address asset;
        uint256 staked;
        uint256 rewards;
        uint256 lockPeriod;
        uint256 unlockTime;
        uint256 stakeTime;
    }
    
    // Storage mappings
    mapping(address => ProtocolAdapter) public adapters;
    mapping(address => mapping(address => LendingPosition)) public lendingPositions;
    mapping(address => mapping(address => YieldPosition)) public yieldPositions;
    mapping(address => mapping(address => StakingPosition)) public stakingPositions;
    mapping(address => bool) public authorizedProtocols;
    
    address[] public protocolList;
    
    // Events
    event AdapterRegistered(
        address indexed protocol,
        string name,
        ProtocolType protocolType
    );
    
    event LendingDeposit(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );
    
    event LendingWithdraw(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );
    
    event BorrowAsset(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );
    
    event RepayAsset(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );
    
    event YieldDeposit(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );
    
    event YieldWithdraw(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );
    
    event StakingDeposit(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount,
        uint256 lockPeriod
    );
    
    event StakingWithdraw(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );
    
    event RewardsClaimed(
        address indexed user,
        address indexed protocol,
        address indexed asset,
        uint256 amount
    );

    constructor(
        address _portfolioTracker,
        address _priceOracle
    ) Ownable(msg.sender) {
        portfolioTracker = PortfolioTracker(_portfolioTracker);
        priceOracle = PriceOracle(_priceOracle);
    }

    /**
     * @dev Register a new protocol adapter
     */
    function registerAdapter(
        address protocol,
        string memory name,
        ProtocolType protocolType,
        uint256 riskScore,
        bytes4[] memory supportedFunctions
    ) external onlyOwner {
        require(protocol != address(0), "Invalid protocol address");
        require(!authorizedProtocols[protocol], "Protocol already registered");
        require(riskScore <= 100, "Invalid risk score");
        
        adapters[protocol] = ProtocolAdapter({
            name: name,
            contractAddress: protocol,
            protocolType: protocolType,
            active: true,
            tvl: 0,
            apy: 0,
            riskScore: riskScore,
            supportedFunctions: supportedFunctions
        });
        
        authorizedProtocols[protocol] = true;
        protocolList.push(protocol);
        
        emit AdapterRegistered(protocol, name, protocolType);
    }

    /**
     * @dev Supply assets to a lending protocol
     */
    function supplyToLending(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        require(adapters[protocol].protocolType == ProtocolType.LENDING, "Not a lending protocol");
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update lending position
        LendingPosition storage position = lendingPositions[msg.sender][protocol];
        position.protocol = protocol;
        position.asset = asset;
        position.supplied += amount;
        
        // Add position to portfolio tracker
        portfolioTracker.addPosition(
            msg.sender,
            protocol,
            asset,
            amount,
            0, // No shares for lending
            PortfolioTracker.PositionType.LENDING
        );
        
        // Mock protocol interaction (replace with actual protocol calls)
        _mockLendingSupply(protocol, asset, amount);
        
        emit LendingDeposit(msg.sender, protocol, asset, amount);
    }

    /**
     * @dev Withdraw assets from a lending protocol
     */
    function withdrawFromLending(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        LendingPosition storage position = lendingPositions[msg.sender][protocol];
        require(position.supplied >= amount, "Insufficient supplied amount");
        
        // Update position
        position.supplied -= amount;
        
        // Mock protocol interaction
        _mockLendingWithdraw(protocol, asset, amount);
        
        // Transfer tokens to user
        IERC20(asset).safeTransfer(msg.sender, amount);
        
        emit LendingWithdraw(msg.sender, protocol, asset, amount);
    }

    /**
     * @dev Borrow assets from a lending protocol
     */
    function borrowFromLending(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        require(adapters[protocol].protocolType == ProtocolType.LENDING, "Not a lending protocol");
        
        LendingPosition storage position = lendingPositions[msg.sender][protocol];
        
        // Check collateral requirements (simplified)
        uint256 maxBorrow = _calculateMaxBorrow(msg.sender, protocol, asset);
        require(position.borrowed + amount <= maxBorrow, "Insufficient collateral");
        
        // Update position
        position.borrowed += amount;
        
        // Mock protocol interaction
        _mockLendingBorrow(protocol, asset, amount);
        
        // Add borrowing position to portfolio
        portfolioTracker.addPosition(
            msg.sender,
            protocol,
            asset,
            amount,
            0,
            PortfolioTracker.PositionType.BORROWING
        );
        
        // Transfer borrowed tokens to user
        IERC20(asset).safeTransfer(msg.sender, amount);
        
        emit BorrowAsset(msg.sender, protocol, asset, amount);
    }

    /**
     * @dev Repay borrowed assets to a lending protocol
     */
    function repayToLending(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        LendingPosition storage position = lendingPositions[msg.sender][protocol];
        require(position.borrowed >= amount, "Repay amount exceeds debt");
        
        // Transfer tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update position
        position.borrowed -= amount;
        
        // Mock protocol interaction
        _mockLendingRepay(protocol, asset, amount);
        
        emit RepayAsset(msg.sender, protocol, asset, amount);
    }

    /**
     * @dev Deposit assets to a yield farming protocol
     */
    function depositToYieldFarm(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        require(authorizedProtocols[protocol], "Protocol not supported");
        require(adapters[protocol].protocolType == ProtocolType.YIELD_FARMING, "Not a yield farming protocol");
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate shares (simplified)
        shares = _calculateYieldShares(protocol, asset, amount);
        
        // Update yield position
        YieldPosition storage position = yieldPositions[msg.sender][protocol];
        position.protocol = protocol;
        position.asset = asset;
        position.deposited += amount;
        position.shares += shares;
        position.apy = _getProtocolAPY(protocol);
        if (position.depositTime == 0) {
            position.depositTime = block.timestamp;
        }
        
        // Add position to portfolio tracker
        portfolioTracker.addPosition(
            msg.sender,
            protocol,
            asset,
            amount,
            shares,
            PortfolioTracker.PositionType.FARMING
        );
        
        // Mock protocol interaction
        _mockYieldDeposit(protocol, asset, amount);
        
        emit YieldDeposit(msg.sender, protocol, asset, amount, shares);
    }

    /**
     * @dev Withdraw assets from a yield farming protocol
     */
    function withdrawFromYieldFarm(
        address protocol,
        address asset,
        uint256 shares
    ) external nonReentrant returns (uint256 amount) {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        YieldPosition storage position = yieldPositions[msg.sender][protocol];
        require(position.shares >= shares, "Insufficient shares");
        
        // Calculate withdrawal amount
        amount = _calculateYieldWithdrawal(protocol, asset, shares);
        
        // Update position
        position.shares -= shares;
        position.deposited -= amount;
        
        // Mock protocol interaction
        _mockYieldWithdraw(protocol, asset, shares);
        
        // Transfer tokens to user
        IERC20(asset).safeTransfer(msg.sender, amount);
        
        emit YieldWithdraw(msg.sender, protocol, asset, amount, shares);
    }

    /**
     * @dev Stake assets in a staking protocol
     */
    function stakeAssets(
        address protocol,
        address asset,
        uint256 amount,
        uint256 lockPeriod
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        require(adapters[protocol].protocolType == ProtocolType.STAKING, "Not a staking protocol");
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update staking position
        StakingPosition storage position = stakingPositions[msg.sender][protocol];
        position.protocol = protocol;
        position.asset = asset;
        position.staked += amount;
        position.lockPeriod = lockPeriod;
        position.unlockTime = block.timestamp + lockPeriod;
        if (position.stakeTime == 0) {
            position.stakeTime = block.timestamp;
        }
        
        // Add position to portfolio tracker
        portfolioTracker.addPosition(
            msg.sender,
            protocol,
            asset,
            amount,
            0,
            PortfolioTracker.PositionType.STAKING
        );
        
        // Mock protocol interaction
        _mockStaking(protocol, asset, amount, lockPeriod);
        
        emit StakingDeposit(msg.sender, protocol, asset, amount, lockPeriod);
    }

    /**
     * @dev Unstake assets from a staking protocol
     */
    function unstakeAssets(
        address protocol,
        address asset,
        uint256 amount
    ) external nonReentrant {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        StakingPosition storage position = stakingPositions[msg.sender][protocol];
        require(position.staked >= amount, "Insufficient staked amount");
        require(block.timestamp >= position.unlockTime, "Assets still locked");
        
        // Update position
        position.staked -= amount;
        
        // Mock protocol interaction
        _mockUnstaking(protocol, asset, amount);
        
        // Transfer tokens to user
        IERC20(asset).safeTransfer(msg.sender, amount);
        
        emit StakingWithdraw(msg.sender, protocol, asset, amount);
    }

    /**
     * @dev Claim rewards from various protocols
     */
    function claimRewards(
        address protocol,
        address asset
    ) external nonReentrant returns (uint256 rewards) {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        // Calculate available rewards
        rewards = _calculateRewards(msg.sender, protocol, asset);
        require(rewards > 0, "No rewards available");
        
        // Update positions based on protocol type
        if (adapters[protocol].protocolType == ProtocolType.YIELD_FARMING) {
            yieldPositions[msg.sender][protocol].rewards += rewards;
        } else if (adapters[protocol].protocolType == ProtocolType.STAKING) {
            stakingPositions[msg.sender][protocol].rewards += rewards;
        }
        
        // Mock protocol interaction
        _mockClaimRewards(protocol, asset, rewards);
        
        // Transfer reward tokens to user (assuming same asset for simplicity)
        IERC20(asset).safeTransfer(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, protocol, asset, rewards);
    }

    /**
     * @dev Get lending position details
     */
    function getLendingPosition(address user, address protocol) external view returns (LendingPosition memory) {
        return lendingPositions[user][protocol];
    }

    /**
     * @dev Get yield farming position details
     */
    function getYieldPosition(address user, address protocol) external view returns (YieldPosition memory) {
        return yieldPositions[user][protocol];
    }

    /**
     * @dev Get staking position details
     */
    function getStakingPosition(address user, address protocol) external view returns (StakingPosition memory) {
        return stakingPositions[user][protocol];
    }

    /**
     * @dev Get all supported protocols
     */
    function getSupportedProtocols() external view returns (address[] memory) {
        return protocolList;
    }

    /**
     * @dev Get protocol adapter details
     */
    function getAdapter(address protocol) external view returns (ProtocolAdapter memory) {
        return adapters[protocol];
    }

    /**
     * @dev Update protocol TVL and APY (called by oracle or keeper)
     */
    function updateProtocolMetrics(
        address protocol,
        uint256 tvl,
        uint256 apy
    ) external onlyOwner {
        require(authorizedProtocols[protocol], "Protocol not supported");
        
        adapters[protocol].tvl = tvl;
        adapters[protocol].apy = apy;
    }

    // Internal mock functions (replace with actual protocol integrations)
    function _mockLendingSupply(address protocol, address asset, uint256 amount) internal {
        // Mock implementation - replace with actual protocol calls
    }

    function _mockLendingWithdraw(address protocol, address asset, uint256 amount) internal {
        // Mock implementation
    }

    function _mockLendingBorrow(address protocol, address asset, uint256 amount) internal {
        // Mock implementation
    }

    function _mockLendingRepay(address protocol, address asset, uint256 amount) internal {
        // Mock implementation
    }

    function _mockYieldDeposit(address protocol, address asset, uint256 amount) internal {
        // Mock implementation
    }

    function _mockYieldWithdraw(address protocol, address asset, uint256 shares) internal {
        // Mock implementation
    }

    function _mockStaking(address protocol, address asset, uint256 amount, uint256 lockPeriod) internal {
        // Mock implementation
    }

    function _mockUnstaking(address protocol, address asset, uint256 amount) internal {
        // Mock implementation
    }

    function _mockClaimRewards(address protocol, address asset, uint256 rewards) internal {
        // Mock implementation
    }

    function _calculateMaxBorrow(address user, address protocol, address asset) internal view returns (uint256) {
        // Simplified calculation - replace with actual protocol logic
        LendingPosition storage position = lendingPositions[user][protocol];
        if (position.supplied == 0) return 0;
        
        (uint256 collateralPrice,) = priceOracle.getPrice(position.asset);
        (uint256 borrowAssetPrice,) = priceOracle.getPrice(asset);
        
        // Calculate collateral value in USD (assuming 18 decimals)
        uint256 collateralValueUSD = (position.supplied * collateralPrice) / 1e18;
        
        // Calculate max borrow amount in the target asset (75% LTV)
        uint256 maxBorrowValueUSD = (collateralValueUSD * 75) / 100;
        
        // Convert back to target asset amount
        return (maxBorrowValueUSD * 1e18) / borrowAssetPrice;
    }

    function _calculateYieldShares(address protocol, address asset, uint256 amount) internal view returns (uint256) {
        // Simplified share calculation
        return amount; // 1:1 ratio for simplicity
    }

    function _calculateYieldWithdrawal(address protocol, address asset, uint256 shares) internal view returns (uint256) {
        // Simplified withdrawal calculation
        return shares; // 1:1 ratio for simplicity
    }

    function _calculateRewards(address user, address protocol, address asset) internal view returns (uint256) {
        // Simplified reward calculation
        if (adapters[protocol].protocolType == ProtocolType.YIELD_FARMING) {
            YieldPosition storage position = yieldPositions[user][protocol];
            if (position.deposited == 0 || position.depositTime == 0) return 0;
            uint256 timeElapsed = block.timestamp - position.depositTime;
            return (position.deposited * position.apy * timeElapsed) / (365 days * 10000);
        } else if (adapters[protocol].protocolType == ProtocolType.STAKING) {
            StakingPosition storage position = stakingPositions[user][protocol];
            if (position.staked == 0 || position.stakeTime == 0) return 0;
            uint256 timeElapsed = block.timestamp - position.stakeTime;
            return (position.staked * 500 * timeElapsed) / (365 days * 10000); // 5% APY
        }
        return 0;
    }

    function _getProtocolAPY(address protocol) internal view returns (uint256) {
        return adapters[protocol].apy;
    }
}