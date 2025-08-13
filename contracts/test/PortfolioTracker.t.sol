// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PortfolioTracker.sol";
import "../src/PriceOracle.sol";
import "../src/DEXRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockPriceOracle {
    mapping(address => uint256) public prices;
    
    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }
    
    function getPrice(address asset) external view returns (uint256, uint256) {
        return (prices[asset], block.timestamp);
    }
}

contract PortfolioTrackerTest is Test {
    PortfolioTracker public portfolioTracker;
    MockPriceOracle public priceOracle;
    DEXRouter public dexRouter;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public protocol = address(0x3);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        priceOracle = new MockPriceOracle();
        dexRouter = new DEXRouter(address(priceOracle));
        portfolioTracker = new PortfolioTracker(address(priceOracle), address(dexRouter));
        
        // Deploy mock tokens
        tokenA = new MockERC20("Token A", "TKNA");
        tokenB = new MockERC20("Token B", "TKNB");
        
        // Set mock prices
        priceOracle.setPrice(address(tokenA), 1000 * 10**18); // $1000
        priceOracle.setPrice(address(tokenB), 500 * 10**18);  // $500
        
        // Add protocol
        portfolioTracker.addProtocol(protocol, "Test Protocol");
        
        vm.stopPrank();
    }
    
    function test_Deployment() public {
        assertEq(address(portfolioTracker.priceOracle()), address(priceOracle));
        assertEq(address(portfolioTracker.dexRouter()), address(dexRouter));
        assertTrue(portfolioTracker.authorizedProtocols(protocol));
    }
    
    function test_AddProtocol() public {
        address newProtocol = address(0x4);
        
        vm.prank(owner);
        portfolioTracker.addProtocol(newProtocol, "New Protocol");
        
        assertTrue(portfolioTracker.authorizedProtocols(newProtocol));
        
        PortfolioTracker.ProtocolInfo memory info = portfolioTracker.getProtocolInfo(newProtocol);
        assertEq(info.name, "New Protocol");
        assertEq(info.contractAddress, newProtocol);
        assertTrue(info.active);
    }
    
    function test_AddPosition() public {
        uint256 amount = 10 * 10**18;
        uint256 shares = 5 * 10**18;
        
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            shares,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Check portfolio
        (uint256[] memory positionIds, uint256 totalValueUSD, uint256 lastUpdateTime) = 
            portfolioTracker.getPortfolio(user);
        
        assertEq(positionIds.length, 1);
        assertEq(positionIds[0], 1);
        assertGt(totalValueUSD, 0);
        assertGt(lastUpdateTime, 0);
        
        // Check position details
        (
            address protocolAddr,
            address asset,
            uint256 posAmount,
            uint256 posShares,
            uint256 entryPrice,
            uint256 currentPrice,
            uint256 currentValueUSD,
            int256 pnl,
            PortfolioTracker.PositionType positionType,
            bool active
        ) = portfolioTracker.getPosition(1);
        
        assertEq(protocolAddr, protocol);
        assertEq(asset, address(tokenA));
        assertEq(posAmount, amount);
        assertEq(posShares, shares);
        assertEq(entryPrice, 1000 * 10**18);
        assertEq(currentPrice, 1000 * 10**18);
        assertTrue(active);
        assertEq(uint256(positionType), uint256(PortfolioTracker.PositionType.VAULT_DEPOSIT));
    }
    
    function test_UpdatePosition() public {
        uint256 initialAmount = 10 * 10**18;
        uint256 newAmount = 15 * 10**18;
        uint256 newShares = 7 * 10**18;
        
        // Add initial position
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            initialAmount,
            5 * 10**18,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Update position
        vm.prank(protocol);
        portfolioTracker.updatePosition(user, 1, newAmount, newShares);
        
        // Check updated position
        (,, uint256 amount, uint256 shares,,,,,,) = portfolioTracker.getPosition(1);
        
        assertEq(amount, newAmount);
        assertEq(shares, newShares);
    }
    
    function test_ClosePosition() public {
        uint256 amount = 10 * 10**18;
        uint256 finalAmount = 12 * 10**18; // Profit
        
        // Add position
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            5 * 10**18,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Close position
        vm.prank(protocol);
        portfolioTracker.closePosition(user, 1, finalAmount);
        
        // Check position is inactive
        (,,,,,,,, PortfolioTracker.PositionType posType, bool active) = portfolioTracker.getPosition(1);
        assertFalse(active);
    }
    
    function test_GetAssetBalances() public {
        uint256 amountA = 10 * 10**18;
        uint256 amountB = 5 * 10**18;
        
        // Add positions for different assets
        vm.startPrank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amountA,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenB),
            amountB,
            0,
            PortfolioTracker.PositionType.LENDING
        );
        vm.stopPrank();
        
        // Get asset balances
        (address[] memory assets, uint256[] memory balances, uint256[] memory valuesUSD) = 
            portfolioTracker.getAssetBalances(user);
        
        assertEq(assets.length, 2);
        assertEq(balances.length, 2);
        assertEq(valuesUSD.length, 2);
        
        // Check values
        bool foundTokenA = false;
        bool foundTokenB = false;
        
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(tokenA)) {
                foundTokenA = true;
                assertEq(balances[i], amountA);
                assertEq(valuesUSD[i], (amountA * 1000 * 10**18) / 10**18);
            } else if (assets[i] == address(tokenB)) {
                foundTokenB = true;
                assertEq(balances[i], amountB);
                assertEq(valuesUSD[i], (amountB * 500 * 10**18) / 10**18);
            }
        }
        
        assertTrue(foundTokenA);
        assertTrue(foundTokenB);
    }
    
    function test_GetPerformanceMetrics() public {
        uint256 amount = 10 * 10**18;
        
        // Add position
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Get performance metrics
        PortfolioTracker.PerformanceMetrics memory metrics = 
            portfolioTracker.getPerformanceMetrics(user);
        
        assertGt(metrics.totalInvested, 0);
        assertGt(metrics.currentValue, 0);
        assertEq(metrics.totalInvested, metrics.currentValue); // No price change
        assertEq(metrics.totalPnL, 0); // No profit/loss
        assertGt(metrics.avgAPY, 0);
        assertGt(metrics.riskScore, 0);
    }
    
    function test_GetPerformanceMetricsWithProfitLoss() public {
        uint256 amount = 10 * 10**18;
        
        // Add position
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Change price to simulate profit
        priceOracle.setPrice(address(tokenA), 1200 * 10**18); // +20%
        
        // Get performance metrics
        PortfolioTracker.PerformanceMetrics memory metrics = 
            portfolioTracker.getPerformanceMetrics(user);
        
        assertGt(metrics.currentValue, metrics.totalInvested);
        assertGt(metrics.totalPnL, 0); // Should have profit
    }
    
    function test_UpdatePortfolioValue() public {
        uint256 amount = 10 * 10**18;
        
        // Add position
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Get initial portfolio value
        (, uint256 initialValue,) = portfolioTracker.getPortfolio(user);
        
        // Change price
        priceOracle.setPrice(address(tokenA), 1500 * 10**18); // +50%
        
        // Update portfolio value
        portfolioTracker.updatePortfolioValue(user);
        
        // Check updated value
        (, uint256 newValue,) = portfolioTracker.getPortfolio(user);
        
        assertGt(newValue, initialValue);
    }
    
    function test_BatchUpdatePortfolios() public {
        address user2 = address(0x5);
        uint256 amount = 10 * 10**18;
        
        // Add positions for multiple users
        vm.startPrank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        portfolioTracker.addPosition(
            user2,
            protocol,
            address(tokenB),
            amount,
            0,
            PortfolioTracker.PositionType.LENDING
        );
        vm.stopPrank();
        
        // Batch update
        address[] memory users = new address[](2);
        users[0] = user;
        users[1] = user2;
        
        portfolioTracker.batchUpdatePortfolios(users);
        
        // Check both portfolios were updated
        (, uint256 value1, uint256 time1) = portfolioTracker.getPortfolio(user);
        (, uint256 value2, uint256 time2) = portfolioTracker.getPortfolio(user2);
        
        assertGt(value1, 0);
        assertGt(value2, 0);
        assertGt(time1, 0);
        assertGt(time2, 0);
    }
    
    function test_GetPositionsByAsset() public {
        uint256 amount1 = 10 * 10**18;
        uint256 amount2 = 5 * 10**18;
        
        // Add multiple positions for the same asset
        vm.startPrank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount1,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount2,
            0,
            PortfolioTracker.PositionType.LENDING
        );
        vm.stopPrank();
        
        // Get positions by asset
        uint256[] memory positions = portfolioTracker.getPositionsByAsset(user, address(tokenA));
        
        assertEq(positions.length, 2);
        assertEq(positions[0], 1);
        assertEq(positions[1], 2);
    }
    
    function test_GetSupportedProtocols() public {
        address[] memory protocols = portfolioTracker.getSupportedProtocols();
        assertEq(protocols.length, 1);
        assertEq(protocols[0], protocol);
    }
    
    function test_RevertUnauthorizedProtocol() public {
        address unauthorizedProtocol = address(0x6);
        
        vm.prank(unauthorizedProtocol);
        vm.expectRevert("Unauthorized protocol");
        portfolioTracker.addPosition(
            user,
            unauthorizedProtocol,
            address(tokenA),
            10 * 10**18,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
    }
    
    function test_RevertInvalidUser() public {
        vm.prank(protocol);
        vm.expectRevert("Invalid user address");
        portfolioTracker.addPosition(
            address(0),
            protocol,
            address(tokenA),
            10 * 10**18,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
    }
    
    function test_RevertInvalidAmount() public {
        vm.prank(protocol);
        vm.expectRevert("Invalid amount");
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            0,
            0,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
    }
    
    function testFuzz_AddPosition(uint256 amount, uint256 shares) public {
        // Bound inputs to reasonable values
        amount = bound(amount, 1 * 10**18, 1000 * 10**18);
        shares = bound(shares, 0, amount);
        
        vm.prank(protocol);
        portfolioTracker.addPosition(
            user,
            protocol,
            address(tokenA),
            amount,
            shares,
            PortfolioTracker.PositionType.VAULT_DEPOSIT
        );
        
        // Check position was added correctly
        (,, uint256 posAmount, uint256 posShares,,,,,,bool active) = 
            portfolioTracker.getPosition(1);
        
        assertEq(posAmount, amount);
        assertEq(posShares, shares);
        assertTrue(active);
    }
}