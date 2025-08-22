"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Plus,
  Minus,
  ArrowUpDown,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePortfolio } from "@/hooks/usePortfolio";
import { TransactionTest } from "@/components/test/TransactionTest";

interface PortfolioPosition {
  id: string;
  name: string;
  protocol: string;
  amount: string;
  apy: string;
  earned: string;
  risk: string;
  color: string;
  icon: LucideIcon;
}

// Portfolio page now uses real data from usePortfolio hook

export default function PortfolioPage() {
  const { portfolioData, vaultInfo, isLoading } = usePortfolio();

  // Create portfolio positions from real data
  const allPositions: PortfolioPosition[] = [];
  
  // Add vault position if available
  if (vaultInfo) {
    allPositions.push({
      id: 'vault-1',
      name: 'DeFiBrain Vault',
      protocol: 'DeFiBrain Protocol',
      amount: `$${portfolioData?.totalDeposited || '0.00'}`,
      apy: `${vaultInfo.apy || 0}%`,
      earned: `+$${portfolioData?.totalYield || '0.00'}`,
      risk: 'Medium',
      color: 'bg-purple-500/20',
      icon: Target
    });
  }
  
  // Add other positions from portfolio data if they exist
   if (portfolioData?.positions) {
     portfolioData.positions.forEach((pos, index) => {
       allPositions.push({
         id: `position-${index}`,
         name: pos.symbol || 'Unknown Asset',
         protocol: 'DeFi Protocol',
         amount: `$${pos.value || '0.00'}`,
         apy: '0.0%',
         earned: '+$0.00',
         risk: 'Medium',
         color: 'bg-blue-500/20',
         icon: Target
       });
     });
   }

  // Calculate portfolio allocation based on real data
  const totalValue = parseFloat(portfolioData?.totalValue || '0');
  const allocation = totalValue > 0 ? [
    {
      asset: 'USDC',
      percentage: Math.round((parseFloat(portfolioData?.totalDeposited || '0') / totalValue) * 100),
      value: `$${portfolioData?.totalDeposited || '0.00'}`,
      color: 'bg-green-500'
    },
    {
      asset: 'Yield',
      percentage: Math.round((parseFloat(portfolioData?.totalYield || '0') / totalValue) * 100),
      value: `$${portfolioData?.totalYield || '0.00'}`,
      color: 'bg-purple-500'
    }
  ] : [];

  // Mock recent transactions (would be replaced with real transaction history)
  const recentTransactions = [
    {
      id: 1,
      type: 'deposit',
      action: 'Deposit to DeFiBrain Vault',
      amount: `+${portfolioData?.totalDeposited || '0'} USDC`,
      time: '1 hour ago',
      status: 'Confirmed',
      icon: ArrowUpRight
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Portfolio</h1>
              <p className="text-muted-foreground mt-1">Manage your DeFi positions and track performance</p>
            </div>
            <div className="flex space-x-2">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button variant="outline">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Positions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>
                Your current DeFi investments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allPositions.length > 0 ? allPositions.map((position) => {
                  const Icon = position.icon;
                  return (
                    <div key={position.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${position.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium">{position.name}</h3>
                            <p className="text-sm text-muted-foreground">{position.protocol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-semibold">{position.apy}</p>
                          <p className="text-xs text-muted-foreground">APY</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{position.amount}</p>
                          <p className="text-xs text-muted-foreground">Deposited</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-medium">{position.earned}</p>
                          <p className="text-xs text-muted-foreground">Earned</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant={position.risk === "Low" ? "secondary" : position.risk === "Medium" ? "default" : "destructive"}>
                          {position.risk} Risk
                        </Badge>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Manage
                          </Button>
                          <Button size="sm">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Add More
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active positions yet</p>
                    <p className="text-sm">Start by depositing into a vault</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>
                Asset distribution breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allocation.length > 0 ? allocation.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                      <span>{item.asset}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{item.percentage}%</span>
                      <p className="text-sm text-muted-foreground">{item.value}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-12 h-12 mx-auto mb-4 opacity-50 bg-muted rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6" />
                    </div>
                    <p>No allocation data available</p>
                    <p className="text-sm">Start by depositing into a vault</p>
                  </div>
                )}
                <Button className="w-full mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rebalance Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your latest DeFi activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? recentTransactions.map((transaction) => {
                const Icon = transaction.icon;
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'deposit' ? 'bg-green-500/20' :
                        transaction.type === 'withdraw' ? 'bg-red-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          transaction.type === 'deposit' ? 'text-green-600' :
                          transaction.type === 'withdraw' ? 'text-red-600' :
                          'text-purple-600'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{transaction.action}</div>
                        <div className="text-xs text-muted-foreground">{transaction.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{transaction.amount}</div>
                      <div className="text-xs text-green-600">{transaction.status}</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent transactions</p>
                  <p className="text-sm">Your transaction history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Test Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Transaction Testing</h2>
        <TransactionTest />
      </div>
    </div>
  );
}