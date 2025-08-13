// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Chainlink-based price oracle for DefiBrain
 * @notice Provides reliable price feeds for risk management and asset valuation
 */
contract PriceOracle is Ownable {
    
    // Price feed mappings
    mapping(address => AggregatorV3Interface) public priceFeeds;
    mapping(address => uint256) public heartbeats; // Maximum allowed staleness in seconds
    
    // Events
    event PriceFeedAdded(address indexed asset, address indexed priceFeed, uint256 heartbeat);
    event PriceFeedRemoved(address indexed asset);
    event PriceFeedUpdated(address indexed asset, address indexed newPriceFeed, uint256 newHeartbeat);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Add a price feed for an asset
     * @param asset The asset address
     * @param priceFeed The Chainlink price feed address
     * @param heartbeat Maximum allowed staleness in seconds
     */
    function addPriceFeed(
        address asset,
        address priceFeed,
        uint256 heartbeat
    ) external onlyOwner {
        require(asset != address(0), "PriceOracle: zero asset address");
        require(priceFeed != address(0), "PriceOracle: zero price feed address");
        require(heartbeat > 0, "PriceOracle: zero heartbeat");
        
        priceFeeds[asset] = AggregatorV3Interface(priceFeed);
        heartbeats[asset] = heartbeat;
        
        emit PriceFeedAdded(asset, priceFeed, heartbeat);
    }
    
    /**
     * @dev Remove a price feed for an asset
     * @param asset The asset address
     */
    function removePriceFeed(address asset) external onlyOwner {
        require(address(priceFeeds[asset]) != address(0), "PriceOracle: price feed not found");
        
        delete priceFeeds[asset];
        delete heartbeats[asset];
        
        emit PriceFeedRemoved(asset);
    }
    
    /**
     * @dev Update a price feed for an asset
     * @param asset The asset address
     * @param newPriceFeed The new Chainlink price feed address
     * @param newHeartbeat New maximum allowed staleness in seconds
     */
    function updatePriceFeed(
        address asset,
        address newPriceFeed,
        uint256 newHeartbeat
    ) external onlyOwner {
        require(address(priceFeeds[asset]) != address(0), "PriceOracle: price feed not found");
        require(newPriceFeed != address(0), "PriceOracle: zero price feed address");
        require(newHeartbeat > 0, "PriceOracle: zero heartbeat");
        
        priceFeeds[asset] = AggregatorV3Interface(newPriceFeed);
        heartbeats[asset] = newHeartbeat;
        
        emit PriceFeedUpdated(asset, newPriceFeed, newHeartbeat);
    }
    
    /**
     * @dev Get the latest price for an asset
     * @param asset The asset address
     * @return price The latest price (scaled to 18 decimals)
     * @return timestamp The timestamp of the price update
     */
    function getPrice(address asset) external view returns (uint256 price, uint256 timestamp) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "PriceOracle: price feed not found");
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "PriceOracle: invalid price");
        require(updatedAt > 0, "PriceOracle: round not complete");
        require(block.timestamp - updatedAt <= heartbeats[asset], "PriceOracle: price too stale");
        
        // Scale price to 18 decimals
        uint8 decimals = priceFeed.decimals();
        if (decimals < 18) {
            price = uint256(answer) * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            price = uint256(answer) / (10 ** (decimals - 18));
        } else {
            price = uint256(answer);
        }
        
        timestamp = updatedAt;
    }
    
    /**
     * @dev Get the latest price for an asset without staleness check (use with caution)
     * @param asset The asset address
     * @return price The latest price (scaled to 18 decimals)
     * @return timestamp The timestamp of the price update
     */
    function getPriceUnsafe(address asset) external view returns (uint256 price, uint256 timestamp) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "PriceOracle: price feed not found");
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "PriceOracle: invalid price");
        require(updatedAt > 0, "PriceOracle: round not complete");
        
        // Scale price to 18 decimals
        uint8 decimals = priceFeed.decimals();
        if (decimals < 18) {
            price = uint256(answer) * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            price = uint256(answer) / (10 ** (decimals - 18));
        } else {
            price = uint256(answer);
        }
        
        timestamp = updatedAt;
    }
    
    /**
     * @dev Check if a price feed exists for an asset
     * @param asset The asset address
     * @return exists True if price feed exists
     */
    function hasPriceFeed(address asset) external view returns (bool exists) {
        return address(priceFeeds[asset]) != address(0);
    }
    
    /**
     * @dev Get price feed info for an asset
     * @param asset The asset address
     * @return priceFeed The price feed address
     * @return heartbeat The heartbeat in seconds
     * @return decimals The price feed decimals
     */
    function getPriceFeedInfo(address asset) external view returns (
        address priceFeed,
        uint256 heartbeat,
        uint8 decimals
    ) {
        AggregatorV3Interface feed = priceFeeds[asset];
        require(address(feed) != address(0), "PriceOracle: price feed not found");
        
        return (
            address(feed),
            heartbeats[asset],
            feed.decimals()
        );
    }
    
    /**
     * @dev Calculate the USD value of an asset amount
     * @param asset The asset address
     * @param amount The amount of the asset
     * @param assetDecimals The decimals of the asset
     * @return usdValue The USD value (scaled to 18 decimals)
     */
    function getUSDValue(
        address asset,
        uint256 amount,
        uint8 assetDecimals
    ) external view returns (uint256 usdValue) {
        (uint256 price, ) = this.getPrice(asset);
        
        // Normalize amount to 18 decimals
        uint256 normalizedAmount;
        if (assetDecimals < 18) {
            normalizedAmount = amount * (10 ** (18 - assetDecimals));
        } else if (assetDecimals > 18) {
            normalizedAmount = amount / (10 ** (assetDecimals - 18));
        } else {
            normalizedAmount = amount;
        }
        
        // Calculate USD value (both price and normalizedAmount are in 18 decimals)
        usdValue = (normalizedAmount * price) / 1e18;
    }
}