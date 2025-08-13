import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

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

// Mantle Testnet configuration
export const mantleTestnet = defineChain({
  id: 5001,
  name: "Mantle Testnet",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpc: "https://rpc.testnet.mantle.xyz",
  blockExplorers: [
    {
      name: "Mantle Testnet Explorer",
      url: "https://explorer.testnet.mantle.xyz",
    },
  ],
});

// Contract addresses (to be updated with actual deployed addresses)
export const CONTRACT_ADDRESSES = {
  DEFI_BRAIN_VAULT: "0x...", // DefiBrainVault contract address
  PORTFOLIO_TRACKER: "0x...", // PortfolioTracker contract address
  DEX_ROUTER: "0x...", // DEXRouter contract address
  PRICE_ORACLE: "0x...", // PriceOracle contract address
};

// Contract instances (placeholder for now)
export const contracts = {
  vault: CONTRACT_ADDRESSES.DEFI_BRAIN_VAULT,
  portfolioTracker: CONTRACT_ADDRESSES.PORTFOLIO_TRACKER,
  dexRouter: CONTRACT_ADDRESSES.DEX_ROUTER,
  priceOracle: CONTRACT_ADDRESSES.PRICE_ORACLE,
};

// Supported chains
export const supportedChains = [mantleNetwork, mantleTestnet];