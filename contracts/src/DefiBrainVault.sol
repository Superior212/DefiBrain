// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DefiBrainVault
 * @dev Core vault contract for DefiBrain's AI-powered yield optimization
 * @notice This contract manages user deposits and automated yield strategies
 */
contract DefiBrainVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC20Metadata;

    // State variables
    IERC20Metadata public immutable asset;
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    
    uint256 public totalAssets;
    uint256 public totalShares;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Strategy management
    address[] public strategies;
    mapping(address => bool) public approvedStrategies;
    mapping(address => uint256) public strategyAllocations; // percentage in basis points (10000 = 100%)
    
    // Performance tracking
    uint256 public performanceFee = 1000; // 10% in basis points
    uint256 public managementFee = 200;   // 2% annual in basis points
    uint256 public lastFeeCollection;
    
    // Events
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event StrategyAdded(address indexed strategy, uint256 allocation);
    event StrategyRemoved(address indexed strategy);
    event FeesCollected(uint256 performanceFees, uint256 managementFees);
    event Rebalance(address indexed strategy, uint256 newAllocation);

    constructor(
        IERC20Metadata _asset,
        string memory _name,
        string memory _symbol
    ) Ownable(msg.sender) {
        asset = _asset;
        name = _name;
        symbol = _symbol;
        decimals = _asset.decimals();
        lastFeeCollection = block.timestamp;
    }

    /**
     * @dev Deposit assets into the vault
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive vault shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 shares) 
    {
        require(assets > 0, "DefiBrainVault: zero assets");
        require(receiver != address(0), "DefiBrainVault: zero address");
        
        shares = previewDeposit(assets);
        
        IERC20(asset).safeTransferFrom(msg.sender, address(this), assets);
        
        balanceOf[receiver] += shares;
        totalShares += shares;
        totalAssets += assets;
        
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @dev Withdraw assets from the vault
     * @param shares Amount of shares to burn
     * @param receiver Address to receive assets
     * @param owner Address that owns the shares
     * @return assets Amount of assets withdrawn
     */
    function redeem(uint256 shares, address receiver, address owner) 
        external 
        nonReentrant 
        returns (uint256 assets) 
    {
        require(shares > 0, "DefiBrainVault: zero shares");
        require(receiver != address(0), "DefiBrainVault: zero address");
        
        if (msg.sender != owner) {
            uint256 allowed = allowance[owner][msg.sender];
            if (allowed != type(uint256).max) {
                allowance[owner][msg.sender] = allowed - shares;
            }
        }
        
        assets = previewRedeem(shares);
        
        balanceOf[owner] -= shares;
        totalShares -= shares;
        totalAssets -= assets;
        
        IERC20(asset).safeTransfer(receiver, assets);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @dev Preview deposit to calculate shares
     */
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return totalShares == 0 ? assets : (assets * totalShares) / totalAssets;
    }

    /**
     * @dev Preview redeem to calculate assets
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return totalShares == 0 ? 0 : (shares * totalAssets) / totalShares;
    }

    /**
     * @dev Add a new strategy (only owner)
     */
    function addStrategy(address strategy, uint256 allocation) external onlyOwner {
        require(strategy != address(0), "DefiBrainVault: zero address");
        require(!approvedStrategies[strategy], "DefiBrainVault: strategy exists");
        require(allocation <= 10000, "DefiBrainVault: allocation too high");
        
        strategies.push(strategy);
        approvedStrategies[strategy] = true;
        strategyAllocations[strategy] = allocation;
        
        emit StrategyAdded(strategy, allocation);
    }

    /**
     * @dev Remove a strategy (only owner)
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(approvedStrategies[strategy], "DefiBrainVault: strategy not found");
        
        approvedStrategies[strategy] = false;
        strategyAllocations[strategy] = 0;
        
        // Remove from array
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i] == strategy) {
                strategies[i] = strategies[strategies.length - 1];
                strategies.pop();
                break;
            }
        }
        
        emit StrategyRemoved(strategy);
    }

    /**
     * @dev Get total number of strategies
     */
    function getStrategiesCount() external view returns (uint256) {
        return strategies.length;
    }

    /**
     * @dev Emergency pause (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
