"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Brain,
  Zap,
  BarChart3,
  Activity,
  ArrowUpRight,
  Sparkles,
  Plus,
  Shield,
  Clock,
  Users
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useStrategies } from "@/hooks/useStrategies";

// Dynamic data is now fetched from useStrategies hook

export default function StrategiesPage() {
  const {
    activeStrategies,
    availableStrategies,
    performanceData,
    riskMetrics,
    stats,
    isLoading,
    error,
    refreshData,
  } = useStrategies();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading strategies data...</p>
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
            <p className="text-destructive mb-2">Error loading strategies data</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategies</h1>
          <p className="text-muted-foreground mt-2">
            Discover and manage your DeFi yield strategies
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Strategy
        </Button>
      </div>

      {/* Strategy Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStrategies}</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeployed}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAPY}</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yield</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReturn}</div>
            <p className="text-xs text-muted-foreground">
              +18.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
            <CardDescription>
              Combined performance of all active strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>
              Allocation across risk levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskMetrics.map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm text-muted-foreground">{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Active Strategies</CardTitle>
          <CardDescription>
            Your currently deployed yield strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeStrategies.map((strategy) => (
              <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{strategy.name}</h3>
                    <p className="text-sm text-muted-foreground">{strategy.protocol}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium">{strategy.apy}</p>
                    <p className="text-xs text-muted-foreground">APY</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{strategy.allocation}</p>
                    <p className="text-xs text-muted-foreground">Allocated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">{strategy.performance}</p>
                    <p className="text-xs text-muted-foreground">Performance</p>
                  </div>
                  <Badge variant={strategy.risk === "Low" ? "secondary" : strategy.risk === "Medium" ? "default" : "destructive"}>
                    {strategy.risk} Risk
                  </Badge>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Available Strategies</CardTitle>
          <CardDescription>
            Discover new yield opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableStrategies.map((strategy, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{strategy.name}</h3>
                  <Badge variant={strategy.risk === "Low" ? "secondary" : strategy.risk === "Medium" ? "default" : "destructive"}>
                    {strategy.risk}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{strategy.protocol}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">APY</span>
                    <span className="text-sm font-medium text-green-600">{strategy.apy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">TVL</span>
                    <span className="text-sm font-medium">{strategy.tvl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Min Deposit</span>
                    <span className="text-sm font-medium">{strategy.minDeposit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Lock Period</span>
                    <span className="text-sm font-medium">{strategy.lockPeriod}</span>
                  </div>
                </div>
                <Button className="w-full">
                  Deploy Strategy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}