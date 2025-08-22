import { useState, useEffect } from 'react';
import { usePortfolio } from './usePortfolio';

// AI Backend API configuration
const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8001';

// API Types
interface PortfolioData {
  totalValue: number;
  positions: Array<{
    token: string;
    amount: number;
    value: number;
  }>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface VaultInfo {
  apy: number;
  tvl: number;
  strategy: string;
  riskLevel: string;
}

interface PricePredictionResponse {
  predictions: Record<string, {
    price: number;
    confidence: number;
    timeframe: string;
    trend: 'bullish' | 'bearish' | 'neutral';
  }>;
}

interface YieldOptimizationResponse {
  recommendations: Array<{
    protocol: string;
    apy: number;
    risk_score: number;
    allocation_percentage: number;
  }>;
  expected_yield: number;
  risk_assessment: string;
}

interface MarketAnalysisResponse {
  signals: Record<string, {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    indicators: Record<string, number>;
    sentiment: number;
  }>;
  market_sentiment: string;
  volatility_index: number;
}

// API client for AI backend
class AIBackendClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getPortfolioInsights(portfolioData: PortfolioData, vaultInfo: VaultInfo): Promise<AIInsight[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/portfolio/insights`, {
        method: 'POST',
        body: JSON.stringify({
          portfolio_data: portfolioData,
          vault_info: vaultInfo,
          tokens: ['ETH', 'BTC', 'USDC']
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.insights || [];
    } catch (error) {
      console.error('Error fetching portfolio insights:', error);
      return [];
    }
  }

  async getPricePredictions(tokens: string[]): Promise<PricePredictionResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/predict/price`, {
        method: 'POST',
        body: JSON.stringify({ tokens })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching price predictions:', error);
      return null;
    }
  }

