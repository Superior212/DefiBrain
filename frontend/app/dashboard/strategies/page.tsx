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

// Mock data for strategies
const activeStrategies = [
  {
    id: 1,
    name: "USDC Yield Optimizer",
    protocol: "Merchant Moe",
    apy: "12.5%",
    tvl: "$2.4M",
    risk: "Low",
    status: "Active",
    allocation: "$5,200",
    performance: "+8.2%"
  },
  {
    id: 2,
    name: "ETH Liquidity Mining",
    protocol: "Agni Finance",
    apy: "18.7%",
    tvl: "$1.8M",
    risk: "Medium",
    status: "Active",
    allocation: "$3,800",
    performance: "+15.3%"
  },
  {
    id: 3,
    name: "BTC Lending Strategy",
    protocol: "FusionX",
    apy: "15.2%",
    tvl: "$3.1M",
    risk: "Low",
    status: "Active",
    allocation: "$7,500",
    performance: "+11.8%"
  }
];

const availableStrategies = [
  {
    name: "Arbitrum Yield Farm",
    protocol: "Camelot",
    apy: "22.4%",
    tvl: "$890K",
    risk: "High",
    minDeposit: "$100",
    lockPeriod: "30 days"
  },
  {
    name: "Stablecoin Arbitrage",
    protocol: "Curve",
    apy: "8.9%",
    tvl: "$12.5M",
    risk: "Low",
    minDeposit: "$50",
    lockPeriod: "None"
  },
  {
    name: "Delta Neutral Strategy",
    protocol: "GMX",
    apy: "16.8%",
    tvl: "$4.2M",
    risk: "Medium",
    minDeposit: "$500",
    lockPeriod: "14 days"
  }
];

const performanceData = [
  { name: "Jan", value: 100 },
  { name: "Feb", value: 108 },
  { name: "Mar", value: 112 },
  { name: "Apr", value: 118 },
  { name: "May", value: 125 },
  { name: "Jun", value: 132 }
];

const riskMetrics = [
  { name: "Low Risk", value: 45, color: "#10b981" },
  { name: "Medium Risk", value: 35, color: "#f59e0b" },
  { name: "High Risk", value: 20, color: "#ef4444" }
];

export default function StrategiesPage() {
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
            <div className="text-2xl font-bold">3</div>
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
            <div className="text-2xl font-bold">$16,500</div>
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
            <div className="text-2xl font-bold">15.5%</div>
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
            <div className="text-2xl font-bold">$1,847</div>
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