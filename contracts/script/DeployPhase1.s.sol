// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";
import "../src/DEXRouter.sol";
import "../src/PortfolioTracker.sol";
import "../src/ProtocolAdapters.sol";
import "../src/DefiBrainVault.sol";
import "../src/YieldFarmingStrategy.sol";
import "../src/USDC.sol";
import "../src/WETH.sol";
import "../src/DAI.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title DeployPhase1
 * @dev Deployment script for DefiBrain Phase 1 contracts
 * @notice Deploys essential MVP contracts: DEX Router, Portfolio Tracker, Protocol Adapters
 */
contract DeployPhase1 is Script {
    
    // Deployment addresses (will be set during deployment)
    PriceOracle public priceOracle;
    DEXRouter public dexRouter;
    PortfolioTracker public portfolioTracker;
    ProtocolAdapters public protocolAdapters;
    DefiBrainVault public defiBrainVault;
    YieldFarmingStrategy public yieldStrategy;
    
    // Test tokens for deployment
    USDC public testUSDC;
    WETH public testWETH;
    DAI public testDAI;
    
    // Configuration
    struct DeploymentConfig {
        address deployer;
        bool deployTestTokens;
        bool setupInitialPools;
        bool registerMockProtocols;
    }
    
    function run() external virtual {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        DeploymentConfig memory config = DeploymentConfig({
            deployer: deployer,
            deployTestTokens: true,
            setupInitialPools: true,
            registerMockProtocols: true
        });
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Phase 1 contracts
        deployPhase1Contracts(config);
        
        // Setup initial configuration
        setupInitialConfiguration(config);
        
        vm.stopBroadcast();
        
        // Log deployment addresses
        logDeploymentAddresses();
    }
    
    function deployPhase1Contracts(DeploymentConfig memory config) internal {
        console.log("=== Deploying DefiBrain Phase 1 Contracts ===");
        
        // 1. Deploy PriceOracle
        console.log("Deploying PriceOracle...");
        priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));
        
        // 2. Deploy DEXRouter
        console.log("Deploying DEXRouter...");
        dexRouter = new DEXRouter(address(priceOracle));
        console.log("DEXRouter deployed at:", address(dexRouter));
        
        // 3. Deploy PortfolioTracker
        console.log("Deploying PortfolioTracker...");
        portfolioTracker = new PortfolioTracker(address(priceOracle), address(dexRouter));
        console.log("PortfolioTracker deployed at:", address(portfolioTracker));
        
        // 4. Deploy ProtocolAdapters
        console.log("Deploying ProtocolAdapters...");
        protocolAdapters = new ProtocolAdapters(address(portfolioTracker), address(priceOracle));
        console.log("ProtocolAdapters deployed at:", address(protocolAdapters));
        
        // 5. Deploy mock tokens if needed
        if (config.deployTestTokens) {
            deployTestTokens();
        }
        
        // 6. Deploy DefiBrainVault with test USDC
        console.log("Deploying DefiBrainVault...");
        if (config.deployTestTokens) {
            defiBrainVault = new DefiBrainVault(
                IERC20Metadata(address(testUSDC)),
                "DefiBrain USDC Vault",
                "dbUSDC"
            );
        } else {
            // Use a placeholder address - should be replaced with actual USDC address
            defiBrainVault = new DefiBrainVault(
                IERC20Metadata(0xa0B86a33E6441b8Db8C6C1B1B1b1B1B1B1b1b1B1),
                "DefiBrain USDC Vault",
                "dbUSDC"
            );
        }
        console.log("DefiBrainVault deployed at:", address(defiBrainVault));
        
        // 7. Deploy YieldFarmingStrategy
        console.log("Deploying YieldFarmingStrategy...");
        if (config.deployTestTokens) {
            yieldStrategy = new YieldFarmingStrategy(
                IERC20(address(testUSDC)),
                "USDC Yield Strategy",
                "A yield farming strategy for USDC",
                5 // Medium risk level
            );
        } else {
            yieldStrategy = new YieldFarmingStrategy(
                IERC20(0xa0B86a33E6441b8Db8C6C1B1B1b1B1B1B1b1b1B1),
                "USDC Yield Strategy",
                "A yield farming strategy for USDC",
                5 // Medium risk level
            );
        }
        console.log("YieldFarmingStrategy deployed at:", address(yieldStrategy));
    }
    
    function deployTestTokens() internal {
        console.log("Deploying test tokens...");
        
        // Deploy USDC
        testUSDC = new USDC();
        console.log("USDC deployed at:", address(testUSDC));
        
        // Deploy WETH
        testWETH = new WETH();
        console.log("WETH deployed at:", address(testWETH));
        
        // Deploy DAI
        testDAI = new DAI();
        console.log("DAI deployed at:", address(testDAI));
    }
    
    function setupInitialConfiguration(DeploymentConfig memory config) internal {
        console.log("=== Setting up initial configuration ===");
        
        if (config.deployTestTokens) {
            setupMockPriceFeeds();
            setupDEXTokensAndPools(config);
        }
        
        if (config.registerMockProtocols) {
            registerMockProtocols();
        }
        
        setupVaultStrategy();
    }
    
    function setupMockPriceFeeds() internal {
        console.log("Setting up mock price feeds...");
        
        // Note: In production, these would be actual Chainlink price feed addresses
        // For testing, we'll add mock price feeds with placeholder addresses
        
        // Mock price feed addresses (replace with actual Chainlink feeds in production)
        address mockUSDCPriceFeed = address(0x1111111111111111111111111111111111111111);
        address mockWETHPriceFeed = address(0x2222222222222222222222222222222222222222);
        address mockDAIPriceFeed = address(0x3333333333333333333333333333333333333333);
        
        // Add price feeds (these will fail in testing but show the structure)
        try priceOracle.addPriceFeed(address(testUSDC), mockUSDCPriceFeed, 3600) {
            console.log("USDC price feed added");
        } catch {
            console.log("USDC price feed setup skipped (mock environment)");
        }
        
        try priceOracle.addPriceFeed(address(testWETH), mockWETHPriceFeed, 3600) {
            console.log("WETH price feed added");
        } catch {
            console.log("WETH price feed setup skipped (mock environment)");
        }
        
        try priceOracle.addPriceFeed(address(testDAI), mockDAIPriceFeed, 3600) {
            console.log("DAI price feed added");
        } catch {
            console.log("DAI price feed setup skipped (mock environment)");
        }
    }
    
    function setupDEXTokensAndPools(DeploymentConfig memory config) internal {
        console.log("Setting up DEX tokens and pools...");
        
        // Add supported tokens to DEX
        dexRouter.addSupportedToken(address(testUSDC));
        dexRouter.addSupportedToken(address(testWETH));
        dexRouter.addSupportedToken(address(testDAI));
        
        if (config.setupInitialPools) {
            // Create initial trading pools
            dexRouter.createPool(address(testUSDC), address(testWETH));
            dexRouter.createPool(address(testUSDC), address(testDAI));
            dexRouter.createPool(address(testWETH), address(testDAI));
            
            console.log("Initial DEX pools created");
        }
    }
    
    function registerMockProtocols() internal {
        console.log("Registering mock protocols...");
        
        // Register mock lending protocol (like Aave)
        bytes4[] memory lendingFunctions = new bytes4[](4);
        lendingFunctions[0] = bytes4(keccak256("supply(address,uint256,address,uint16)"));
        lendingFunctions[1] = bytes4(keccak256("withdraw(address,uint256,address)"));
        lendingFunctions[2] = bytes4(keccak256("borrow(address,uint256,uint256,uint16,address)"));
        lendingFunctions[3] = bytes4(keccak256("repay(address,uint256,uint256,address)"));
        
        address mockAave = address(0x7777777777777777777777777777777777777777);
        protocolAdapters.registerAdapter(
            mockAave,
            "Mock Aave Protocol",
            ProtocolAdapters.ProtocolType.LENDING,
            25, // Low risk
            lendingFunctions
        );
        
        // Register mock yield farming protocol (like Yearn)
        bytes4[] memory yieldFunctions = new bytes4[](2);
        yieldFunctions[0] = bytes4(keccak256("deposit(uint256)"));
        yieldFunctions[1] = bytes4(keccak256("withdraw(uint256)"));
        
        address mockYearn = address(0x8888888888888888888888888888888888888888);
        protocolAdapters.registerAdapter(
            mockYearn,
            "Mock Yearn Protocol",
            ProtocolAdapters.ProtocolType.YIELD_FARMING,
            40, // Medium risk
            yieldFunctions
        );
        
        // Register mock staking protocol (like Lido)
        bytes4[] memory stakingFunctions = new bytes4[](2);
        stakingFunctions[0] = bytes4(keccak256("submit(address)"));
        stakingFunctions[1] = bytes4(keccak256("requestWithdrawals(uint256[],address)"));
        
        address mockLido = address(0x9999999999999999999999999999999999999999);
        protocolAdapters.registerAdapter(
            mockLido,
            "Mock Lido Protocol",
            ProtocolAdapters.ProtocolType.STAKING,
            30, // Low-medium risk
            stakingFunctions
        );
        
        // Add protocols to portfolio tracker
        portfolioTracker.addProtocol(mockAave, "Mock Aave Protocol");
        portfolioTracker.addProtocol(mockYearn, "Mock Yearn Protocol");
        portfolioTracker.addProtocol(mockLido, "Mock Lido Protocol");
        portfolioTracker.addProtocol(address(defiBrainVault), "DefiBrain Vault");
        
        console.log("Mock protocols registered");
    }
    
    function setupVaultStrategy() internal {
        console.log("Setting up vault strategy...");
        
        // Add the yield strategy to the vault with 50% allocation
        defiBrainVault.addStrategy(address(yieldStrategy), 5000); // 50% allocation
        
        // Set the vault address in the strategy
        yieldStrategy.setVault(address(defiBrainVault));
        
        console.log("Vault strategy configured");
    }
    
    function logDeploymentAddresses() internal view {
        console.log("\n=== DefiBrain Phase 1 Deployment Complete ===");
        console.log("PriceOracle:", address(priceOracle));
        console.log("DEXRouter:", address(dexRouter));
        console.log("PortfolioTracker:", address(portfolioTracker));
        console.log("ProtocolAdapters:", address(protocolAdapters));
        console.log("DefiBrainVault:", address(defiBrainVault));
        console.log("YieldFarmingStrategy:", address(yieldStrategy));
        
        if (address(testUSDC) != address(0)) {
            console.log("\n=== Test Tokens ===");
            console.log("USDC:", address(testUSDC));
            console.log("WETH:", address(testWETH));
            console.log("DAI:", address(testDAI));
        }
        
        console.log("\n=== Next Steps ===");
        console.log("1. Update frontend contract addresses");
        console.log("2. Configure real Chainlink price feeds for production");
        console.log("3. Add liquidity to DEX pools");
        console.log("4. Test all contract interactions");
        console.log("5. Deploy Phase 2 contracts when ready");
    }
}