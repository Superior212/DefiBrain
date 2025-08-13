// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DefiBrainVault} from "../src/DefiBrainVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract DefiBrainVaultScript is Script {
    DefiBrainVault public vault;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Example deployment with a mock USDC address
        // In production, use actual token addresses
        address mockUSDC = address(0x1234567890123456789012345678901234567890);
        
        vault = new DefiBrainVault(
            IERC20Metadata(mockUSDC),
            "DefiBrain USDC Vault",
            "dbUSDC"
        );

        console.log("DefiBrainVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
