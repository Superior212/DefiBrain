// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DefiBrainVault} from "../src/DefiBrainVault.sol";
import {USDC} from "../src/USDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract DefiBrainVaultScript is Script {
    DefiBrainVault public vault;
    USDC public usdc;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy the USDC token first
        usdc = new USDC();
        console.log("USDC deployed at:", address(usdc));
        console.log("USDC decimals:", usdc.decimals());
        console.log("USDC total supply:", usdc.totalSupply());

        // Deploy the DefiBrainVault with the USDC token
        vault = new DefiBrainVault(
            IERC20Metadata(address(usdc)),
            "DefiBrain USDC Vault",
            "dbUSDC"
        );
        console.log("DefiBrainVault deployed at:", address(vault));

        // Approve the vault to spend some tokens
        uint256 initialDeposit = 1_000 * 10 ** usdc.decimals(); // 1,000 USDC (reduced amount)
        usdc.approve(address(vault), initialDeposit);
        console.log("Approved vault to spend:", initialDeposit);

        // Check balance before deposit
        uint256 balance = usdc.balanceOf(msg.sender);
        console.log("Deployer USDC balance:", balance);
        
        // Make an initial deposit to the vault (only if we have enough balance)
        if (balance >= initialDeposit) {
            vault.deposit(initialDeposit, msg.sender);
            console.log("Initial deposit made:", initialDeposit);
        } else {
            console.log("Insufficient balance for initial deposit");
        }

        vm.stopBroadcast();
    }
}
