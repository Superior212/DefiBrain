// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IStrategy
 * @dev Interface for DefiBrain yield strategies
 * @notice All strategies must implement this interface
 */
interface IStrategy {
    /**
     * @dev Returns the underlying asset that the strategy accepts
     */
    function asset() external view returns (IERC20);
    
    /**
     * @dev Returns the total assets under management by this strategy
     */
    function totalAssets() external view returns (uint256);
    
    /**
     * @dev Returns the current APY of the strategy (in basis points)
     */
    function getAPY() external view returns (uint256);
    
    /**
     * @dev Returns the risk level of the strategy (1-10, 10 being highest risk)
     */
    function getRiskLevel() external view returns (uint8);
    
    /**
     * @dev Deposit assets into the strategy
     * @param amount Amount of assets to deposit
     * @return shares Amount of strategy shares minted
     */
    function deposit(uint256 amount) external returns (uint256 shares);
    
    /**
     * @dev Withdraw assets from the strategy
     * @param shares Amount of strategy shares to burn
     * @return amount Amount of assets withdrawn
     */
    function withdraw(uint256 shares) external returns (uint256 amount);
    
    /**
     * @dev Emergency withdraw all assets (may incur penalties)
     */
    function emergencyWithdraw() external returns (uint256 amount);
    
    /**
     * @dev Harvest rewards and compound them
     */
    function harvest() external returns (uint256 harvested);
    
    /**
     * @dev Get strategy metadata
     */
    function getStrategyInfo() external view returns (
        string memory name,
        string memory description,
        uint256 tvl,
        uint256 apy,
        uint8 riskLevel
    );
}