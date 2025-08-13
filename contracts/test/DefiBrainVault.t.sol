// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {DefiBrainVault} from "../src/DefiBrainVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract DefiBrainVaultTest is Test {
    DefiBrainVault public vault;
    ERC20Mock public mockToken;
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // Deploy mock ERC20 token
        mockToken = new ERC20Mock();
        
        // Deploy DefiBrainVault
        vault = new DefiBrainVault(
            IERC20Metadata(address(mockToken)),
            "DefiBrain Test Vault",
            "dbTEST"
        );
        
        // Mint tokens to users
        mockToken.mint(user1, 1000e18);
        mockToken.mint(user2, 1000e18);
    }
    
    function test_Deployment() public {
        assertEq(address(vault.asset()), address(mockToken));
        assertEq(vault.name(), "DefiBrain Test Vault");
        assertEq(vault.symbol(), "dbTEST");
        assertEq(vault.decimals(), 18);
    }
    
    function test_Deposit() public {
        uint256 depositAmount = 100e18;
        
        vm.startPrank(user1);
        mockToken.approve(address(vault), depositAmount);
        
        uint256 shares = vault.deposit(depositAmount, user1);
        
        assertEq(shares, depositAmount); // 1:1 ratio for first deposit
        assertEq(vault.balanceOf(user1), depositAmount);
        assertEq(vault.totalAssets(), depositAmount);
        assertEq(vault.totalShares(), depositAmount);
        vm.stopPrank();
    }
    
    function test_Redeem() public {
        uint256 depositAmount = 100e18;
        
        // First deposit
        vm.startPrank(user1);
        mockToken.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user1);
        
        // Redeem half
        uint256 redeemShares = shares / 2;
        uint256 assets = vault.redeem(redeemShares, user1, user1);
        
        assertEq(assets, depositAmount / 2);
        assertEq(vault.balanceOf(user1), shares - redeemShares);
        vm.stopPrank();
    }
    
    function testFuzz_DepositRedeem(uint256 amount) public {
        // Bound the amount to reasonable values
        amount = bound(amount, 1e18, 1000e18);
        
        vm.startPrank(user1);
        mockToken.approve(address(vault), amount);
        
        uint256 shares = vault.deposit(amount, user1);
        uint256 assets = vault.redeem(shares, user1, user1);
        
        // Should get back the same amount (minus any rounding)
        assertApproxEqAbs(assets, amount, 1);
        vm.stopPrank();
    }
}
