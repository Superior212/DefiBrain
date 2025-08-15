"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from 'thirdweb/react';
import { getContract, readContract } from 'thirdweb';
import { client, anvilNetwork, contracts } from '@/lib/web3';

export interface PortfolioData {
  totalValue: string;
  totalDeposited: string;
  totalYield: string;
  yieldPercentage: number;
  positions: Position[];
  vaultShares: string;
  lastUpdated: Date;
}

export interface Position {
  token: string;
  symbol: string;
  balance: string;
  value: string;
  allocation: number;
}

export interface VaultInfo {
  totalAssets: string;
  totalShares: string;
  sharePrice: string;
  apy: number;
  strategy: string;
}

export function usePortfolio() {
  const { authenticated, user } = usePrivy();
  const wallet = useActiveWallet();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) {
      setPortfolioData(null);
      setError('Please connect your wallet to view portfolio data');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    console.log('Fetching portfolio data for address:', user.wallet.address);

    try {
      const portfolioContract = getContract({
        client,
        chain: anvilNetwork,
        address: contracts.portfolioTracker.address,
        abi: contracts.portfolioTracker.abi,
      });

      const vaultContract = getContract({
        client,
        chain: anvilNetwork,
        address: contracts.vault.address,
        abi: contracts.vault.abi,
      });

      // Fetch portfolio data
      console.log('Calling getPortfolio for:', user.wallet.address);
      const portfolioData = await readContract({
        contract: portfolioContract,
        method: 'getPortfolio' as any,
        params: [user.wallet.address],
      });
      
      console.log('Portfolio data received:', portfolioData);
      
      console.log('Calling balanceOf for:', user.wallet.address);
      const vaultShares = await readContract({
        contract: vaultContract,
        method: 'balanceOf' as any,
        params: [user.wallet.address],
      });
      
      console.log('Vault shares received:', vaultShares);

      // Extract totalValueUSD from portfolio data
      const totalValue = portfolioData[1]; // totalValueUSD is the second element

      // Mock data for demonstration (replace with actual contract calls)
      const mockPortfolioData: PortfolioData = {
        totalValue: (Number(totalValue) / 10 ** 18).toFixed(4),
        totalDeposited: '1000.0000',
        totalYield: '125.5000',
        yieldPercentage: 12.55,
        positions: [
          {
            token: '0x...',
            symbol: 'MNT',
            balance: '500.0000',
            value: '500.0000',
            allocation: 44.4,
          },
          {
            token: '0x...',
            symbol: 'USDT',
            balance: '400.0000',
            value: '400.0000',
            allocation: 35.6,
          },
          {
            token: '0x...',
            symbol: 'WETH',
            balance: '0.0750',
            value: '225.5000',
            allocation: 20.0,
          },
        ],
        vaultShares: (Number(vaultShares) / 10 ** 18).toFixed(4),
        lastUpdated: new Date(),
      };

      setPortfolioData(mockPortfolioData);
    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      const errorMessage = err?.message || err?.reason || err?.data?.message || 'Failed to fetch portfolio data';
      setError(errorMessage);
      
      // If it's a contract call error, provide more context
      if (err?.code === 'CALL_EXCEPTION' || err?.code === 'UNPREDICTABLE_GAS_LIMIT') {
        setError('Contract interaction failed. Please ensure you are connected to the correct network and contracts are deployed.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, user?.wallet?.address]);

  const fetchVaultInfo = useCallback(async () => {
    if (!authenticated) return;

    try {
      const vaultContract = getContract({
        client,
        chain: anvilNetwork,
        address: contracts.vault.address,
        abi: contracts.vault.abi,
      });

      const [totalAssets, totalShares] = await Promise.all([
        readContract({
          contract: vaultContract,
          method: 'totalAssets' as any,
          params: [],
        }),
        readContract({
          contract: vaultContract,
          method: 'totalShares' as any,
          params: [],
        }),
      ]);

      // Mock vault info (replace with actual contract calls)
      const mockVaultInfo: VaultInfo = {
        totalAssets: (Number(totalAssets) / 10 ** 18).toFixed(2),
        totalShares: (Number(totalShares) / 10 ** 18).toFixed(2),
        sharePrice: '1.1255',
        apy: 15.75,
        strategy: 'AI-Optimized Yield Farming',
      };

      setVaultInfo(mockVaultInfo);
    } catch (err: any) {
      console.error('Error fetching vault info:', err);
    }
  }, [authenticated]);

  const refreshData = useCallback(() => {
    fetchPortfolioData();
    fetchVaultInfo();
  }, [fetchPortfolioData, fetchVaultInfo]);

  useEffect(() => {
    if (authenticated) {
      refreshData();
    }
  }, [authenticated, refreshData]);

  return {
    portfolioData,
    vaultInfo,
    isLoading,
    error,
    refreshData,
  };
}