"use client";

import { useState, useCallback } from 'react';
import { useActiveWallet } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { client, mantleNetwork, contracts } from '@/lib/web3';
import { usePrivy } from '@privy-io/react-auth';

export interface ContractCallResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useContract() {
  const { authenticated } = usePrivy();
  const wallet = useActiveWallet();
  const [isLoading, setIsLoading] = useState(false);

  const executeContractCall = useCallback(
    async (
      contractAddress: string,
      functionName: string,
      args: any[] = [],
      value?: bigint
    ): Promise<ContractCallResult> => {
      if (!authenticated || !wallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      setIsLoading(true);
      try {
        const contract = getContract({
          client,
          chain: mantleNetwork,
          address: contractAddress,
        });

        const transaction = prepareContractCall({
          contract,
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
      } catch (error: any) {
        console.error('Contract call failed:', error);
        return {
          success: false,
          error: error.message || 'Transaction failed',
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
      const amountWei = BigInt(parseFloat(amount) * 10 ** 18);
      return executeContractCall(
        contracts.vault,
        'deposit',
        [amountWei],
        amountWei
      );
    },
    [executeContractCall]
  );

  const withdrawFromVault = useCallback(
    async (shares: string): Promise<ContractCallResult> => {
      const sharesWei = BigInt(parseFloat(shares) * 10 ** 18);
      return executeContractCall(
        contracts.vault,
        'withdraw',
        [sharesWei]
      );
    },
    [executeContractCall]
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
        contracts.dexRouter,
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
        contracts.portfolioTracker,
        'updatePortfolio',
        []
      );
    },
    [executeContractCall]
  );

  return {
    isLoading,
    executeContractCall,
    depositToVault,
    withdrawFromVault,
    swapTokens,
    updatePortfolio,
  };
}