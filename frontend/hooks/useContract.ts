"use client";

import { useState, useCallback } from 'react';
import { useActiveWallet } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, readContract } from 'thirdweb';
import { client, mantleTestnet, contracts } from '@/lib/web3';
import { usePrivy } from '@privy-io/react-auth';

// Type definitions for contract interactions
type ContractMethod = string;
type ContractParams = readonly unknown[];

export interface ContractCallResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useContract() {
  const { authenticated } = usePrivy();
  const wallet = useActiveWallet();
  const [isLoading, setIsLoading] = useState(false);

  const getContractInstance = useCallback((contractType: keyof typeof contracts) => {
    if (!wallet) return null;
    
    const contractConfig = contracts[contractType];
    return getContract({
      client,
      chain: mantleTestnet,
      address: contractConfig.address,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: contractConfig.abi as any,
    });
  }, [wallet]);

  const executeContractCall = useCallback(
    async (
      contractAddress: string,
      functionName: ContractMethod,
      args: ContractParams = [],
      value?: bigint
    ): Promise<ContractCallResult> => {
      if (!authenticated || !wallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsLoading(true);
      try {
        const contract = getContract({
          client,
          chain: mantleTestnet,
          address: contractAddress,
        });

        const transaction = prepareContractCall({
          contract,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          method: functionName as any,
          params: args,
          value,
        });

        const account = wallet.getAccount();
        if (!account) {
          return { success: false, error: 'No account available' };
        }

        const result = await sendTransaction({
          transaction,
          account,
        });

        return {
          success: true,
          txHash: result.transactionHash,
        };
      } catch (error: unknown) {
        console.error('Contract call failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Transaction failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    [authenticated, wallet]
  );

  // Vault-specific functions
  const depositToVault = useCallback(
    async (amount: string): Promise<ContractCallResult> => {
      const amountWei = BigInt(parseFloat(amount) * 10 ** 6); // USDC has 6 decimals
      const userAddress = wallet?.getAccount()?.address;
      if (!userAddress) {
        return { success: false, error: 'Wallet not connected' };
      }
      return executeContractCall(
        contracts.vault.address,
        'deposit',
        [amountWei, userAddress],
        amountWei
      );
    },
    [executeContractCall, wallet]
  );

  const withdrawFromVault = useCallback(
    async (assetAmount: string): Promise<ContractCallResult> => {
      const userAddress = wallet?.getAccount()?.address;
      if (!userAddress) {
        return { success: false, error: 'Wallet not connected' };
      }
      
      try {
        // Convert asset amount to shares using previewWithdraw
        const assetAmountWei = BigInt(parseFloat(assetAmount) * 10 ** 6); // USDC has 6 decimals
        const vaultContract = getContract({
          client,
          chain: mantleTestnet,
          address: contracts.vault.address,
        });
        
        const sharesNeeded = await readContract({
          contract: vaultContract,
          method: "function previewWithdraw(uint256 assets) external view returns (uint256)",
          params: [assetAmountWei],
        });
        
        return executeContractCall(
          contracts.vault.address,
          'redeem',
          [sharesNeeded, userAddress, userAddress]
        );
      } catch (error) {
        console.error('Error calculating shares for withdrawal:', error);
        return { success: false, error: 'Failed to calculate withdrawal amount' };
      }
    },
    [executeContractCall, wallet]
  );

  // DEX Router functions
  const swapTokens = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      amountIn: string,
      minAmountOut: string
    ): Promise<ContractCallResult> => {
      const amountInWei = BigInt(parseFloat(amountIn) * 10 ** 18);
      const minAmountOutWei = BigInt(parseFloat(minAmountOut) * 10 ** 18);
      
      return executeContractCall(
        contracts.dexRouter.address,
        'swapExactTokensForTokens',
        [amountInWei, minAmountOutWei, [tokenIn, tokenOut], wallet?.getAccount()?.address, Date.now() + 300000]
      );
    },
    [executeContractCall, wallet]
  );

  // Portfolio Tracker functions
  const updatePortfolio = useCallback(
    async (): Promise<ContractCallResult> => {
      return executeContractCall(
        contracts.portfolioTracker.address,
        'updatePortfolio',
        []
      );
    },
    [executeContractCall]
  );

 return {
    getContract: getContractInstance,
    executeContractCall,
    depositToVault,
    withdrawFromVault,
    swapTokens,
    updatePortfolio,
    isLoading,
  };
}