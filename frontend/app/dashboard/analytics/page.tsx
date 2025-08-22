"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  PieChart,
  Brain
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from "recharts";
import Link from "next/link";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";

// Dynamic data is now fetched from useAnalytics hook

export default function AnalyticsPage() {
  const {
    performanceMetrics,
    performanceData,
    allocationData,
    yieldData,
    stats,
    isLoading,
    error,
    refreshData,
  } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-2">Error loading analytics data</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={refreshData} variant="outline">
              Try Again
            </Button>
          </div>
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
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-1">Detailed performance insights and metrics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Return</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReturn}</div>
              <div className={`flex items-center text-xs ${stats.totalReturnPercentage.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.totalReturnPercentage} all time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sharpeRatio}</div>
              <p className="text-xs text-muted-foreground">
                Risk-adjusted returns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.winRate}</div>
              <p className="text-xs text-muted-foreground">
                Profitable strategies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.maxDrawdown.startsWith('0') ? '0.0%' : `-${stats.maxDrawdown}`}</div>
              <p className="text-xs text-muted-foreground">
                Largest loss period
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Portfolio Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Portfolio Performance
              </CardTitle>
              <CardDescription>
                Your portfolio growth over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Asset Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Asset Allocation
              </CardTitle>
              <CardDescription>
                Distribution across different assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {allocationData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Strategy Yield Comparison */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Strategy Yield Comparison</CardTitle>
              <CardDescription>
                Performance comparison across different risk levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="conservative" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Conservative"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balanced" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Balanced"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aggressive" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      name="Aggressive"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Conservative</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Balanced</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Aggressive</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis & AI Insights */}
          <div className="space-y-6">
            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Smart Contract Risk</span>
                    <span className="text-sm font-medium text-green-600">Low</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Liquidity Risk</span>
                    <span className="text-sm font-medium text-yellow-600">Medium</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Market Risk</span>
                    <span className="text-sm font-medium text-red-600">High</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-sm font-medium text-purple-900 mb-1">Optimization Suggestion</div>
                  <div className="text-xs text-purple-700">
                    Consider rebalancing to Merchant Moe for 2.3% APY increase
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-900 mb-1">Market Alert</div>
                  <div className="text-xs text-yellow-700">
                    High volatility expected in next 24h due to Fed announcement
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-sm font-medium text-green-900 mb-1">Opportunity</div>
                  <div className="text-xs text-green-700">
                    New liquidity mining program on Agni Finance detected
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}