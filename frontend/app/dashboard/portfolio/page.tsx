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
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";

const strategies = [
  {
    id: 1,
    name: "Conservative USDC",
    protocol: "Aave",
    amount: "$8,450",
    apy: "8.5%",
    earned: "+$1,250",
    risk: "Low",
    color: "bg-green-500/20",
    icon: Target
  },
  {
    id: 2,
    name: "Balanced Multi-Protocol",
    protocol: "Compound + Uniswap",
    amount: "$6,250",
    apy: "15.2%",
    earned: "+$1,890",
    risk: "Medium",
    color: "bg-purple-500/20",
    icon: Target
  },
  {
    id: 3,
    name: "High Yield BTC",
    protocol: "Merchant Moe",
    amount: "$4,200",
    apy: "22.8%",
    earned: "+$2,150",
    risk: "High",
    color: "bg-orange-500/20",
    icon: Target
  }
];

const transactions = [
  {
    id: 1,
    type: "deposit",
    action: "Deposit to Merchant Moe",
    amount: "+1,500 USDC",
    time: "2 hours ago",
    status: "Confirmed",
    icon: ArrowUpRight
  },
  {
    id: 2,
    type: "rebalance",
    action: "AI Strategy Rebalance",
    amount: "Multiple assets",
    time: "1 day ago",
    status: "Completed",
    icon: Zap
  },
  {
    id: 3,
    type: "withdraw",
    action: "Withdraw from FusionX",
    amount: "-800 USDC",
    time: "2 days ago",
    status: "Confirmed",
    icon: ArrowDownRight
  }
];

export default function PortfolioPage() {
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
                {strategies.map((strategy) => {
                  const Icon = strategy.icon;
                  return (
                    <div key={strategy.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${strategy.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium">{strategy.name}</h3>
                            <p className="text-sm text-muted-foreground">{strategy.protocol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-semibold">{strategy.apy}</p>
                          <p className="text-xs text-muted-foreground">APY</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{strategy.amount}</p>
                          <p className="text-xs text-muted-foreground">Deposited</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-medium">{strategy.earned}</p>
                          <p className="text-xs text-muted-foreground">Earned</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant={strategy.risk === "Low" ? "secondary" : strategy.risk === "Medium" ? "default" : "destructive"}>
                          {strategy.risk} Risk
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
                })}
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
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>USDC</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">45%</span>
                    <p className="text-sm text-muted-foreground">$10,080</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>ETH</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">35%</span>
                    <p className="text-sm text-muted-foreground">$7,840</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>BTC</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">20%</span>
                    <p className="text-sm text-muted-foreground">$4,480</p>
                  </div>
                </div>
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
              {transactions.map((transaction) => {
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
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}