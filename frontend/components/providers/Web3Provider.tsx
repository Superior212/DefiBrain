"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import { ThirdwebProvider } from 'thirdweb/react';
import { privyAppId, privyConfig } from '@/lib/privy';
import { client } from '@/lib/web3';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: privyConfig.appearance,
        loginMethods: privyConfig.loginMethods,
        embeddedWallets: privyConfig.embeddedWallets,
        defaultChain: privyConfig.defaultChain,
        supportedChains: privyConfig.supportedChains,
        legal: privyConfig.legal,
      }}
    >
      <ThirdwebProvider>
        {children}
      </ThirdwebProvider>
    </PrivyProvider>
  );
}