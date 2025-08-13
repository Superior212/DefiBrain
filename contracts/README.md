# DefiBrain Smart Contracts - Phase 1 MVP

This repository contains the core smart contracts for DefiBrain's AI-powered DeFi platform. Phase 1 implements the essential MVP functionality required to power the frontend application.

## 📋 Phase 1 Contracts Overview

### Core Contracts

1. **DefiBrainVault.sol** - Main vault contract for AI-powered yield optimization
2. **DEXRouter.sol** - Decentralized exchange router for token swaps and liquidity
3. **PortfolioTracker.sol** - Portfolio management and analytics
4. **ProtocolAdapters.sol** - Unified interface for DeFi protocol interactions
5. **PriceOracle.sol** - Chainlink-based price feeds for accurate asset valuation
6. **YieldFarmingStrategy.sol** - Sample yield farming strategy implementation

### Supporting Contracts

- **IStrategy.sol** - Interface for yield strategies
- **DeployPhase1.s.sol** - Comprehensive deployment script

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 16+
- Git

### Installation

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test
```

### Deployment

1. **Deploy to local network:**
```bash
# Start local node
anvil

# Deploy contracts (in another terminal)
forge script script/DeployPhase1.s.sol --rpc-url http://localhost:8545 --broadcast
```

2. **Deploy to testnet:**
```bash
forge script script/DeployPhase1.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

## 📊 Contract Architecture

### DefiBrainVault
- **Purpose**: Core vault for automated yield optimization
- **Features**: 
  - ERC4626-compatible vault shares
  - Multi-strategy allocation
  - Performance and management fees
  - Emergency pause functionality
- **Key Functions**: `deposit()`, `redeem()`, `addStrategy()`, `rebalance()`

### DEXRouter
- **Purpose**: Decentralized trading and liquidity management
- **Features**:
  - Token swaps with slippage protection
  - Liquidity pool management
  - Price impact calculations
  - Trading fee collection
- **Key Functions**: `swapTokens()`, `addLiquidity()`, `removeLiquidity()`

### PortfolioTracker
- **Purpose**: Comprehensive portfolio analytics and position tracking
- **Features**:
  - Multi-protocol position tracking
  - Real-time portfolio valuation
  - Performance metrics calculation
  - Risk assessment
- **Key Functions**: `addPosition()`, `getPortfolioValue()`, `getPerformanceMetrics()`

### ProtocolAdapters
- **Purpose**: Unified interface for major DeFi protocols
- **Features**:
  - Standardized protocol interactions
  - Support for lending, staking, yield farming
  - Risk scoring and TVL tracking
  - Reward claiming automation
- **Key Functions**: `supply()`, `withdraw()`, `stake()`, `claimRewards()`

### PriceOracle
- **Purpose**: Reliable price feeds using Chainlink
- **Features**:
  - Multiple asset price feeds
  - Staleness protection
  - Fallback mechanisms
  - Price validation
- **Key Functions**: `getPrice()`, `addPriceFeed()`, `validatePrice()`

## 🧪 Testing

### Test Coverage

- **Unit Tests**: Individual contract functionality
- **Integration Tests**: Cross-contract interactions
- **Fuzz Tests**: Edge case validation
- **Gas Optimization**: Performance testing

### Running Tests

```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/DefiBrainVault.t.sol

# Run with gas reporting
forge test --gas-report
```

## 🔐 Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Access Control**: Owner-only administrative functions
- **SafeERC20**: Safe token transfer operations
- **Price Validation**: Oracle price staleness checks

## 🔮 Phase 2 & 3 Roadmap

### Phase 2 (Enhanced Features)
- [ ] Social Trading contracts
- [ ] AI Oracle integration
- [ ] Advanced Analytics contracts
- [ ] Cross-chain bridge adapters

### Phase 3 (Full Platform)
- [ ] Governance system (DAO)
- [ ] Advanced AI features
- [ ] Insurance protocols
- [ ] Institutional features

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
