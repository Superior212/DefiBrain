import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Import contract ABIs
import DefiBrainVaultABI from './abis/DefiBrainVault.json';
import PortfolioTrackerABI from './abis/PortfolioTracker.json';
import DEXRouterABI from './abis/DEXRouter.json';
import PriceOracleABI from './abis/PriceOracle.json';
import ProtocolAdaptersABI from './abis/ProtocolAdapters.json';
import YieldFarmingStrategyABI from './abis/YieldFarmingStrategy.json';
import USDCABI from './abis/USDC.json';

// Thirdweb client configuration
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id",
});

// Mantle Network configuration
export const mantleNetwork = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpc: "https://rpc.mantle.xyz",
  blockExplorers: [
    {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  ],
});

// Mantle Sepolia Testnet configuration
export const mantleTestnet = defineChain({
  id: 5003,
  name: "Mantle Sepolia Testnet",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpc: "https://rpc.sepolia.mantle.xyz",
  blockExplorers: [
    {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  ],
});

// Contract addresses (deployed on Mantle Sepolia testnet)
export const CONTRACT_ADDRESSES = {
  // Mantle Sepolia Testnet Deployed Addresses
  DEFI_BRAIN_VAULT: "0xcc5bf38D6ad4e264e93754E8962A112e8bD0D14b" as const,
  PORTFOLIO_TRACKER: "0x29d6cc6fa3dc5da7763f4301f2ad9540caa4aef8" as const,
  DEX_ROUTER: "0x48ec0f65565f1748d75544a99ab63745ecf64d78" as const,
  PRICE_ORACLE: "0xf021c6faea0d80c36bcb4083fd0b2abeb827ac96" as const,
  PROTOCOL_ADAPTERS: "0xbc3B00622f5Eae70DF156A1F87D26c7E25f45999" as const,
  YIELD_FARMING_STRATEGY: "0xe1d7796ce9809261b5e58678f5e9553a0fad6d99" as const,
  USDC_TOKEN: "0x2255acE1b16B3791Ee20F5aAc173751875BfBf65" as const,
};

// Contract addresses and ABIs
export const contracts = {
  vault: {
    address: CONTRACT_ADDRESSES.DEFI_BRAIN_VAULT,
    chain: mantleTestnet,
    abi: DefiBrainVaultABI,
  },
  portfolioTracker: {
    address: CONTRACT_ADDRESSES.PORTFOLIO_TRACKER,
    chain: mantleTestnet,
    abi: PortfolioTrackerABI,
  },
  dexRouter: {
    address: CONTRACT_ADDRESSES.DEX_ROUTER,
    chain: mantleTestnet,
    abi: DEXRouterABI,
  },
  priceOracle: {
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    chain: mantleTestnet,
    abi: PriceOracleABI,
  },
  protocolAdapters: {
    address: CONTRACT_ADDRESSES.PROTOCOL_ADAPTERS,
    chain: mantleTestnet,
    abi: ProtocolAdaptersABI,
  },
  yieldFarmingStrategy: {
    address: CONTRACT_ADDRESSES.YIELD_FARMING_STRATEGY,
    chain: mantleTestnet,
    abi: YieldFarmingStrategyABI,
  },
  usdcToken: {
    address: CONTRACT_ADDRESSES.USDC_TOKEN,
    chain: mantleTestnet,
    abi: USDCABI,
  },
} as const;

// Supported chains
// Local Anvil network configuration
export const anvilNetwork = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: "http://127.0.0.1:8545",
  blockExplorers: [
    {
      name: "Local Explorer",
      url: "http://localhost:8545",
    },
  ],
});

export const supportedChains = [anvilNetwork, mantleNetwork, mantleTestnet];