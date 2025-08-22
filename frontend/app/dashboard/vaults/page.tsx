"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Target,
  Zap,
  Wallet,
  Eye
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Tooltip } from "recharts";

// Dynamic data is now generated from usePortfolio hook

// Risk distribution will be calculated dynamically in the component

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "Very Low":
    case "Low":
      return "bg-green-100 text-green-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "High":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function VaultsPage() {
  const { portfolioData, vaultInfo, isLoading, error } = usePortfolio();

  // Generate dynamic vault performance data
  const generateVaultPerformance = () => {
    if (!portfolioData || !vaultInfo) return [];
    
    const currentValue = parseFloat(portfolioData.totalValue);
    const baseValue = parseFloat(portfolioData.totalDeposited) || currentValue * 0.8;
    
    return [
      { month: "Jan", value: baseValue, change: 0 },
      { month: "Feb", value: baseValue * 1.033, change: 3.3 },
      { month: "Mar", value: baseValue * 1.088, change: 5.5 },
      { month: "Apr", value: baseValue * 1.055, change: -3.0 },
      { month: "May", value: baseValue * 1.124, change: 6.9 },
      { month: "Jun", value: currentValue, change: portfolioData.yieldPercentage || 6.9 },
    ];
  };

  const vaultPerformanceData = generateVaultPerformance();
  const totalReturn = portfolioData?.yieldPercentage || 0;
  const autoManagedAssets = parseFloat(portfolioData?.totalValue || '0');
  const aiOptimizedYield = parseFloat(portfolioData?.totalYield || '0');
  const avgAutoAPY = vaultInfo?.apy || 0;

  // Generate dynamic vaults based on real data
  const generateVaults = () => {
    if (!portfolioData || !vaultInfo) return [];
    
    const totalAssets = parseFloat(vaultInfo.totalAssets);
    const totalDeposited = parseFloat(portfolioData.totalDeposited);
    
    const vaults = [
      {
        id: 1,
        name: "Smart ETH Optimizer",
        protocol: "DefiBrain AI",
        apy: `${vaultInfo.apy.toFixed(1)}%`,
        tvl: `$${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        yourDeposit: `$${totalDeposited.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        risk: "Low",
        status: totalDeposited > 0 ? "Auto-Active" : "Available",
        lockPeriod: "Flexible",
        description: "AI-powered yield optimization with automatic rebalancing",
        automation: "Real-time protocol switching",
        criteria: "Maximize yield, minimize gas"
      }
    ];
    
    // Add additional mock vaults for demonstration
    if (portfolioData.positions && portfolioData.positions.length > 0) {
      portfolioData.positions.forEach((position, index) => {
        if (index < 3) { // Limit to 3 additional vaults
          const positionValue = parseFloat(position.value);
          vaults.push({
            id: index + 2,
            name: `${position.symbol} Strategy`,
            protocol: "DefiBrain Core",
            apy: `${(5 + Math.random() * 10).toFixed(1)}%`,
            tvl: `$${(Math.random() * 50000000 + 10000000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            yourDeposit: `$${positionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            risk: positionValue > 1000 ? "Medium" : "Low",
            status: positionValue > 0 ? "Auto-Active" : "Available",
            lockPeriod: "Auto-optimized",
            description: `Automated ${position.symbol} yield farming with dynamic protocol allocation`,
            automation: "24/7 yield monitoring",
            criteria: "Stable returns, low volatility"
          });
        }
      });
    }
    
    return vaults;
  };

  const dynamicVaults = generateVaults();

  // Generate dynamic risk distribution based on vault data
  const generateRiskDistribution = () => {
    if (!dynamicVaults || dynamicVaults.length === 0) {
      return [
        { name: "Low Risk", value: 45, color: "#10b981" },
        { name: "Medium Risk", value: 35, color: "#f59e0b" },
        { name: "High Risk", value: 20, color: "#ef4444" }
      ];
    }

    const riskCounts = { low: 0, medium: 0, high: 0 };
    dynamicVaults.forEach(vault => {
      const risk = vault.risk.toLowerCase();
      if (risk.includes('low')) riskCounts.low++;
      else if (risk.includes('medium')) riskCounts.medium++;
      else if (risk.includes('high')) riskCounts.high++;
    });

    const total = riskCounts.low + riskCounts.medium + riskCounts.high;
    if (total === 0) {
      return [
        { name: "Low Risk", value: 100, color: "#10b981" },
        { name: "Medium Risk", value: 0, color: "#f59e0b" },
        { name: "High Risk", value: 0, color: "#ef4444" }
      ];
    }

    return [
      { name: "Low Risk", value: Math.round((riskCounts.low / total) * 100), color: "#10b981" },
      { name: "Medium Risk", value: Math.round((riskCounts.medium / total) * 100), color: "#f59e0b" },
      { name: "High Risk", value: Math.round((riskCounts.high / total) * 100), color: "#ef4444" }
    ];
  };

  const riskDistribution = generateRiskDistribution();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vault data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DefiBrain Vaults</h1>
          <p className="text-muted-foreground mt-2">
            Yield smarter with DefiBrain - Automate yields based on user defined criteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Set Criteria
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Auto-Optimize
          </Button>
        </div>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Managed Assets</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${autoManagedAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className={`text-xs ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Optimized Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${aiOptimizedYield.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-green-600">
              vs ${(aiOptimizedYield * 0.6).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData?.positions?.length || 1}</div>
            <p className="text-xs text-blue-600">
              24/7 automated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Auto-APY</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAutoAPY.toFixed(1)}%</div>
            <p className="text-xs text-purple-600">
              AI-enhanced
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vault Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>Your vault performance over time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={totalReturn >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {totalReturn >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}% Total Return
                </Badge>
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  6M
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vaultPerformanceData}>
                  <defs>
                    <linearGradient id="vaultGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(139, 92, 246)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(139, 92, 246)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm">
                              Value: <span className="font-bold">${data.value.toLocaleString()}</span>
                            </p>
                            {data.change !== 0 && (
                              <p className={`text-sm flex items-center ${
                                data.change > 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {data.change > 0 ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {data.change > 0 ? "+" : ""}{data.change}%
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(139, 92, 246)"
                    strokeWidth={3}
                    fill="url(#vaultGradient)"
                    dot={{ fill: "rgb(139, 92, 246)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "rgb(139, 92, 246)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Your portfolio risk allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {riskDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Vaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Vaults</CardTitle>
              <CardDescription>Discover and invest in yield-generating vaults</CardDescription>
            </div>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Strategies</TabsTrigger>
                <TabsTrigger value="auto-active">Auto-Active</TabsTrigger>
                <TabsTrigger value="ai-optimized">AI-Optimized</TabsTrigger>
                <TabsTrigger value="smart-yield">Smart Yield</TabsTrigger>
                <TabsTrigger value="stable-auto">Stable Auto</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dynamicVaults.map((vault) => (
              <div key={vault.id} className="border rounded-lg p-6 hover:bg-accent/50 transition-colors border-l-4 border-l-purple-500">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{vault.name}</h3>
                        <p className="text-sm text-muted-foreground">{vault.description}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md">
                      <p className="text-xs font-medium text-purple-700">🤖 {vault.automation}</p>
                      <p className="text-xs text-purple-600">📋 {vault.criteria}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Auto-APY</p>
                        <p className="font-semibold text-green-600">{vault.apy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="font-semibold">{vault.tvl}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Your Position</p>
                        <p className="font-semibold">{vault.yourDeposit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{vault.lockPeriod}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className={getRiskColor(vault.risk)}>
                        {vault.risk} Risk
                      </Badge>
                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                        {vault.protocol}
                      </Badge>
                      <Badge variant={vault.status.includes("Auto") ? "default" : "secondary"} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        {vault.status.includes("Auto") ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {vault.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-6">
                    {vault.status.includes("Auto") ? (
                      <>
                        <Button size="sm" className="border-purple-200 hover:bg-purple-50">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Funds
                        </Button>
                        <Button variant="outline" size="sm" className="border-purple-200 hover:bg-purple-50">
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Withdraw
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                        <Zap className="h-4 w-4 mr-2" />
                        Auto-Invest
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="hover:bg-purple-50">
                      <Info className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}