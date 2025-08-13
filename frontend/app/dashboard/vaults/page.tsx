"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Mock data for DefiBrain automated vaults
const vaults = [
  {
    id: 1,
    name: "Smart ETH Optimizer",
    protocol: "DefiBrain AI",
    apy: "7.8%",
    tvl: "$24.7M",
    yourDeposit: "$5,420",
    risk: "Low",
    status: "Auto-Active",
    lockPeriod: "Flexible",
    description: "AI-powered ETH yield optimization across multiple protocols with automatic rebalancing",
    automation: "Real-time protocol switching",
    criteria: "Maximize yield, minimize gas"
  },
  {
    id: 2,
    name: "Stable Yield Maximizer",
    protocol: "DefiBrain Core",
    apy: "5.2%",
    tvl: "$18.3M",
    yourDeposit: "$2,100",
    risk: "Very Low",
    status: "Auto-Active",
    lockPeriod: "None",
    description: "Automated stablecoin yield farming with dynamic protocol allocation",
    automation: "24/7 yield monitoring",
    criteria: "Stable returns, low volatility"
  },
  {
    id: 3,
    name: "BTC Alpha Strategy",
    protocol: "DefiBrain Pro",
    apy: "9.4%",
    tvl: "$31.8M",
    yourDeposit: "$0",
    risk: "Medium",
    status: "Available",
    lockPeriod: "Auto-optimized",
    description: "Advanced BTC yield strategies with ML-driven market timing and automated position management",
    automation: "Predictive rebalancing",
    criteria: "High yield, market adaptive"
  },
  {
    id: 4,
    name: "DeFi Pulse Index",
    protocol: "DefiBrain Ecosystem",
    apy: "11.7%",
    tvl: "$42.1M",
    yourDeposit: "$1,800",
    risk: "Medium-High",
    status: "Auto-Active",
    lockPeriod: "Smart duration",
    description: "Diversified DeFi exposure with automated yield harvesting and intelligent risk management",
    automation: "Multi-protocol arbitrage",
    criteria: "Diversified growth, auto-compound"
  }
];

const vaultPerformance = [
  { month: "Jan", value: 9320, change: 0 },
  { month: "Feb", value: 9628, change: 3.3 },
  { month: "Mar", value: 10156, change: 5.5 },
  { month: "Apr", value: 9847, change: -3.0 },
  { month: "May", value: 10523, change: 6.9 },
  { month: "Jun", value: 11247, change: 6.9 },
];

const riskDistribution = [
  { name: "Low Risk", value: 45, color: "#10b981" },
  { name: "Medium Risk", value: 35, color: "#f59e0b" },
  { name: "High Risk", value: 20, color: "#ef4444" }
];

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
            <div className="text-2xl font-bold">$9,320</div>
            <p className="text-xs text-green-600">
              +12.3% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Optimized Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$2,847</div>
            <p className="text-xs text-green-600">
              vs $1,247 manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
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
            <div className="text-2xl font-bold">8.5%</div>
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
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +20.7% Total Return
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
                <AreaChart data={vaultPerformance}>
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
            {vaults.map((vault) => (
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