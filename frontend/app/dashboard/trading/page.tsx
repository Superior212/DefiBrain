"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Target,
  AlertTriangle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

// Mock data for trading
const tradingPairs = [
  {
    pair: "ETH/USDC",
    price: "$2,847.32",
    change: "+2.45%",
    volume: "$12.4M",
    isPositive: true
  },
  {
    pair: "BTC/USDC",
    price: "$43,521.18",
    change: "-1.23%",
    volume: "$8.7M",
    isPositive: false
  },
  {
    pair: "ARB/USDC",
    price: "$1.24",
    change: "+5.67%",
    volume: "$3.2M",
    isPositive: true
  },
  {
    pair: "USDC/DAI",
    price: "$1.0002",
    change: "+0.01%",
    volume: "$15.8M",
    isPositive: true
  }
];

const recentTrades = [
  {
    id: 1,
    pair: "ETH/USDC",
    type: "Buy",
    amount: "0.5 ETH",
    price: "$2,845.00",
    total: "$1,422.50",
    time: "2 min ago",
    status: "Completed"
  },
  {
    id: 2,
    pair: "BTC/USDC",
    type: "Sell",
    amount: "0.1 BTC",
    price: "$43,600.00",
    total: "$4,360.00",
    time: "15 min ago",
    status: "Completed"
  },
  {
    id: 3,
    pair: "ARB/USDC",
    type: "Buy",
    amount: "1000 ARB",
    price: "$1.23",
    total: "$1,230.00",
    time: "1 hour ago",
    status: "Pending"
  }
];

const priceData = [
  { time: "09:00", price: 2820 },
  { time: "10:00", price: 2835 },
  { time: "11:00", price: 2828 },
  { time: "12:00", price: 2842 },
  { time: "13:00", price: 2847 },
  { time: "14:00", price: 2851 },
];

const openOrders = [
  {
    id: 1,
    pair: "ETH/USDC",
    type: "Limit Buy",
    amount: "1.0 ETH",
    price: "$2,800.00",
    filled: "0%",
    status: "Open"
  },
  {
    id: 2,
    pair: "BTC/USDC",
    type: "Limit Sell",
    amount: "0.2 BTC",
    price: "$44,000.00",
    filled: "25%",
    status: "Partial"
  }
];

export default function TradingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading</h1>
          <p className="text-muted-foreground mt-2">
            Trade cryptocurrencies with advanced DeFi protocols
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Advanced View
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Quick Trade
          </Button>
        </div>
      </div>

      {/* Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$42.3M</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pairs</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +2 new pairs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+$1,247</div>
            <p className="text-xs text-muted-foreground">
              +8.3% this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              1 partially filled
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ETH/USDC</CardTitle>
                  <CardDescription>Real-time price chart</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">24h</Badge>
                  <span className="text-2xl font-bold">$2,847.32</span>
                  <span className="text-green-600 flex items-center">
                    <ArrowUpRight className="h-4 w-4" />
                    +2.45%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trading Pairs */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Pairs</CardTitle>
              <CardDescription>Available trading pairs and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tradingPairs.map((pair, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="font-semibold">{pair.pair}</div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-medium">{pair.price}</div>
                        <div className="text-sm text-muted-foreground">Price</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium flex items-center ${
                          pair.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {pair.isPositive ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          )}
                          {pair.change}
                        </div>
                        <div className="text-sm text-muted-foreground">24h Change</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{pair.volume}</div>
                        <div className="text-sm text-muted-foreground">Volume</div>
                      </div>
                      <Button size="sm">
                        Trade
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Order Form */}
          <Card>
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
                <TabsContent value="buy" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy-amount">Amount (ETH)</Label>
                    <Input id="buy-amount" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buy-price">Price (USDC)</Label>
                    <Input id="buy-price" placeholder="2,847.32" />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Market" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop Loss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total:</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      Buy ETH
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="sell" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sell-amount">Amount (ETH)</Label>
                    <Input id="sell-amount" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sell-price">Price (USDC)</Label>
                    <Input id="sell-price" placeholder="2,847.32" />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Market" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                        <SelectItem value="stop">Stop Loss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total:</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700">
                      Sell ETH
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Open Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Open Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openOrders.map((order) => (
                  <div key={order.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{order.pair}</span>
                      <Badge variant={order.status === "Open" ? "secondary" : "default"}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.type} • {order.amount}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price: {order.price}</span>
                      <span>Filled: {order.filled}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Cancel Order
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Your trading history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    trade.type === "Buy" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}>
                    {trade.type === "Buy" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{trade.pair}</div>
                    <div className="text-sm text-muted-foreground">{trade.type} • {trade.amount}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="font-medium">{trade.price}</div>
                    <div className="text-sm text-muted-foreground">Price</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{trade.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{trade.time}</div>
                    <Badge variant={trade.status === "Completed" ? "secondary" : "default"}>
                      {trade.status}
                    </Badge>
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