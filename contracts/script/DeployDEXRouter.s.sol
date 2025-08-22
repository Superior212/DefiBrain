// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DEXRouter.sol";
import "../src/PriceOracle.sol";

contract DeployDEXRouter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Use the already deployed PriceOracle address
        address priceOracleAddress = 0x1d0E37FAB51be12fC9dDEE4C16663a41B4388CC4;
        
        // Deploy DEXRouter
        DEXRouter dexRouter = new DEXRouter(priceOracleAddress);
        
        console.log("DEXRouter deployed to:", address(dexRouter));
        
        vm.stopBroadcast();
    }
}