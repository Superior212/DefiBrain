# 🧠 DefiBrain - AI-Powered DeFi Yield Aggregator

**Hackathon Submission for Cook 04**

DefiBrain is an intelligent DeFi yield optimization platform built on Mantle Network that leverages AI-driven strategies to maximize returns while minimizing risks. Built during the hackathon, this platform combines advanced smart contracts with a modern web interface to provide automated yield farming and portfolio management.

## 🌟 Key Features

- **🤖 AI-Powered Yield Optimization**: Automated strategies that adapt to market conditions
- **📊 Portfolio Analytics**: Real-time tracking and performance metrics
- **🔗 Multi-Protocol Integration**: Seamless interaction with major DeFi protocols
- **🛡️ ERC-4626 Compliant Vaults**: Standard tokenized vault implementation
- **⚡ Gas Optimized**: Efficient contract design for lower fees
- **📈 Real-time Price Feeds**: Chainlink oracle integration

## 🏗️ Tech Stack

**Smart Contracts (Foundry)**
- Solidity 0.8.24
- OpenZeppelin libraries
- Chainlink price feeds
- ERC-4626 vault standard

**Frontend (Next.js)**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Privy (wallet auth)
- Thirdweb + Wagmi (Web3)
- Recharts (analytics)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Foundry
- MetaMask wallet

### Installation & Setup

```bash
# Clone repository
git clone <repository-url>
cd DeFiBrain

# Setup contracts
cd contracts
forge install && forge build

# Setup frontend
cd ../frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Add your Privy, WalletConnect, and Thirdweb API keys

# Start development server
npm run dev
```

**Visit [http://localhost:3000](http://localhost:3000) and connect your wallet!**

## 🔧 Development

### Smart Contracts
```bash
cd contracts
forge build    # Build contracts
forge test     # Run tests
```

### Frontend
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
```

## 📱 Application Features

### Dashboard Pages
- **Overview**: Portfolio metrics and performance
- **Vaults**: Deposit/withdraw from yield vaults
- **Strategies**: Browse and select yield strategies
- **Portfolio**: Detailed analytics and tracking
- **AI Insights**: AI-powered recommendations
- **Trading**: Social trading features
- **Analytics**: Advanced performance metrics

## 🔐 Security Features

- **OpenZeppelin Libraries**: Battle-tested smart contract security
- **Reentrancy Protection**: All external functions protected
- **Access Control**: Role-based permissions
- **SafeERC20**: Secure token operations
- **Pausable Contracts**: Emergency stop functionality

## 🧪 Testing

```bash
# Smart contract tests
cd contracts && forge test

# Frontend type checking
cd frontend && npm run build
```

## ⚡ Performance Optimizations

- **Gas Efficient Contracts**: Optimized storage and operations
- **Next.js SSG**: Static generation for fast loading
- **Code Splitting**: Automatic bundle optimization
- **Responsive Design**: Mobile-first approach

## 🚀 Deployment

**Frontend**: Deployed on Vercel with automatic builds
**Contracts**: Deployed on Mantle Network

```bash
# Deploy frontend
cd frontend && npx vercel --prod

# Deploy contracts
cd contracts && forge script script/DeployPhase1.s.sol --broadcast
```

## 🎯 Hackathon Highlights

**Built for Cook 04**

- ✅ Full-stack DeFi application
- ✅ Smart contracts with comprehensive testing
- ✅ Modern React frontend with Web3 integration
- ✅ AI-powered yield optimization algorithms
- ✅ Real-time portfolio analytics
- ✅ Mobile-responsive design
- ✅ Production-ready deployment

## 🏆 What Makes DefiBrain Special

1. **AI-First Approach**: Unlike traditional yield farms, DefiBrain uses machine learning to optimize strategies in real-time
2. **User Experience**: Intuitive dashboard that makes DeFi accessible to everyone
3. **Security**: Built with industry best practices and comprehensive testing
4. **Scalability**: Modular architecture allows easy addition of new strategies and protocols
5. **Innovation**: Combines cutting-edge AI with proven DeFi mechanics

## 🔮 Future Vision

- **Advanced AI Models**: Deep learning for market prediction
- **Social Features**: Copy trading and strategy sharing
- **Mobile App**: Native iOS/Android applications
- **Institutional Tools**: Advanced analytics and reporting

## 🎮 Try It Out

1. **Connect Wallet**: Use MetaMask or any Web3 wallet
2. **Switch to Mantle**: Add Mantle Network to your wallet
3. **Explore Dashboard**: Check out the various features
4. **Deposit Funds**: Try the yield optimization vaults
5. **Monitor Performance**: Track your portfolio growth

**Demo**: [[Live Demo Link](https://defi-brain.vercel.app/)] 
**Video**: [Demo Video Link] 

## 🏅 Team

**Built by passionate developer during Cook 04**

## 📄 License

MIT License - Built for Cook 04

---

**🚀 DefiBrain - Where AI meets DeFi**

*Submitted to Cookathon 2025 - Empowering the future of decentralized finance through artificial intelligence.*