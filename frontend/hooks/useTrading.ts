"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from 'thirdweb/react';
import { getContract, readContract } from 'thirdweb';
import { client, mantleTestnet, contracts } from '@/lib/web3';
import { useContract } from './useContract';

// Type definitions for trading data
export interface TradingPair {
  pair: string;
  price: string;
  change: string;
  volume: string;
  isPositive: boolean;
  tokenA: string;
  tokenB: string;
}

export interface Trade {
  id: number;
  pair: string;
  type: 'Buy' | 'Sell';
  amount: string;
  price: string;
  total: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Failed';
  txHash?: string;
}

export interface OpenOrder {
  id: number;
  pair: string;
  type: string;
  amount: string;
  price: string;
  filled: string;
  status: 'Open' | 'Partial' | 'Filled' | 'Cancelled';
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface TradingStats {
  volume24h: string;
  activePairs: number;
  userPnL: string;
  openOrders: number;
  isPositivePnL: boolean;
}

export interface TradingData {
  tradingPairs: TradingPair[];
  recentTrades: Trade[];
  openOrders: OpenOrder[];
  priceData: PricePoint[];
  stats: TradingStats;
  isLoading: boolean;
  error: string | null;
}

export function useTrading(): TradingData & {
  swapTokens: (tokenIn: string, tokenOut: string, amountIn: string, minAmountOut: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  refreshData: () => void;
} {
  const { authenticated } = usePrivy();
  const wallet = useActiveWallet();
  const { swapTokens: contractSwap } = useContract();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingData, setTradingData] = useState<TradingData>({
    tradingPairs: [],
    recentTrades: [],
    openOrders: [],
    priceData: [],
    stats: {
      volume24h: '$0',
      activePairs: 0,
      userPnL: '$0',
      openOrders: 0,
      isPositivePnL: true,
    },
    isLoading: true,
    error: null,
  });

  // Generate mock price data for demonstration
  const generatePriceData = useCallback((): PricePoint[] => {
    const now = new Date();
    const data: PricePoint[] = [];
    const basePrice = 2847;
    
    for (let i = 6; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * 50;
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: Math.round(basePrice + variation),
      });
    }
    
    return data;
  }, []);

  // Fetch trading pairs from DEX contract
  const fetchTradingPairs = useCallback(async (): Promise<TradingPair[]> => {
    try {
      if (!wallet) return [];

      const dexContract = getContract({
        client,
        chain: mantleTestnet,
        address: contracts.dexRouter.address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: contracts.dexRouter.abi as any,
      });

      // Get supported tokens
      const supportedTokens = await readContract({
        contract: dexContract,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        method: 'getSupportedTokens' as any,
        params: [],
      }) as string[];

      // Get all pools
      const poolIds = await readContract({
        contract: dexContract,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        method: 'getAllPools' as any,
        params: [],
      }) as string[];

      const pairs: TradingPair[] = [];
      
      // Create trading pairs from pools
      for (const poolId of poolIds.slice(0, 4)) { // Limit to 4 pairs for demo
        try {
          const poolInfo = await readContract({
            contract: dexContract,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            method: 'getPoolInfo' as any,
            params: [poolId],
          }) as [string, string, bigint, bigint, bigint, boolean];

          const [tokenA, tokenB, reserveA, reserveB, , active] = poolInfo;
          
          if (active && reserveA > BigInt(0) && reserveB > BigInt(0)) {
            // Calculate price and mock data
            const price = Number(reserveB) / Number(reserveA);
            const change = (Math.random() - 0.5) * 10; // Random change between -5% and +5%
            const volume = Math.random() * 20; // Random volume up to 20M
            
            pairs.push({
              pair: `${getTokenSymbol(tokenA)}/${getTokenSymbol(tokenB)}`,
              price: `$${price.toFixed(2)}`,
              change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
              volume: `$${volume.toFixed(1)}M`,
              isPositive: change >= 0,
              tokenA,
              tokenB,
            });
          }
        } catch (poolError) {
          console.warn('Error fetching pool info:', poolError);
        }
      }

      // If no pools found, return default pairs
      if (pairs.length === 0) {
        return getDefaultTradingPairs();
      }

      return pairs;
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
      return getDefaultTradingPairs();
    }
  }, [wallet]);

  // Helper function to get token symbol
  const getTokenSymbol = (address: string): string => {
    const symbolMap: { [key: string]: string } = {
      [contracts.vault.address]: 'ETH',
      // Add more token mappings as needed
    };
    return symbolMap[address] || 'TOKEN';
  };

  // Default trading pairs for fallback
  const getDefaultTradingPairs = (): TradingPair[] => [
    {
      pair: "ETH/USDC",
      price: "$2,847.32",
      change: "+2.45%",
      volume: "$12.4M",
      isPositive: true,
      tokenA: contracts.vault.address,
      tokenB: contracts.vault.address,
    },
    {
      pair: "BTC/USDC",
      price: "$43,521.18",
      change: "-1.23%",
      volume: "$8.7M",
      isPositive: false,
      tokenA: contracts.vault.address,
      tokenB: contracts.vault.address,
    },
    {
      pair: "ARB/USDC",
      price: "$1.24",
      change: "+5.67%",
      volume: "$3.2M",
      isPositive: true,
      tokenA: contracts.vault.address,
      tokenB: contracts.vault.address,
    },
    {
      pair: "USDC/DAI",
      price: "$1.0002",
      change: "+0.01%",
      volume: "$15.8M",
      isPositive: true,
      tokenA: contracts.vault.address,
      tokenB: contracts.vault.address,
    },
  ];

  // Generate mock recent trades
  const generateRecentTrades = useCallback((): Trade[] => {
    const trades: Trade[] = [
      {
        id: 1,
        pair: "ETH/USDC",
        type: "Buy",
        amount: "0.5 ETH",
        price: "$2,845.00",
        total: "$1,422.50",
        time: "2 min ago",
        status: "Completed",
      },
      {
        id: 2,
        pair: "BTC/USDC",
        type: "Sell",
        amount: "0.1 BTC",
        price: "$43,600.00",
        total: "$4,360.00",
        time: "15 min ago",
        status: "Completed",
      },
      {
        id: 3,
        pair: "ARB/USDC",
        type: "Buy",
        amount: "1000 ARB",
        price: "$1.23",
        total: "$1,230.00",
        time: "1 hour ago",
        status: "Pending",
      },
    ];
    return trades;
  }, []);

  // Generate mock open orders
  const generateOpenOrders = useCallback((): OpenOrder[] => {
    const orders: OpenOrder[] = [
      {
        id: 1,
        pair: "ETH/USDC",
        type: "Limit Buy",
        amount: "1.0 ETH",
        price: "$2,800.00",
        filled: "0%",
        status: "Open",
      },
      {
        id: 2,
        pair: "BTC/USDC",
        type: "Limit Sell",
        amount: "0.2 BTC",
        price: "$44,000.00",
        filled: "25%",
        status: "Partial",
      },
    ];
    return orders;
  }, []);

  // Calculate trading stats
  const calculateStats = useCallback((pairs: TradingPair[], trades: Trade[], orders: OpenOrder[]): TradingStats => {
    const volume24h = pairs.reduce((total, pair) => {
      const volume = parseFloat(pair.volume.replace(/[$M,]/g, ''));
      return total + volume;
    }, 0);

    const userPnL = 1247; // Mock P&L
    
    return {
      volume24h: `$${volume24h.toFixed(1)}M`,
      activePairs: pairs.length,
      userPnL: `${userPnL >= 0 ? '+' : ''}$${Math.abs(userPnL).toLocaleString()}`,
      openOrders: orders.length,
      isPositivePnL: userPnL >= 0,
    };
  }, []);

  // Fetch all trading data
  const fetchTradingData = useCallback(async () => {
    if (!authenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [pairs, trades, orders, priceData] = await Promise.all([
        fetchTradingPairs(),
        Promise.resolve(generateRecentTrades()),
        Promise.resolve(generateOpenOrders()),
        Promise.resolve(generatePriceData()),
      ]);

      const stats = calculateStats(pairs, trades, orders);

      setTradingData({
        tradingPairs: pairs,
        recentTrades: trades,
        openOrders: orders,
        priceData,
        stats,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching trading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trading data');
      
      // Set fallback data
      const fallbackPairs = getDefaultTradingPairs();
      const fallbackTrades = generateRecentTrades();
      const fallbackOrders = generateOpenOrders();
      const fallbackPriceData = generatePriceData();
      const fallbackStats = calculateStats(fallbackPairs, fallbackTrades, fallbackOrders);
      
      setTradingData({
        tradingPairs: fallbackPairs,
        recentTrades: fallbackTrades,
        openOrders: fallbackOrders,
        priceData: fallbackPriceData,
        stats: fallbackStats,
        isLoading: false,
        error: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, fetchTradingPairs, generateRecentTrades, generateOpenOrders, generatePriceData, calculateStats]);

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchTradingData();
  }, [fetchTradingData]);

  // Swap tokens function
  const swapTokens = useCallback(async (
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string
  ) => {
    const result = await contractSwap(tokenIn, tokenOut, amountIn, minAmountOut);
    
    // Refresh data after successful swap
    if (result.success) {
      setTimeout(() => {
        refreshData();
      }, 2000); // Wait 2 seconds for transaction to be mined
    }
    
    return result;
  }, [contractSwap, refreshData]);

  // Initial data fetch
  useEffect(() => {
    fetchTradingData();
  }, [fetchTradingData]);

  // Periodic data refresh (every 30 seconds)
  useEffect(() => {
    if (!authenticated) return;

    const interval = setInterval(() => {
      fetchTradingData();
    }, 30000);

    return () => clearInterval(interval);
  }, [authenticated, fetchTradingData]);

  return {
    ...tradingData,
    swapTokens,
    refreshData,
  };
}