// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./DEXRouter.sol";
import "./DefiBrainVault.sol";

/**
 * @title PortfolioTracker
 * @dev Tracks and manages user DeFi portfolios across multiple protocols
 * @notice Provides comprehensive portfolio analytics and position management
 */
contract PortfolioTracker is Ownable, ReentrancyGuard {
    
    // State variables
    PriceOracle public immutable priceOracle;
    DEXRouter public immutable dexRouter;
    
    // Portfolio structures
    struct Position {
        address protocol;        // Protocol contract address
        address asset;          // Asset token address
        uint256 amount;         // Amount of tokens
        uint256 shares;         // Shares in protocol (if applicable)
        uint256 entryPrice;     // Entry price in USD (18 decimals)
        uint256 timestamp;      // Entry timestamp
        PositionType positionType;
        bool active;
    }
    
    enum PositionType {
        VAULT_DEPOSIT,
        LIQUIDITY_POOL,
        LENDING,
        BORROWING,
        STAKING,
        FARMING
    }
    
    struct Portfolio {
        uint256[] positionIds;
        uint256 totalValueUSD;  // Cached total value
        uint256 lastUpdateTime;
        mapping(address => uint256) assetBalances;
        mapping(address => uint256[]) assetPositions;
    }
    
    struct ProtocolInfo {
        string name;
        address contractAddress;
        bool active;
        uint256 totalValueLocked;
    }
    
    struct PerformanceMetrics {
        uint256 totalInvested;
        uint256 currentValue;
        int256 totalPnL;
        uint256 totalRewards;
        uint256 avgAPY;
        uint256 riskScore;
    }
    
    // Storage mappings
    mapping(address => Portfolio) public portfolios;
    mapping(uint256 => Position) public positions;
    mapping(address => ProtocolInfo) public protocols;
    mapping(address => bool) public authorizedProtocols;
    
    address[] public protocolList;
    uint256 public nextPositionId = 1;
    
    // Events
    event PositionAdded(
        address indexed user,
        uint256 indexed positionId,
        address indexed protocol,
        address asset,
        uint256 amount,
        PositionType positionType
    );
    
    event PositionUpdated(
        address indexed user,
        uint256 indexed positionId,
        uint256 newAmount,
        uint256 newShares
    );
    
    event PositionClosed(
        address indexed user,
        uint256 indexed positionId,
        uint256 finalAmount,
        int256 pnl
    );
    
    event PortfolioUpdated(
        address indexed user,
        uint256 totalValueUSD,
        uint256 timestamp
    );
    
    event ProtocolAdded(
        address indexed protocol,
        string name
    );

    constructor(
        address _priceOracle,
        address _dexRouter
    ) Ownable(msg.sender) {
        priceOracle = PriceOracle(_priceOracle);
        dexRouter = DEXRouter(_dexRouter);
    }

    /**
     * @dev Add a new DeFi protocol for tracking
     */
    function addProtocol(
        address protocol,
        string memory name
    ) external onlyOwner {
        require(protocol != address(0), "Invalid protocol address");
        require(!authorizedProtocols[protocol], "Protocol already added");
        
        protocols[protocol] = ProtocolInfo({
            name: name,
            contractAddress: protocol,
            active: true,
            totalValueLocked: 0
        });
        
        authorizedProtocols[protocol] = true;
        protocolList.push(protocol);
        
        emit ProtocolAdded(protocol, name);
    }

    /**
     * @dev Add a new position to user's portfolio
     */
    function addPosition(
        address user,
        address protocol,
        address asset,
        uint256 amount,
        uint256 shares,
        PositionType positionType
    ) external {
        require(authorizedProtocols[msg.sender], "Unauthorized protocol");
        require(user != address(0), "Invalid user address");
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Invalid amount");
        
        uint256 positionId = nextPositionId++;
        (uint256 entryPrice,) = priceOracle.getPrice(asset);
        
        positions[positionId] = Position({
            protocol: protocol,
            asset: asset,
            amount: amount,
            shares: shares,
            entryPrice: entryPrice,
            timestamp: block.timestamp,
            positionType: positionType,
            active: true
        });
        
        Portfolio storage portfolio = portfolios[user];
        portfolio.positionIds.push(positionId);
        portfolio.assetBalances[asset] += amount;
        portfolio.assetPositions[asset].push(positionId);
        
        _updatePortfolioValue(user);
        
        emit PositionAdded(user, positionId, protocol, asset, amount, positionType);
    }

    /**
     * @dev Update an existing position
     */
    function updatePosition(
        address user,
        uint256 positionId,
        uint256 newAmount,
        uint256 newShares
    ) external {
        Position storage position = positions[positionId];
        require(position.active, "Position not active");
        require(authorizedProtocols[msg.sender], "Unauthorized");
        
        Portfolio storage portfolio = portfolios[user];
        
        // Update asset balance
        portfolio.assetBalances[position.asset] = 
            portfolio.assetBalances[position.asset] - position.amount + newAmount;
        
        position.amount = newAmount;
        position.shares = newShares;
        
        _updatePortfolioValue(user);
        
        emit PositionUpdated(user, positionId, newAmount, newShares);
    }

    /**
     * @dev Close a position
     */
    function closePosition(
        address user,
        uint256 positionId,
        uint256 finalAmount
    ) external {
        Position storage position = positions[positionId];
        require(position.active, "Position not active");
        require(authorizedProtocols[msg.sender], "Unauthorized");
        
        Portfolio storage portfolio = portfolios[user];
        
        // Calculate P&L
        (uint256 currentPrice,) = priceOracle.getPrice(position.asset);
        int256 pnl = int256((finalAmount * currentPrice) / 1e18) - int256((position.amount * position.entryPrice) / 1e18);
        
        // Update portfolio
        portfolio.assetBalances[position.asset] -= position.amount;
        position.active = false;
        
        _updatePortfolioValue(user);
        
        emit PositionClosed(user, positionId, finalAmount, pnl);
    }

    /**
     * @dev Get user's complete portfolio
     */
    function getPortfolio(address user) external view returns (
        uint256[] memory positionIds,
        uint256 totalValueUSD,
        uint256 lastUpdateTime
    ) {
        Portfolio storage portfolio = portfolios[user];
        return (
            portfolio.positionIds,
            portfolio.totalValueUSD,
            portfolio.lastUpdateTime
        );
    }

    /**
     * @dev Get detailed position information
     */
    function getPosition(uint256 positionId) external view returns (
        address protocol,
        address asset,
        uint256 amount,
        uint256 shares,
        uint256 entryPrice,
        uint256 currentPrice,
        uint256 currentValueUSD,
        int256 pnl,
        PositionType positionType,
        bool active
    ) {
        Position storage position = positions[positionId];
        (currentPrice,) = priceOracle.getPrice(position.asset);
        currentValueUSD = (position.amount * currentPrice) / 1e18;
        pnl = int256(currentValueUSD) - int256((position.amount * position.entryPrice) / 1e18);
        
        return (
            position.protocol,
            position.asset,
            position.amount,
            position.shares,
            position.entryPrice,
            currentPrice,
            currentValueUSD,
            pnl,
            position.positionType,
            position.active
        );
    }

    /**
     * @dev Get user's asset balances
     */
    function getAssetBalances(address user) external view returns (
        address[] memory assets,
        uint256[] memory balances,
        uint256[] memory valuesUSD
    ) {
        Portfolio storage portfolio = portfolios[user];
        uint256 assetCount = 0;
        
        // Count unique assets
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                assetCount++;
            }
        }
        
        assets = new address[](assetCount);
        balances = new uint256[](assetCount);
        valuesUSD = new uint256[](assetCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                assets[index] = position.asset;
                balances[index] = portfolio.assetBalances[position.asset];
                (uint256 assetPrice,) = priceOracle.getPrice(position.asset);
                valuesUSD[index] = (balances[index] * assetPrice) / 1e18;
                index++;
            }
        }
    }

    /**
     * @dev Get portfolio performance metrics
     */
    function getPerformanceMetrics(address user) external view returns (PerformanceMetrics memory metrics) {
        Portfolio storage portfolio = portfolios[user];
        
        uint256 totalInvested = 0;
        uint256 currentValue = 0;
        uint256 totalPositions = 0;
        
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                uint256 investedValue = (position.amount * position.entryPrice) / 1e18;
                (uint256 currentAssetPrice,) = priceOracle.getPrice(position.asset);
                uint256 currentPositionValue = (position.amount * currentAssetPrice) / 1e18;
                
                totalInvested += investedValue;
                currentValue += currentPositionValue;
                totalPositions++;
            }
        }
        
        metrics.totalInvested = totalInvested;
        metrics.currentValue = currentValue;
        metrics.totalPnL = int256(currentValue) - int256(totalInvested);
        metrics.totalRewards = 0; // To be implemented with protocol-specific reward tracking
        metrics.avgAPY = totalPositions > 0 ? _calculateAvgAPY(user) : 0;
        metrics.riskScore = _calculateRiskScore(user);
    }

    /**
     * @dev Get positions by asset
     */
    function getPositionsByAsset(address user, address asset) external view returns (uint256[] memory) {
        return portfolios[user].assetPositions[asset];
    }

    /**
     * @dev Get all supported protocols
     */
    function getSupportedProtocols() external view returns (address[] memory) {
        return protocolList;
    }

    /**
     * @dev Get protocol information
     */
    function getProtocolInfo(address protocol) external view returns (ProtocolInfo memory) {
        return protocols[protocol];
    }

    /**
     * @dev Update portfolio value (can be called by anyone for gas optimization)
     */
    function updatePortfolioValue(address user) external {
        _updatePortfolioValue(user);
    }

    /**
     * @dev Batch update multiple portfolios
     */
    function batchUpdatePortfolios(address[] calldata users) external {
        for (uint256 i = 0; i < users.length; i++) {
            _updatePortfolioValue(users[i]);
        }
    }

    // Internal functions
    function _updatePortfolioValue(address user) internal {
        Portfolio storage portfolio = portfolios[user];
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                (uint256 currentPrice,) = priceOracle.getPrice(position.asset);
                totalValue += (position.amount * currentPrice) / 1e18;
            }
        }
        
        portfolio.totalValueUSD = totalValue;
        portfolio.lastUpdateTime = block.timestamp;
        
        emit PortfolioUpdated(user, totalValue, block.timestamp);
    }

    function _calculateAvgAPY(address user) internal view returns (uint256) {
        // Simplified APY calculation - to be enhanced with protocol-specific data
        Portfolio storage portfolio = portfolios[user];
        uint256 totalAPY = 0;
        uint256 activePositions = 0;
        
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                // Mock APY calculation based on position type
                uint256 apy = _getEstimatedAPY(position.positionType);
                totalAPY += apy;
                activePositions++;
            }
        }
        
        return activePositions > 0 ? totalAPY / activePositions : 0;
    }

    function _calculateRiskScore(address user) internal view returns (uint256) {
        // Simplified risk score calculation (1-100, where 100 is highest risk)
        Portfolio storage portfolio = portfolios[user];
        uint256 totalRisk = 0;
        uint256 activePositions = 0;
        
        for (uint256 i = 0; i < portfolio.positionIds.length; i++) {
            Position storage position = positions[portfolio.positionIds[i]];
            if (position.active) {
                uint256 risk = _getPositionRisk(position.positionType);
                totalRisk += risk;
                activePositions++;
            }
        }
        
        return activePositions > 0 ? totalRisk / activePositions : 0;
    }

    function _getEstimatedAPY(PositionType positionType) internal pure returns (uint256) {
        // Mock APY values - to be replaced with real protocol data
        if (positionType == PositionType.VAULT_DEPOSIT) return 800; // 8%
        if (positionType == PositionType.LIQUIDITY_POOL) return 1200; // 12%
        if (positionType == PositionType.LENDING) return 500; // 5%
        if (positionType == PositionType.STAKING) return 1000; // 10%
        if (positionType == PositionType.FARMING) return 1500; // 15%
        return 300; // 3% default
    }

    function _getPositionRisk(PositionType positionType) internal pure returns (uint256) {
        // Risk scores (1-100)
        if (positionType == PositionType.VAULT_DEPOSIT) return 30;
        if (positionType == PositionType.LIQUIDITY_POOL) return 60;
        if (positionType == PositionType.LENDING) return 20;
        if (positionType == PositionType.BORROWING) return 80;
        if (positionType == PositionType.STAKING) return 40;
        if (positionType == PositionType.FARMING) return 70;
        return 50; // Default medium risk
    }
}