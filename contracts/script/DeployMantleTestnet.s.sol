// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployPhase1.s.sol";
import "../src/USDC.sol";
import "../src/WETH.sol";
import "../src/DAI.sol";

/**
 * @title DeployMantleTestnet
 * @dev Deployment script for DefiBrain contracts on Mantle Testnet
 * @notice Extends the base deployment script with Mantle-specific configurations
 */
contract DeployMantleTestnet is DeployPhase1 {
    
    function run() external override {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Deploying to Mantle Testnet ===");
        console.log("Deployer address:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Block number:", block.number);
        
        // Verify we're on Mantle Sepolia Testnet
        require(block.chainid == 5003, "Not on Mantle Sepolia Testnet (Chain ID: 5003)");
        
        DeploymentConfig memory config = DeploymentConfig({
            deployer: deployer,
            deployTestTokens: vm.envOr("DEPLOY_TEST_TOKENS", true),
            setupInitialPools: vm.envOr("SETUP_INITIAL_POOLS", true),
            registerMockProtocols: vm.envOr("REGISTER_MOCK_PROTOCOLS", true)
        });
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Phase 1 contracts
        deployPhase1Contracts(config);
        
        // Setup initial configuration
        setupInitialConfiguration(config);
        
        vm.stopBroadcast();
        
        // Log deployment addresses and save to file
        logDeploymentAddresses();
        saveDeploymentAddresses();
    }
    
    function saveDeploymentAddresses() internal {
        string memory deploymentInfo = string.concat(
            "# DefiBrain Mantle Testnet Deployment\n",
            "PRICE_ORACLE=", vm.toString(address(priceOracle)), "\n",
            "DEX_ROUTER=", vm.toString(address(dexRouter)), "\n",
            "PORTFOLIO_TRACKER=", vm.toString(address(portfolioTracker)), "\n",
            "PROTOCOL_ADAPTERS=", vm.toString(address(protocolAdapters)), "\n",
            "DEFI_BRAIN_VAULT=", vm.toString(address(defiBrainVault)), "\n",
            "YIELD_FARMING_STRATEGY=", vm.toString(address(yieldStrategy)), "\n"
        );
        
        // Note: Test token addresses are logged in the parent contract's logDeploymentSummary function
        
        vm.writeFile("./deployments/mantle-testnet.env", deploymentInfo);
        console.log("\nDeployment addresses saved to ./deployments/mantle-testnet.env");
    }
}