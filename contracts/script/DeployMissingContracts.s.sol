// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";
import "../src/DEXRouter.sol";
import "../src/PortfolioTracker.sol";
import "../src/ProtocolAdapters.sol";
import "../src/YieldFarmingStrategy.sol";

contract DeployMissingContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Deploying Missing Core Contracts ====");
        console.log("Deployer address:", deployer);
        console.log("Chain ID:", block.chainid);
        
        // Verify we're on Mantle Sepolia Testnet
        require(block.chainid == 5003, "Not on Mantle Sepolia Testnet (Chain ID: 5003)");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy PriceOracle
        console.log("Deploying PriceOracle...");
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));
        
        // Deploy DEXRouter
        console.log("Deploying DEXRouter...");
        DEXRouter dexRouter = new DEXRouter(address(priceOracle));
        console.log("DEXRouter deployed at:", address(dexRouter));
        
        // Deploy PortfolioTracker
        console.log("Deploying PortfolioTracker...");
        PortfolioTracker portfolioTracker = new PortfolioTracker(address(priceOracle), address(dexRouter));
        console.log("PortfolioTracker deployed at:", address(portfolioTracker));
        
        // Deploy ProtocolAdapters
        console.log("Deploying ProtocolAdapters...");
        ProtocolAdapters protocolAdapters = new ProtocolAdapters(address(portfolioTracker), address(priceOracle));
        console.log("ProtocolAdapters deployed at:", address(protocolAdapters));
        
        // Use existing USDC contract for YieldFarmingStrategy
        address usdcAddress = 0x2255acE1b16B3791Ee20F5aAc173751875BfBf65;
        
        // Deploy YieldFarmingStrategy
        console.log("Deploying YieldFarmingStrategy...");
        YieldFarmingStrategy yieldStrategy = new YieldFarmingStrategy(
            IERC20(usdcAddress),
            "DefiBrain USDC Yield Strategy",
            "Automated yield farming strategy for USDC",
            3  // Medium risk level
        );
        console.log("YieldFarmingStrategy deployed at:", address(yieldStrategy));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("PriceOracle:", address(priceOracle));
        console.log("DEXRouter:", address(dexRouter));
        console.log("PortfolioTracker:", address(portfolioTracker));
        console.log("ProtocolAdapters:", address(protocolAdapters));
        console.log("YieldFarmingStrategy:", address(yieldStrategy));
    }
}