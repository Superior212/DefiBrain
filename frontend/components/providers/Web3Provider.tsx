"use client";

import { useEffect, useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { ThirdwebProvider } from 'thirdweb/react';
import { privyAppId, privyConfig } from '@/lib/privy';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render Privy provider during SSR to avoid prerender errors
  if (!isMounted) {
    return (
      <ThirdwebProvider>
        {children}
      </ThirdwebProvider>
    );
  }

  // Only initialize Privy if we have a valid app ID
  if (!privyAppId || privyAppId === 'beta_132f2a4ac7552294c7f7962f720d81f8') {
    return (
      <ThirdwebProvider>
        {children}
      </ThirdwebProvider>
    );
  }

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