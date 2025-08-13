import { PrivyClientConfig } from '@privy-io/react-auth';

// Define chains compatible with Privy
const mantleChain = {
  id: 5000,
  name: 'Mantle',
  network: 'mantle',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Explorer',
      url: 'https://explorer.mantle.xyz',
    },
  },
};

const mantleTestnetChain = {
  id: 5001,
  name: 'Mantle Testnet',
  network: 'mantle-testnet',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.testnet.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Testnet Explorer',
      url: 'https://explorer.testnet.mantle.xyz',
    },
  },
};

// Privy App ID (separate from config)
export const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'beta_132f2a4ac7552294c7f7962f720d81f8';

// Privy configuration
export const privyConfig: PrivyClientConfig = {
  // Appearance customization
  appearance: {
    theme: 'light',
    accentColor: '#6366F1',
    logo: '/logo.png',
  },
  
  // Login methods
  loginMethods: ['wallet', 'email', 'google', 'twitter'],
  
  // Wallet configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
  },
  
  // Default chain
  defaultChain: mantleChain,
  
  // Supported chains
  supportedChains: [mantleChain, mantleTestnetChain],
  
  // Additional configuration
  legal: {
    termsAndConditionsUrl: '/terms',
    privacyPolicyUrl: '/privacy',
  },
};

// Wallet connector configuration for wagmi
export const walletConnectConfig = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [mantleChain, mantleTestnetChain],
  showQrModal: true,
};