  async getYieldOptimization(portfolioData: PortfolioData): Promise<YieldOptimizationResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/optimize/yield`, {
        method: 'POST',
        body: JSON.stringify({ portfolio_data: portfolioData })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching yield optimization:', error);
      return null;
    }
  }

  async getMarketAnalysis(tokens: string[]): Promise<MarketAnalysisResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/analyze/market`, {
        method: 'POST',
        body: JSON.stringify({ tokens })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching market analysis:', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {}, 5000);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

const aiClient = new AIBackendClient(AI_BACKEND_URL);

// AI Insight types
interface AIInsight {
  id: number;
  type: 'opportunity' | 'risk' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  impact: 'High' | 'Medium' | 'Low';
  timeframe: string;
  action: string;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
}

interface ConfidenceMetrics {
  current: number;
  trend: 'up' | 'down' | 'stable';
  categories: {
    name: string;
    confidence: number;
    color: string;
  }[];
  lastUpdated: string;
}

interface AIStats {
  aiConfidence: number;
  activeInsights: number;
  portfolioScore: number;
  riskLevel: string;
}

interface AIData {
  insights: AIInsight[];
  chatHistory: ChatMessage[];
  confidenceMetrics: ConfidenceMetrics;
  stats: AIStats;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
}

export function useAI(): AIData {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [confidenceMetrics, setConfidenceMetrics] = useState<ConfidenceMetrics>({
    current: 0,
    trend: 'stable',
    categories: [],
    lastUpdated: 'Loading...'
  });
  const [stats, setStats] = useState<AIStats>({
    aiConfidence: 0,
    activeInsights: 0,
    portfolioScore: 0,
    riskLevel: 'Unknown'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const { portfolioData, vaultInfo } = usePortfolio();

  // Send message to AI chat
  const sendMessage = async (message: string): Promise<void> => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      message: message.trim(),
      timestamp: 'just now'
    };

    // Add user message immediately
    setChatHistory(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const isHealthy = await aiClient.checkHealth();
      
      if (isHealthy) {
        // Send to AI backend
        const response = await fetch(`${AI_BACKEND_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            portfolio_data: portfolioData,
            chat_history: chatHistory.slice(-5) // Send last 5 messages for context
          })
        });

        if (response.ok) {
          const aiResponse = await response.json();
          const aiMessage: ChatMessage = {
            id: Date.now() + 1,
            type: 'ai',
            message: aiResponse.response,
            timestamp: 'just now'
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          throw new Error('AI backend response failed');
        }
      } else {
        throw new Error('AI backend not available');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        message: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again later.',
        timestamp: 'just now'
      };
      setChatHistory(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Generate AI insights using backend or fallback to rule-based
  const generateInsights = async (portfolioData: { totalValue?: string; totalDeposited?: string; totalYield?: string; yieldPercentage?: number } | null, vaultInfo: { apy?: number } | null): Promise<AIInsight[]> => {
    if (!portfolioData || !vaultInfo) {
      return [];
    }

    try {
      // Check if AI backend is available
      const isHealthy = await aiClient.checkHealth();
      
      if (isHealthy) {
        // Convert portfolio data to expected format for AI backend
        const portfolioForAI: PortfolioData = {
          totalValue: parseFloat(portfolioData.totalValue || '0'),
          positions: [
            {
              token: 'ETH',
              amount: parseFloat(portfolioData.totalDeposited || '0'),
              value: parseFloat(portfolioData.totalValue || '0')
            }
          ],
          performance: {
            daily: portfolioData.yieldPercentage || 0,
            weekly: (portfolioData.yieldPercentage || 0) * 7,
            monthly: (portfolioData.yieldPercentage || 0) * 30
          }
        };

        const vaultForAI: VaultInfo = {
          apy: vaultInfo.apy || 0,
          tvl: parseFloat(portfolioData.totalValue || '0'),
          strategy: 'yield-farming',
          riskLevel: 'medium'
        };

        // Use AI backend for insights
        const aiInsights = await aiClient.getPortfolioInsights(portfolioForAI, vaultForAI);
        return aiInsights;
      } else {
        // Fallback to rule-based insights
        return generateFallbackInsights(portfolioData, vaultInfo);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      // Use fallback insights on error
      return generateFallbackInsights(portfolioData, vaultInfo);
    }
  };

  const generateFallbackInsights = (portfolioData: { totalValue?: string; totalDeposited?: string; totalYield?: string; yieldPercentage?: number }, vaultInfo: { apy?: number }): AIInsight[] => {
    const insights: AIInsight[] = [];
    let insightId = 1;

    const totalValue = parseFloat(portfolioData.totalValue || '0');
    const totalDeposited = parseFloat(portfolioData.totalDeposited || '0');
    const totalYield = parseFloat(portfolioData.totalYield || '0');
    const yieldPercentage = portfolioData.yieldPercentage || 0;
    const vaultAPY = vaultInfo.apy || 0;

    // Opportunity insights
    if (vaultAPY > 8) {
      insights.push({
        id: insightId++,
        type: 'opportunity',
        title: 'High Yield Opportunity Available',
        description: `Your vault is currently earning ${vaultAPY.toFixed(1)}% APY. Consider increasing your position to maximize returns.`,
        confidence: 88,
        impact: 'High',
        timeframe: '24 hours',
        action: 'Increase Deposit'
      });
    }

    if (totalDeposited < totalValue * 0.5) {
      insights.push({
        id: insightId++,
        type: 'opportunity',
        title: 'Underutilized Capital Detected',
        description: `Only ${((totalDeposited / totalValue) * 100).toFixed(1)}% of your portfolio is actively earning yield. Consider deploying more capital.`,
        confidence: 82,
        impact: 'Medium',
        timeframe: '1 hour',
        action: 'Deploy Capital'
      });
    }

    // Risk insights
    if (totalDeposited > totalValue * 0.8) {
      insights.push({
        id: insightId++,
        type: 'risk',
        title: 'High Concentration Risk',
        description: `${((totalDeposited / totalValue) * 100).toFixed(1)}% of your portfolio is in a single vault. Consider diversifying across multiple protocols.`,
        confidence: 75,
        impact: 'Medium',
        timeframe: 'Immediate',
        action: 'Diversify Holdings'
      });
    }

    if (yieldPercentage < 0) {
      insights.push({
        id: insightId++,
        type: 'risk',
        title: 'Negative Yield Alert',
        description: `Your portfolio is currently showing negative returns of ${yieldPercentage.toFixed(2)}%. Review your positions for potential issues.`,
        confidence: 92,
        impact: 'High',
        timeframe: 'Immediate',
        action: 'Review Positions'
      });
    }

    // Optimization insights
    if (totalYield > 0 && yieldPercentage > 5) {
      insights.push({
        id: insightId++,
        type: 'optimization',
        title: 'Compound Rewards Opportunity',
        description: `You've earned $${totalYield.toFixed(2)} in yield. Consider compounding these rewards to maximize returns.`,
        confidence: 90,
        impact: 'Medium',
        timeframe: '2 hours',
        action: 'Compound Rewards'
      });
    }

    // Gas optimization
    insights.push({
      id: insightId++,
      type: 'optimization',
      title: 'Gas Fee Optimization',
      description: 'Network congestion is currently low. Optimal time for rebalancing and executing transactions.',
      confidence: 85,
      impact: 'Low',
      timeframe: '4 hours',
      action: 'Execute Transactions'
    });

    return insights;
  };

  // Generate chat history based on portfolio data
  const generateChatHistory = (portfolioData: { totalValue?: string; totalDeposited?: string; yieldPercentage?: number } | null, vaultInfo: { apy?: number } | null): ChatMessage[] => {
    // Return empty array to start with clean chat
    return [];
  };

  // Generate confidence metrics using AI backend or fallback
  const generateConfidenceMetrics = async (portfolioData: { totalValue?: string; totalDeposited?: string; yieldPercentage?: number } | null, vaultInfo: { apy?: number } | null): Promise<ConfidenceMetrics> => {
    try {
      const isHealthy = await aiClient.checkHealth();
      
      if (isHealthy && portfolioData && vaultInfo) {
        // Try to get market analysis for confidence metrics
        const marketAnalysis = await aiClient.getMarketAnalysis(['ETH', 'BTC', 'USDC']);
        
        if (marketAnalysis) {
          const marketAnalysisConfidence = Math.min(95, Math.max(60, (1 - marketAnalysis.volatility_index) * 100));
          const riskAssessmentConfidence = Math.min(95, Math.max(65, (1 - marketAnalysis.volatility_index) * 100));
          const portfolioHealthConfidence = Math.min(98, Math.max(70, 85 + (vaultInfo.apy || 0) / 2));
          const yieldPredictionConfidence = Math.min(92, Math.max(60, 75 + (marketAnalysis.volatility_index > 0.5 ? 10 : -5)));
          
          const overallConfidence = Math.round(
            (marketAnalysisConfidence + riskAssessmentConfidence + portfolioHealthConfidence + yieldPredictionConfidence) / 4
          );
          
          const yieldPercentage = portfolioData.yieldPercentage || 0;
          
          return {
            current: overallConfidence,
            trend: yieldPercentage > 0 ? 'up' : yieldPercentage < 0 ? 'down' : 'stable',
            categories: [
              { name: 'Market Analysis', confidence: marketAnalysisConfidence, color: 'text-green-600' },
              { name: 'Risk Assessment', confidence: riskAssessmentConfidence, color: riskAssessmentConfidence > 80 ? 'text-green-600' : 'text-yellow-600' },
              { name: 'Portfolio Health', confidence: portfolioHealthConfidence, color: portfolioHealthConfidence > 80 ? 'text-green-600' : 'text-red-600' },
              { name: 'Yield Predictions', confidence: yieldPredictionConfidence, color: 'text-purple-600' }
            ],
            lastUpdated: 'Just now'
          };
        }
      }
    } catch (error) {
      console.error('Error generating AI confidence metrics:', error);
    }
    
    // Fallback to rule-based confidence metrics
    return generateFallbackConfidenceMetrics(portfolioData, vaultInfo);
  };

  const generateFallbackConfidenceMetrics = (portfolioData: { totalValue?: string; totalDeposited?: string; yieldPercentage?: number } | null, vaultInfo: { apy?: number } | null): ConfidenceMetrics => {
    if (!portfolioData || !vaultInfo) {
      return {
        current: 0,
        trend: 'stable',
        categories: [],
        lastUpdated: 'Loading...'
      };
    }

    const totalValue = parseFloat(portfolioData.totalValue || '0');
    const totalDeposited = parseFloat(portfolioData.totalDeposited || '0');
    const yieldPercentage = portfolioData.yieldPercentage || 0;
    const vaultAPY = vaultInfo.apy || 0;

    // Calculate confidence based on portfolio health
    const deploymentRatio = totalValue > 0 ? totalDeposited / totalValue : 0;
    const marketAnalysisConfidence = vaultAPY > 5 ? 90 : 70;
    const riskAssessmentConfidence = deploymentRatio > 0.8 ? 65 : deploymentRatio < 0.3 ? 75 : 85;
    const portfolioHealthConfidence = yieldPercentage > 0 ? 90 : 60;
    const yieldPredictionConfidence = vaultAPY > 0 ? 85 : 70;

    const overallConfidence = Math.round(
      (marketAnalysisConfidence + riskAssessmentConfidence + portfolioHealthConfidence + yieldPredictionConfidence) / 4
    );

    return {
      current: overallConfidence,
      trend: yieldPercentage > 0 ? 'up' : yieldPercentage < 0 ? 'down' : 'stable',
      categories: [
        { name: 'Market Analysis', confidence: marketAnalysisConfidence, color: 'text-green-600' },
        { name: 'Risk Assessment', confidence: riskAssessmentConfidence, color: riskAssessmentConfidence > 80 ? 'text-green-600' : 'text-yellow-600' },
        { name: 'Portfolio Health', confidence: portfolioHealthConfidence, color: portfolioHealthConfidence > 80 ? 'text-green-600' : 'text-red-600' },
        { name: 'Yield Predictions', confidence: yieldPredictionConfidence, color: 'text-purple-600' }
      ],
      lastUpdated: 'Just now'
    };
  };

  // Generate AI stats using backend or fallback
  const generateStats = async (insights: AIInsight[], confidenceMetrics: ConfidenceMetrics, portfolioData: { totalValue?: string; totalDeposited?: string; yieldPercentage?: number } | null, vaultInfo: { apy?: number } | null): Promise<AIStats> => {
    try {
      const isHealthy = await aiClient.checkHealth();
      
      if (isHealthy && portfolioData && vaultInfo) {
        // Convert portfolio data for AI backend
        const portfolioForAI: PortfolioData = {
          totalValue: parseFloat(portfolioData.totalValue || '0'),
          positions: [{
            token: 'ETH',
            amount: parseFloat(portfolioData.totalDeposited || '0'),
            value: parseFloat(portfolioData.totalValue || '0')
          }],
          performance: {
            daily: portfolioData.yieldPercentage || 0,
            weekly: (portfolioData.yieldPercentage || 0) * 7,
            monthly: (portfolioData.yieldPercentage || 0) * 30
          }
        };
        
        // Try to get yield optimization for better stats
        const yieldOptimization = await aiClient.getYieldOptimization(portfolioForAI);
        
        if (yieldOptimization) {
          const portfolioScore = Math.min(100, Math.max(0, yieldOptimization.expected_yield * 10));
          let riskLevel = 'Low';
          if (yieldOptimization.risk_assessment.toLowerCase().includes('high')) riskLevel = 'High';
          else if (yieldOptimization.risk_assessment.toLowerCase().includes('medium')) riskLevel = 'Medium';
          
          return {
            aiConfidence: confidenceMetrics.current,
            activeInsights: insights.length,
            portfolioScore: Math.round(portfolioScore),
            riskLevel
          };
        }
      }
    } catch (error) {
      console.error('Error generating AI stats:', error);
    }
    
    // Fallback to rule-based stats
    return generateFallbackStats(insights, confidenceMetrics, portfolioData);
  };

  const generateFallbackStats = (insights: AIInsight[], confidenceMetrics: ConfidenceMetrics, portfolioData: { totalValue?: string; yieldPercentage?: number } | null): AIStats => {
    const totalValue = parseFloat(portfolioData?.totalValue || '0');
    const yieldPercentage = portfolioData?.yieldPercentage || 0;
    
    // Calculate portfolio score based on various factors
    const portfolioScore = Math.min(100, Math.max(0, 
      (yieldPercentage > 0 ? 30 : 0) + // Positive yield
      (totalValue > 1000 ? 25 : totalValue > 100 ? 15 : 5) + // Portfolio size
      (confidenceMetrics.current * 0.4) // AI confidence
    ));

    // Determine risk level
    let riskLevel = 'Low';
    if (portfolioScore < 40) riskLevel = 'High';
    else if (portfolioScore < 70) riskLevel = 'Medium';

    return {
      aiConfidence: confidenceMetrics.current,
      activeInsights: insights.length,
      portfolioScore: Math.round(portfolioScore),
      riskLevel
    };
  };

  useEffect(() => {
    const loadAIData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for portfolio data to be available
        if (!portfolioData || !vaultInfo) {
          return;
        }

        // Generate AI insights and data based on real portfolio data
        const generatedInsights = await generateInsights(portfolioData, vaultInfo);
        const generatedChatHistory = generateChatHistory(portfolioData, vaultInfo);
        const generatedConfidenceMetrics = await generateConfidenceMetrics(portfolioData, vaultInfo);
        const generatedStats = await generateStats(generatedInsights, generatedConfidenceMetrics, portfolioData, vaultInfo);

        setInsights(generatedInsights);
        setChatHistory(generatedChatHistory);
        setConfidenceMetrics(generatedConfidenceMetrics);
        setStats(generatedStats);

      } catch (err) {
        console.error('Error loading AI data:', err);
        setError('Failed to load AI insights');
        
        // Set fallback data on error
        if (portfolioData && vaultInfo) {
          const fallbackInsights = generateFallbackInsights(portfolioData, vaultInfo);
          const fallbackChatHistory = generateChatHistory(portfolioData, vaultInfo);
          const fallbackConfidenceMetrics = await generateConfidenceMetrics(portfolioData, vaultInfo);
          const fallbackStats = await generateStats(fallbackInsights, fallbackConfidenceMetrics, portfolioData, vaultInfo);

          setInsights(fallbackInsights);
          setChatHistory(fallbackChatHistory);
          setConfidenceMetrics(fallbackConfidenceMetrics);
          setStats(fallbackStats);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAIData();
  }, [portfolioData, vaultInfo]);

  return {
    insights,
    chatHistory,
    confidenceMetrics,
    stats,
    isLoading,
    error,
    sendMessage,
    isTyping
  };
}