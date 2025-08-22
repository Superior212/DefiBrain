"use client";

import { useState, useEffect } from 'react';
import { useContract } from './useContract';
import { usePortfolio, PortfolioData } from './usePortfolio';

// Strategy interfaces
export interface Strategy {
  id: string;
  name: string;
  protocol: string;
  apy: string;
  tvl: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Inactive' | 'Paused';
  allocation: string;
  performance: string;
  address: string;
  riskLevel: number;
}

export interface AvailableStrategy {
  name: string;
  protocol: string;
  apy: string;
  tvl: string;
  risk: 'Low' | 'Medium' | 'High';
  minDeposit: string;
  lockPeriod: string;
  address: string;
}

export interface PerformancePoint {
  name: string;
  value: number;
}

export interface RiskMetric {
  name: string;
  value: number;
  color: string;
}

export interface StrategiesStats {
  activeStrategies: number;
  totalDeployed: string;
  avgAPY: string;
  totalReturn: string;
}

export interface StrategiesData {
  activeStrategies: Strategy[];
  availableStrategies: AvailableStrategy[];
  performanceData: PerformancePoint[];
  riskMetrics: RiskMetric[];
  stats: StrategiesStats;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

export function useStrategies(): StrategiesData {
  const [activeStrategies, setActiveStrategies] = useState<Strategy[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<AvailableStrategy[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([]);
  const [stats, setStats] = useState<StrategiesStats>({
    activeStrategies: 0,
    totalDeployed: '$0.00',
    avgAPY: '0.0%',
    totalReturn: '$0.00'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getContract } = useContract();
  const { portfolioData, vaultInfo } = usePortfolio();

  const fetchStrategiesData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch active strategies from vault
      const vaultContract = getContract('vault');
      let strategiesCount = 0;
      
      if (vaultContract) {
        try {
          // For now, we'll assume there's at least one strategy if vault exists
          strategiesCount = 1;
        } catch (err) {
          console.warn('Error fetching strategies count:', err);
        }
      }

      const activeStrategiesList: Strategy[] = [];
      
      // For now, we'll use the YieldFarmingStrategy as our primary strategy
      if (strategiesCount && Number(strategiesCount) > 0) {
        try {
          const strategyContract = getContract('yieldFarmingStrategy');
          let strategyInfo = null;
          
          if (strategyContract) {
            // For now, we'll use mock data since direct contract reading is complex
            // In production, you'd use thirdweb's readContract or similar
            strategyInfo = [
              'USDC Yield Optimizer',
              'A yield farming strategy for USDC',
              BigInt(1000000 * 1e18), // 1M USDC TVL
              BigInt(1250), // 12.5% APY
              5 // Medium risk
            ];
          }

          if (strategyInfo) {
            const [name, description, tvl, apy, riskLevel] = strategyInfo;
            const strategy: Strategy = {
              id: '1',
              name: String(name) || 'USDC Yield Optimizer',
              protocol: 'DeFiBrain Protocol',
              apy: `${(Number(apy) / 100).toFixed(1)}%`,
              tvl: `$${(Number(tvl) / 1e18).toLocaleString()}`,
              risk: getRiskLevel(Number(riskLevel)),
              status: 'Active',
              allocation: portfolioData?.totalDeposited || '$0.00',
              performance: portfolioData?.totalYield ? `+${portfolioData.totalYield}` : '+0.0%',
              address: process.env.NEXT_PUBLIC_YIELD_STRATEGY_ADDRESS || '',
              riskLevel: Number(riskLevel)
            };
            activeStrategiesList.push(strategy);
          }
        } catch (err) {
          console.warn('Error fetching strategy info:', err);
        }
      }

      // Generate mock available strategies for demonstration
      const availableStrategiesList: AvailableStrategy[] = [
        {
          name: 'Arbitrum Yield Farm',
          protocol: 'Camelot',
          apy: '22.4%',
          tvl: '$890K',
          risk: 'High',
          minDeposit: '$100',
          lockPeriod: '30 days',
          address: '0x0000000000000000000000000000000000000000'
        },
        {
          name: 'Stablecoin Arbitrage',
          protocol: 'Curve',
          apy: '8.9%',
          tvl: '$12.5M',
          risk: 'Low',
          minDeposit: '$50',
          lockPeriod: 'None',
          address: '0x0000000000000000000000000000000000000000'
        },
        {
          name: 'Delta Neutral Strategy',
          protocol: 'GMX',
          apy: '16.8%',
          tvl: '$4.2M',
          risk: 'Medium',
          minDeposit: '$500',
          lockPeriod: '14 days',
          address: '0x0000000000000000000000000000000000000000'
        }
      ];

      // Generate performance data based on portfolio data
      const performanceDataList: PerformancePoint[] = generatePerformanceData(portfolioData);

      // Calculate risk metrics based on active strategies
      const riskMetricsList: RiskMetric[] = calculateRiskMetrics(activeStrategiesList);

      // Calculate stats
      const calculatedStats: StrategiesStats = calculateStats(activeStrategiesList, portfolioData);

      setActiveStrategies(activeStrategiesList);
      setAvailableStrategies(availableStrategiesList);
      setPerformanceData(performanceDataList);
      setRiskMetrics(riskMetricsList);
      setStats(calculatedStats);

    } catch (err) {
      console.error('Error fetching strategies data:', err);
      setError('Failed to load strategies data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchStrategiesData();
  };

  useEffect(() => {
    fetchStrategiesData();
  }, [portfolioData, vaultInfo]);

  return {
    activeStrategies,
    availableStrategies,
    performanceData,
    riskMetrics,
    stats,
    isLoading,
    error,
    refreshData
  };
}

// Helper functions
function getRiskLevel(riskLevel: number): 'Low' | 'Medium' | 'High' {
  if (riskLevel <= 3) return 'Low';
  if (riskLevel <= 7) return 'Medium';
  return 'High';
}

function generatePerformanceData(portfolioData: PortfolioData | null): PerformancePoint[] {
  const baseValue = 100;
  const totalReturn = portfolioData?.totalYield ? parseFloat(portfolioData.totalYield) : 0;
  const monthlyGrowth = totalReturn / 6; // Spread over 6 months

  return [
    { name: 'Jan', value: baseValue },
    { name: 'Feb', value: baseValue + monthlyGrowth },
    { name: 'Mar', value: baseValue + monthlyGrowth * 2 },
    { name: 'Apr', value: baseValue + monthlyGrowth * 3 },
    { name: 'May', value: baseValue + monthlyGrowth * 4 },
    { name: 'Jun', value: baseValue + monthlyGrowth * 5 }
  ];
}

function calculateRiskMetrics(strategies: Strategy[]): RiskMetric[] {
  if (strategies.length === 0) {
    return [
      { name: 'Low Risk', value: 33, color: '#10b981' },
      { name: 'Medium Risk', value: 33, color: '#f59e0b' },
      { name: 'High Risk', value: 34, color: '#ef4444' }
    ];
  }

  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  strategies.forEach(strategy => {
    riskCounts[strategy.risk]++;
  });

  const total = strategies.length;
  return [
    { name: 'Low Risk', value: Math.round((riskCounts.Low / total) * 100), color: '#10b981' },
    { name: 'Medium Risk', value: Math.round((riskCounts.Medium / total) * 100), color: '#f59e0b' },
    { name: 'High Risk', value: Math.round((riskCounts.High / total) * 100), color: '#ef4444' }
  ];
}

function calculateStats(strategies: Strategy[], portfolioData: PortfolioData | null): StrategiesStats {
  const activeCount = strategies.length;
  const totalDeployed = portfolioData?.totalDeposited || '$0.00';
  
  // Calculate average APY
  const avgAPY = strategies.length > 0 
    ? strategies.reduce((sum, strategy) => {
        const apy = parseFloat(strategy.apy.replace('%', ''));
        return sum + apy;
      }, 0) / strategies.length
    : 0;

  const totalReturn = portfolioData?.totalYield || '$0.00';

  return {
    activeStrategies: activeCount,
    totalDeployed,
    avgAPY: `${avgAPY.toFixed(1)}%`,
    totalReturn
  };
}