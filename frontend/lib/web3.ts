import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Import contract ABIs
import DefiBrainVaultABI from './abis/DefiBrainVault.json';
import PortfolioTrackerABI from './abis/PortfolioTracker.json';
import DEXRouterABI from './abis/DEXRouter.json';
import PriceOracleABI from './abis/PriceOracle.json';

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

// Contract addresses (deployed on local Anvil network)
export const CONTRACT_ADDRESSES = {
  DEFI_BRAIN_VAULT: "0xe6e340d132b5f46d1e472debcd681b2abc16e57e" as const,
  PORTFOLIO_TRACKER: "0x67d269191c92Caf3cD7723F116c85e6E9bf55933" as const,
  DEX_ROUTER: "0xc5a5c42992decbae36851359345fe25997f5c42d" as const,
  PRICE_ORACLE: "0x09635F643e140090A9A8Dcd712eD6285858cebef" as const,
};

// Contract addresses and ABIs
export const contracts = {
  vault: {
    address: CONTRACT_ADDRESSES.DEFI_BRAIN_VAULT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: DefiBrainVaultABI as any,
  },
  portfolioTracker: {
    address: CONTRACT_ADDRESSES.PORTFOLIO_TRACKER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: PortfolioTrackerABI as any,
  },
  dexRouter: {
    address: CONTRACT_ADDRESSES.DEX_ROUTER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: DEXRouterABI as any,
  },
  priceOracle: {
    address: CONTRACT_ADDRESSES.PRICE_ORACLE,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: PriceOracleABI as any,
  },
};

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