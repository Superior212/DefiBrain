// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DEXRouter.sol";
import "../src/PriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DEXRouterTest is Test {
    DEXRouter public dexRouter;
    PriceOracle public priceOracle;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        priceOracle = new PriceOracle();
        dexRouter = new DEXRouter(address(priceOracle));
        
        // Deploy mock tokens
        tokenA = new MockERC20("Token A", "TKNA");
        tokenB = new MockERC20("Token B", "TKNB");
        
        // Add supported tokens
        dexRouter.addSupportedToken(address(tokenA));
        dexRouter.addSupportedToken(address(tokenB));
        
        // Create pool
        dexRouter.createPool(address(tokenA), address(tokenB));
        
        vm.stopPrank();
        
        // Mint tokens to user
        tokenA.mint(user, 100000 * 10**18);
        tokenB.mint(user, 100000 * 10**18);
        
        // Mint tokens to router for liquidity
        tokenA.mint(address(dexRouter), 1000 * 10**18);
        tokenB.mint(address(dexRouter), 1000 * 10**18);
    }
    
    function test_Deployment() public {
        assertEq(address(dexRouter.priceOracle()), address(priceOracle));
        assertEq(dexRouter.tradingFee(), 30);
        assertTrue(dexRouter.supportedTokens(address(tokenA)));
        assertTrue(dexRouter.supportedTokens(address(tokenB)));
    }
    
    function test_AddSupportedToken() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKNC");
        
        vm.prank(owner);
        dexRouter.addSupportedToken(address(tokenC));
        
        assertTrue(dexRouter.supportedTokens(address(tokenC)));
        
        address[] memory tokens = dexRouter.getSupportedTokens();
        assertEq(tokens.length, 3);
        assertEq(tokens[2], address(tokenC));
    }
    
    function test_CreatePool() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKNC");
        MockERC20 tokenD = new MockERC20("Token D", "TKND");
        
        vm.startPrank(owner);
        dexRouter.addSupportedToken(address(tokenC));
        dexRouter.addSupportedToken(address(tokenD));
        
        bytes32 poolId = dexRouter.createPool(address(tokenC), address(tokenD));
        
        (address tokenAAddr, address tokenBAddr, uint256 reserveA, uint256 reserveB, uint256 totalLiquidity, bool active) = 
            dexRouter.getPoolInfo(poolId);
        
        assertTrue(active);
        assertEq(reserveA, 0);
        assertEq(reserveB, 0);
        assertEq(totalLiquidity, 0);
        
        vm.stopPrank();
    }
    
    function test_AddLiquidity() public {
        vm.startPrank(user);
        
        uint256 amountA = 100 * 10**18;
        uint256 amountB = 100 * 10**18;
        
        tokenA.approve(address(dexRouter), amountA);
        tokenB.approve(address(dexRouter), amountB);
        
        (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) = 
            dexRouter.addLiquidity(
                address(tokenA),
                address(tokenB),
                amountA,
                amountB,
                amountA,
                amountB
            );
        
        assertEq(actualAmountA, amountA);
        assertEq(actualAmountB, amountB);
        assertGt(liquidity, 0);
        
        vm.stopPrank();
    }
    
    function test_GetAmountOut() public {
        // First add liquidity
        vm.startPrank(user);
        
        uint256 liquidityA = 1000 * 10**18;
        uint256 liquidityB = 1000 * 10**18;
        
        tokenA.approve(address(dexRouter), liquidityA);
        tokenB.approve(address(dexRouter), liquidityB);
        
        dexRouter.addLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityA,
            liquidityB,
            liquidityA,
            liquidityB
        );
        
        // Test quote
        uint256 amountIn = 10 * 10**18;
        (uint256 amountOut, uint256 fee) = dexRouter.getAmountOut(
            amountIn,
            address(tokenA),
            address(tokenB)
        );
        
        assertGt(amountOut, 0);
        assertEq(fee, (amountIn * 30) / 10000); // 0.3% fee
        
        vm.stopPrank();
    }
    
    function test_SwapTokens() public {
        // First add liquidity
        vm.startPrank(user);
        
        uint256 liquidityA = 1000 * 10**18;
        uint256 liquidityB = 1000 * 10**18;
        
        tokenA.approve(address(dexRouter), liquidityA + 100 * 10**18);
        tokenB.approve(address(dexRouter), liquidityB);
        
        dexRouter.addLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityA,
            liquidityB,
            liquidityA,
            liquidityB
        );
        
        // Perform swap
        uint256 amountIn = 10 * 10**18;
        uint256 balanceBefore = tokenB.balanceOf(user);
        
        (uint256 expectedAmountOut,) = dexRouter.getAmountOut(
            amountIn,
            address(tokenA),
            address(tokenB)
        );
        
        uint256 actualAmountOut = dexRouter.swapTokens(
            address(tokenA),
            address(tokenB),
            amountIn,
            expectedAmountOut,
            user
        );
        
        uint256 balanceAfter = tokenB.balanceOf(user);
        
        assertEq(actualAmountOut, expectedAmountOut);
        assertEq(balanceAfter - balanceBefore, actualAmountOut);
        
        vm.stopPrank();
    }
    
    function test_RemoveLiquidity() public {
        // First add liquidity
        vm.startPrank(user);
        
        uint256 liquidityA = 1000 * 10**18;
        uint256 liquidityB = 1000 * 10**18;
        
        tokenA.approve(address(dexRouter), liquidityA);
        tokenB.approve(address(dexRouter), liquidityB);
        
        (,, uint256 liquidity) = dexRouter.addLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityA,
            liquidityB,
            liquidityA,
            liquidityB
        );
        
        // Remove half the liquidity
        uint256 liquidityToRemove = liquidity / 2;
        uint256 balanceABefore = tokenA.balanceOf(user);
        uint256 balanceBBefore = tokenB.balanceOf(user);
        
        (uint256 amountA, uint256 amountB) = dexRouter.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityToRemove,
            0,
            0
        );
        
        uint256 balanceAAfter = tokenA.balanceOf(user);
        uint256 balanceBAfter = tokenB.balanceOf(user);
        
        assertGt(amountA, 0);
        assertGt(amountB, 0);
        assertEq(balanceAAfter - balanceABefore, amountA);
        assertEq(balanceBAfter - balanceBBefore, amountB);
        
        vm.stopPrank();
    }
    
    function test_SetTradingFee() public {
        vm.prank(owner);
        dexRouter.setTradingFee(50); // 0.5%
        
        assertEq(dexRouter.tradingFee(), 50);
    }
    
    function test_RevertOnHighFee() public {
        vm.prank(owner);
        vm.expectRevert("Fee too high");
        dexRouter.setTradingFee(1001); // > 10%
    }
    
    function test_RevertOnUnsupportedTokens() public {
        MockERC20 tokenC = new MockERC20("Token C", "TKNC");
        
        vm.expectRevert("Unsupported tokens");
        dexRouter.getAmountOut(100, address(tokenC), address(tokenA));
    }
    
    function test_GetAllPools() public {
        bytes32[] memory pools = dexRouter.getAllPools();
        assertEq(pools.length, 1);
    }
    
    function testFuzz_SwapAmounts(uint256 amountIn) public {
        // Bound the fuzz input to reasonable values
        amountIn = bound(amountIn, 1 * 10**18, 100 * 10**18);
        
        // Setup liquidity first
        vm.startPrank(user);
        
        uint256 liquidityA = 10000 * 10**18;
        uint256 liquidityB = 10000 * 10**18;
        
        tokenA.approve(address(dexRouter), liquidityA + amountIn);
        tokenB.approve(address(dexRouter), liquidityB);
        
        dexRouter.addLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityA,
            liquidityB,
            liquidityA,
            liquidityB
        );
        
        // Test swap
        (uint256 expectedAmountOut,) = dexRouter.getAmountOut(
            amountIn,
            address(tokenA),
            address(tokenB)
        );
        
        uint256 actualAmountOut = dexRouter.swapTokens(
            address(tokenA),
            address(tokenB),
            amountIn,
            0, // No slippage protection for fuzz test
            user
        );
        
        assertEq(actualAmountOut, expectedAmountOut);
        assertGt(actualAmountOut, 0);
        
        vm.stopPrank();
    }
}