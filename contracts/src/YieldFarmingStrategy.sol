// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IStrategy.sol";

/**
 * @title YieldFarmingStrategy
 * @dev A sample yield farming strategy for DefiBrain
 * @notice This strategy farms yield by providing liquidity to DeFi protocols
 */
contract YieldFarmingStrategy is IStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Strategy configuration
    IERC20 public immutable override asset;
    string public name;
    string public description;
    uint8 public immutable riskLevel;
    
    // Strategy state
    uint256 public totalShares;
    uint256 public lastHarvest;
    uint256 public accumulatedRewards;
    
    // Vault that can call this strategy
    address public vault;
    
    // Mock farming pool (in real implementation, this would be actual DeFi protocol)
    uint256 public constant MOCK_APY = 1200; // 12% APY in basis points
    uint256 public depositedAssets;
    
    mapping(address => uint256) public shares;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    event Harvested(uint256 rewards);
    event VaultSet(address indexed vault);

    modifier onlyVault() {
        require(msg.sender == vault, "YieldFarmingStrategy: only vault");
        _;
    }

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _description,
        uint8 _riskLevel
    ) Ownable(msg.sender) {
        asset = _asset;
        name = _name;
        description = _description;
        riskLevel = _riskLevel;
        lastHarvest = block.timestamp;
    }

    /**
     * @dev Set the vault address that can interact with this strategy
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "YieldFarmingStrategy: zero address");
        vault = _vault;
        emit VaultSet(_vault);
    }

    /**
     * @dev Returns total assets under management
     */
    function totalAssets() external view override returns (uint256) {
        return depositedAssets + _calculatePendingRewards();
    }

    /**
     * @dev Returns current APY in basis points
     */
    function getAPY() external pure override returns (uint256) {
        return MOCK_APY;
    }

    /**
     * @dev Returns risk level
     */
    function getRiskLevel() external view override returns (uint8) {
        return riskLevel;
    }

    /**
     * @dev Deposit assets into the strategy
     */
    function deposit(uint256 amount) external override onlyVault nonReentrant returns (uint256 newShares) {
        require(amount > 0, "YieldFarmingStrategy: zero amount");
        
        // Harvest before deposit to update rewards
        _harvest();
        
        // Calculate shares to mint
        newShares = totalShares == 0 ? amount : (amount * totalShares) / depositedAssets;
        
        // Transfer assets from vault
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update state
        shares[msg.sender] += newShares;
        totalShares += newShares;
        depositedAssets += amount;
        
        emit Deposited(msg.sender, amount, newShares);
    }

    /**
     * @dev Withdraw assets from the strategy
     */
    function withdraw(uint256 sharesToBurn) external override onlyVault nonReentrant returns (uint256 amount) {
        require(sharesToBurn > 0, "YieldFarmingStrategy: zero shares");
        require(shares[msg.sender] >= sharesToBurn, "YieldFarmingStrategy: insufficient shares");
        
        // Harvest before withdrawal to update rewards
        _harvest();
        
        // Calculate amount to withdraw
        amount = (sharesToBurn * depositedAssets) / totalShares;
        
        // Update state
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        depositedAssets -= amount;
        
        // Transfer assets to vault
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, sharesToBurn, amount);
    }

    /**
     * @dev Emergency withdraw all assets
     */
    function emergencyWithdraw() external override onlyVault nonReentrant returns (uint256 amount) {
        uint256 userShares = shares[msg.sender];
        require(userShares > 0, "YieldFarmingStrategy: no shares");
        
        // Calculate amount (without harvesting to save gas in emergency)
        amount = (userShares * depositedAssets) / totalShares;
        
        // Update state
        shares[msg.sender] = 0;
        totalShares -= userShares;
        depositedAssets -= amount;
        
        // Transfer assets to vault
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, userShares, amount);
    }

    /**
     * @dev Harvest rewards and compound them
     */
    function harvest() external override returns (uint256 harvested) {
        return _harvest();
    }

    /**
     * @dev Internal harvest function
     */
    function _harvest() internal returns (uint256 harvested) {
        harvested = _calculatePendingRewards();
        
        if (harvested > 0) {
            accumulatedRewards += harvested;
            depositedAssets += harvested;
            lastHarvest = block.timestamp;
            
            emit Harvested(harvested);
        }
    }

    /**
     * @dev Calculate pending rewards based on time elapsed
     */
    function _calculatePendingRewards() internal view returns (uint256) {
        if (depositedAssets == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - lastHarvest;
        uint256 annualRewards = (depositedAssets * MOCK_APY) / 10000;
        
        // Calculate rewards for time elapsed (assuming 365.25 days per year)
        return (annualRewards * timeElapsed) / 31557600; // 365.25 * 24 * 60 * 60
    }

    /**
     * @dev Get strategy information
     */
    function getStrategyInfo() external view override returns (
        string memory _name,
        string memory _description,
        uint256 tvl,
        uint256 apy,
        uint8 _riskLevel
    ) {
        return (
            name,
            description,
            depositedAssets + _calculatePendingRewards(),
            MOCK_APY,
            riskLevel
        );
    }

    /**
     * @dev Get user's share balance
     */
    function getUserShares(address user) external view returns (uint256) {
        return shares[user];
    }

    /**
     * @dev Get user's asset balance
     */
    function getUserAssets(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        uint256 totalAssetsWithRewards = depositedAssets + _calculatePendingRewards();
        return (shares[user] * totalAssetsWithRewards) / totalShares;
    }
}