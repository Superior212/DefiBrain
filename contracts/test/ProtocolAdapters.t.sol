// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ProtocolAdapters.sol";
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

contract ProtocolAdaptersTest is Test {
    ProtocolAdapters public protocolAdapters;
    PortfolioTracker public portfolioTracker;
    MockPriceOracle public priceOracle;
    DEXRouter public dexRouter;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public lendingProtocol = address(0x3);
    address public yieldProtocol = address(0x4);
    address public stakingProtocol = address(0x5);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        priceOracle = new MockPriceOracle();
        dexRouter = new DEXRouter(address(priceOracle));
        portfolioTracker = new PortfolioTracker(address(priceOracle), address(dexRouter));
        protocolAdapters = new ProtocolAdapters(address(portfolioTracker), address(priceOracle));
        
        // Deploy mock tokens
        tokenA = new MockERC20("Token A", "TKNA");
        tokenB = new MockERC20("Token B", "TKNB");
        
        // Set mock prices
        priceOracle.setPrice(address(tokenA), 1000 * 10**18); // $1000
        priceOracle.setPrice(address(tokenB), 500 * 10**18);  // $500
        
        // Register protocols
        bytes4[] memory lendingFunctions = new bytes4[](2);
        lendingFunctions[0] = bytes4(keccak256("supply(address,uint256)"));
        lendingFunctions[1] = bytes4(keccak256("borrow(address,uint256)"));
        
        protocolAdapters.registerAdapter(
            lendingProtocol,
            "Mock Lending Protocol",
            ProtocolAdapters.ProtocolType.LENDING,
            30, // Low risk
            lendingFunctions
        );
        
        bytes4[] memory yieldFunctions = new bytes4[](1);
        yieldFunctions[0] = bytes4(keccak256("deposit(address,uint256)"));
        
        protocolAdapters.registerAdapter(
            yieldProtocol,
            "Mock Yield Protocol",
            ProtocolAdapters.ProtocolType.YIELD_FARMING,
            60, // Medium risk
            yieldFunctions
        );
        
        bytes4[] memory stakingFunctions = new bytes4[](1);
        stakingFunctions[0] = bytes4(keccak256("stake(address,uint256)"));
        
        protocolAdapters.registerAdapter(
            stakingProtocol,
            "Mock Staking Protocol",
            ProtocolAdapters.ProtocolType.STAKING,
            40, // Medium-low risk
            stakingFunctions
        );
        
        // Add protocols to portfolio tracker
        portfolioTracker.addProtocol(lendingProtocol, "Mock Lending Protocol");
        portfolioTracker.addProtocol(yieldProtocol, "Mock Yield Protocol");
        portfolioTracker.addProtocol(stakingProtocol, "Mock Staking Protocol");
        portfolioTracker.addProtocol(address(protocolAdapters), "Protocol Adapters");
        
        // Set APY for protocols
        protocolAdapters.updateProtocolMetrics(lendingProtocol, 1000000 * 10**18, 500); // 5% APY
        protocolAdapters.updateProtocolMetrics(yieldProtocol, 2000000 * 10**18, 1200); // 12% APY
        protocolAdapters.updateProtocolMetrics(stakingProtocol, 500000 * 10**18, 800); // 8% APY
        
        vm.stopPrank();
        
        // Mint tokens to user and protocol adapters
        tokenA.mint(user, 10000 * 10**18);
        tokenB.mint(user, 10000 * 10**18);
        tokenA.mint(address(protocolAdapters), 10000 * 10**18);
        tokenB.mint(address(protocolAdapters), 10000 * 10**18);
    }
    
    function test_Deployment() public {
        assertEq(address(protocolAdapters.portfolioTracker()), address(portfolioTracker));
        assertEq(address(protocolAdapters.priceOracle()), address(priceOracle));
        assertTrue(protocolAdapters.authorizedProtocols(lendingProtocol));
        assertTrue(protocolAdapters.authorizedProtocols(yieldProtocol));
        assertTrue(protocolAdapters.authorizedProtocols(stakingProtocol));
    }
    
    function test_RegisterAdapter() public {
        address newProtocol = address(0x6);
        bytes4[] memory functions = new bytes4[](1);
        functions[0] = bytes4(keccak256("test()"));
        
        vm.prank(owner);
        protocolAdapters.registerAdapter(
            newProtocol,
            "New Protocol",
            ProtocolAdapters.ProtocolType.DEX,
            50,
            functions
        );
        
        assertTrue(protocolAdapters.authorizedProtocols(newProtocol));
        
        ProtocolAdapters.ProtocolAdapter memory adapter = protocolAdapters.getAdapter(newProtocol);
        assertEq(adapter.name, "New Protocol");
        assertEq(adapter.contractAddress, newProtocol);
        assertEq(uint256(adapter.protocolType), uint256(ProtocolAdapters.ProtocolType.DEX));
        assertEq(adapter.riskScore, 50);
        assertTrue(adapter.active);
    }
    
    function test_SupplyToLending() public {
        uint256 amount = 100 * 10**18;
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), amount);
        vm.stopPrank();
        
        // Check lending position
        ProtocolAdapters.LendingPosition memory position = 
            protocolAdapters.getLendingPosition(user, lendingProtocol);
        
        assertEq(position.protocol, lendingProtocol);
        assertEq(position.asset, address(tokenA));
        assertEq(position.supplied, amount);
        assertEq(position.borrowed, 0);
    }
    
    function test_WithdrawFromLending() public {
        uint256 supplyAmount = 100 * 10**18;
        uint256 withdrawAmount = 50 * 10**18;
        
        // First supply
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), supplyAmount);
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), supplyAmount);
        
        uint256 balanceBefore = tokenA.balanceOf(user);
        
        // Then withdraw
        protocolAdapters.withdrawFromLending(lendingProtocol, address(tokenA), withdrawAmount);
        vm.stopPrank();
        
        uint256 balanceAfter = tokenA.balanceOf(user);
        
        // Check balances
        assertEq(balanceAfter - balanceBefore, withdrawAmount);
        
        // Check position
        ProtocolAdapters.LendingPosition memory position = 
            protocolAdapters.getLendingPosition(user, lendingProtocol);
        assertEq(position.supplied, supplyAmount - withdrawAmount);
    }
    
    function test_BorrowFromLending() public {
        uint256 supplyAmount = 1000 * 10**18;
        uint256 borrowAmount = 100 * 10**18;
        
        // First supply collateral
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), supplyAmount);
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), supplyAmount);
        
        uint256 balanceBefore = tokenB.balanceOf(user);
        
        // Then borrow
        protocolAdapters.borrowFromLending(lendingProtocol, address(tokenB), borrowAmount);
        vm.stopPrank();
        
        uint256 balanceAfter = tokenB.balanceOf(user);
        
        // Check balances
        assertEq(balanceAfter - balanceBefore, borrowAmount);
        
        // Check position
        ProtocolAdapters.LendingPosition memory position = 
            protocolAdapters.getLendingPosition(user, lendingProtocol);
        assertEq(position.borrowed, borrowAmount);
    }
    
    function test_RepayToLending() public {
        uint256 supplyAmount = 1000 * 10**18;
        uint256 borrowAmount = 100 * 10**18;
        uint256 repayAmount = 50 * 10**18;
        
        // Supply, borrow, then repay
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), supplyAmount);
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), supplyAmount);
        
        protocolAdapters.borrowFromLending(lendingProtocol, address(tokenB), borrowAmount);
        
        tokenB.approve(address(protocolAdapters), repayAmount);
        protocolAdapters.repayToLending(lendingProtocol, address(tokenB), repayAmount);
        vm.stopPrank();
        
        // Check position
        ProtocolAdapters.LendingPosition memory position = 
            protocolAdapters.getLendingPosition(user, lendingProtocol);
        assertEq(position.borrowed, borrowAmount - repayAmount);
    }
    
    function test_DepositToYieldFarm() public {
        uint256 amount = 100 * 10**18;
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        
        uint256 shares = protocolAdapters.depositToYieldFarm(yieldProtocol, address(tokenA), amount);
        vm.stopPrank();
        
        assertGt(shares, 0);
        
        // Check yield position
        ProtocolAdapters.YieldPosition memory position = 
            protocolAdapters.getYieldPosition(user, yieldProtocol);
        
        assertEq(position.protocol, yieldProtocol);
        assertEq(position.asset, address(tokenA));
        assertEq(position.deposited, amount);
        assertEq(position.shares, shares);
        assertGt(position.apy, 0);
    }
    
    function test_WithdrawFromYieldFarm() public {
        uint256 depositAmount = 100 * 10**18;
        
        // First deposit
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), depositAmount);
        uint256 shares = protocolAdapters.depositToYieldFarm(yieldProtocol, address(tokenA), depositAmount);
        
        uint256 balanceBefore = tokenA.balanceOf(user);
        
        // Then withdraw half
        uint256 sharesToWithdraw = shares / 2;
        uint256 withdrawnAmount = protocolAdapters.withdrawFromYieldFarm(
            yieldProtocol, 
            address(tokenA), 
            sharesToWithdraw
        );
        vm.stopPrank();
        
        uint256 balanceAfter = tokenA.balanceOf(user);
        
        assertGt(withdrawnAmount, 0);
        assertEq(balanceAfter - balanceBefore, withdrawnAmount);
        
        // Check position
        ProtocolAdapters.YieldPosition memory position = 
            protocolAdapters.getYieldPosition(user, yieldProtocol);
        assertEq(position.shares, shares - sharesToWithdraw);
    }
    
    function test_StakeAssets() public {
        uint256 amount = 100 * 10**18;
        uint256 lockPeriod = 30 days;
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        
        protocolAdapters.stakeAssets(stakingProtocol, address(tokenA), amount, lockPeriod);
        vm.stopPrank();
        
        // Check staking position
        ProtocolAdapters.StakingPosition memory position = 
            protocolAdapters.getStakingPosition(user, stakingProtocol);
        
        assertEq(position.protocol, stakingProtocol);
        assertEq(position.asset, address(tokenA));
        assertEq(position.staked, amount);
        assertEq(position.lockPeriod, lockPeriod);
        assertEq(position.unlockTime, block.timestamp + lockPeriod);
    }
    
    function test_UnstakeAssets() public {
        uint256 amount = 100 * 10**18;
        uint256 lockPeriod = 30 days;
        
        // First stake
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        protocolAdapters.stakeAssets(stakingProtocol, address(tokenA), amount, lockPeriod);
        vm.stopPrank();
        
        // Fast forward time
        vm.warp(block.timestamp + lockPeriod + 1);
        
        uint256 balanceBefore = tokenA.balanceOf(user);
        
        // Unstake
        vm.prank(user);
        protocolAdapters.unstakeAssets(stakingProtocol, address(tokenA), amount);
        
        uint256 balanceAfter = tokenA.balanceOf(user);
        
        assertEq(balanceAfter - balanceBefore, amount);
        
        // Check position
        ProtocolAdapters.StakingPosition memory position = 
            protocolAdapters.getStakingPosition(user, stakingProtocol);
        assertEq(position.staked, 0);
    }
    
    function test_ClaimRewards() public {
        uint256 amount = 100 * 10**18;
        
        // Deposit to yield farm
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        protocolAdapters.depositToYieldFarm(yieldProtocol, address(tokenA), amount);
        vm.stopPrank();
        
        // Fast forward time to accrue rewards
        vm.warp(block.timestamp + 365 days);
        
        uint256 balanceBefore = tokenA.balanceOf(user);
        
        // Claim rewards
        vm.prank(user);
        uint256 rewards = protocolAdapters.claimRewards(yieldProtocol, address(tokenA));
        
        uint256 balanceAfter = tokenA.balanceOf(user);
        
        if (rewards > 0) {
            assertEq(balanceAfter - balanceBefore, rewards);
        }
    }
    
    function test_GetSupportedProtocols() public {
        address[] memory protocols = protocolAdapters.getSupportedProtocols();
        assertEq(protocols.length, 3);
        
        bool foundLending = false;
        bool foundYield = false;
        bool foundStaking = false;
        
        for (uint256 i = 0; i < protocols.length; i++) {
            if (protocols[i] == lendingProtocol) foundLending = true;
            if (protocols[i] == yieldProtocol) foundYield = true;
            if (protocols[i] == stakingProtocol) foundStaking = true;
        }
        
        assertTrue(foundLending);
        assertTrue(foundYield);
        assertTrue(foundStaking);
    }
    
    function test_UpdateProtocolMetrics() public {
        uint256 newTVL = 1000000 * 10**18;
        uint256 newAPY = 1200; // 12%
        
        vm.prank(owner);
        protocolAdapters.updateProtocolMetrics(lendingProtocol, newTVL, newAPY);
        
        ProtocolAdapters.ProtocolAdapter memory adapter = protocolAdapters.getAdapter(lendingProtocol);
        assertEq(adapter.tvl, newTVL);
        assertEq(adapter.apy, newAPY);
    }
    
    function test_RevertUnsupportedProtocol() public {
        address unsupportedProtocol = address(0x999);
        
        vm.prank(user);
        vm.expectRevert("Protocol not supported");
        protocolAdapters.supplyToLending(unsupportedProtocol, address(tokenA), 100 * 10**18);
    }
    
    function test_RevertWrongProtocolType() public {
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), 100 * 10**18);
        
        vm.expectRevert("Not a lending protocol");
        protocolAdapters.supplyToLending(yieldProtocol, address(tokenA), 100 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_RevertInsufficientCollateral() public {
        uint256 supplyAmount = 100 * 10**18;
        uint256 borrowAmount = 1000 * 10**18; // Too much to borrow
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), supplyAmount);
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), supplyAmount);
        
        vm.expectRevert("Insufficient collateral");
        protocolAdapters.borrowFromLending(lendingProtocol, address(tokenB), borrowAmount);
        
        vm.stopPrank();
    }
    
    function test_RevertAssetsStillLocked() public {
        uint256 amount = 100 * 10**18;
        uint256 lockPeriod = 30 days;
        
        // Stake assets
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        protocolAdapters.stakeAssets(stakingProtocol, address(tokenA), amount, lockPeriod);
        
        // Try to unstake before lock period ends
        vm.expectRevert("Assets still locked");
        protocolAdapters.unstakeAssets(stakingProtocol, address(tokenA), amount);
        
        vm.stopPrank();
    }
    
    function test_RevertInvalidRiskScore() public {
        address newProtocol = address(0x7);
        bytes4[] memory functions = new bytes4[](1);
        functions[0] = bytes4(keccak256("test()"));
        
        vm.prank(owner);
        vm.expectRevert("Invalid risk score");
        protocolAdapters.registerAdapter(
            newProtocol,
            "Invalid Protocol",
            ProtocolAdapters.ProtocolType.DEX,
            101, // Invalid risk score > 100
            functions
        );
    }
    
    function testFuzz_SupplyToLending(uint256 amount) public {
        // Bound amount to reasonable values
        amount = bound(amount, 1 * 10**18, 1000 * 10**18);
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        
        protocolAdapters.supplyToLending(lendingProtocol, address(tokenA), amount);
        vm.stopPrank();
        
        // Check position
        ProtocolAdapters.LendingPosition memory position = 
            protocolAdapters.getLendingPosition(user, lendingProtocol);
        
        assertEq(position.supplied, amount);
        assertEq(position.protocol, lendingProtocol);
        assertEq(position.asset, address(tokenA));
    }
    
    function testFuzz_DepositToYieldFarm(uint256 amount) public {
        // Bound amount to reasonable values
        amount = bound(amount, 1 * 10**18, 1000 * 10**18);
        
        vm.startPrank(user);
        tokenA.approve(address(protocolAdapters), amount);
        
        uint256 shares = protocolAdapters.depositToYieldFarm(yieldProtocol, address(tokenA), amount);
        vm.stopPrank();
        
        assertGt(shares, 0);
        
        // Check position
        ProtocolAdapters.YieldPosition memory position = 
            protocolAdapters.getYieldPosition(user, yieldProtocol);
        
        assertEq(position.deposited, amount);
        assertEq(position.shares, shares);
    }
}