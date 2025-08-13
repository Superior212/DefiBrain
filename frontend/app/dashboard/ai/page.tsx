"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Zap,
  Brain,
  MessageSquare,
  TrendingUp,
  Target,
  Shield,
  AlertTriangle,
  Lightbulb,
  Send,
  Sparkles,
  BarChart3,
  DollarSign,
  Clock,
  Bot,
  User,
} from "lucide-react"

// Mock data for AI insights
const aiInsights = [
  {
    id: 1,
    type: "opportunity",
    title: "High Yield Opportunity Detected",
    description:
      "AAVE lending rates for USDC have increased to 4.2%. Consider moving funds from lower-yield positions.",
    confidence: 92,
    impact: "High",
    timeframe: "24 hours",
    action: "Rebalance Portfolio",
  },
  {
    id: 2,
    type: "risk",
    title: "Smart Contract Risk Alert",
    description: "Unusual activity detected in one of your vault protocols. Consider reducing exposure.",
    confidence: 78,
    impact: "Medium",
    timeframe: "Immediate",
    action: "Review Position",
  },
  {
    id: 3,
    type: "optimization",
    title: "Gas Fee Optimization",
    description: "Network congestion is low. Optimal time for pending transactions and rebalancing.",
    confidence: 95,
    impact: "Low",
    timeframe: "2 hours",
    action: "Execute Transactions",
  },
]

const chatHistory = [
  {
    id: 1,
    type: "user",
    message: "What's the best strategy for my current portfolio?",
    timestamp: "2 minutes ago",
  },
  {
    id: 2,
    type: "ai",
    message:
      "Based on your current portfolio allocation and risk profile, I recommend diversifying into stable yield farming strategies. Your current exposure to high-risk DeFi protocols is 65%, which is above your stated risk tolerance of 50%. Consider moving 15% to stable USDC lending on Aave or Compound.",
    timestamp: "2 minutes ago",
  },
  {
    id: 3,
    type: "user",
    message: "How do I reduce impermanent loss risk?",
    timestamp: "5 minutes ago",
  },
  {
    id: 4,
    type: "ai",
    message:
      "To reduce impermanent loss risk: 1) Choose pairs with correlated assets (like stablecoin pairs), 2) Consider single-asset staking instead of LP tokens, 3) Use protocols with impermanent loss protection, 4) Monitor price divergence closely and exit positions when necessary.",
    timestamp: "5 minutes ago",
  },
]

const confidenceMetrics = {
  current: 85,
  trend: "stable", // "up", "down", "stable"
  categories: [
    { name: "Market Analysis", confidence: 92, color: "text-green-600" },
    { name: "Risk Assessment", confidence: 78, color: "text-yellow-600" },
    { name: "Portfolio Health", confidence: 89, color: "text-blue-600" },
    { name: "Yield Predictions", confidence: 81, color: "text-purple-600" },
  ],
  lastUpdated: "2 minutes ago",
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case "opportunity":
      return <TrendingUp className="h-5 w-5 text-green-600" />
    case "risk":
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    case "optimization":
      return <Lightbulb className="h-5 w-5 text-blue-600" />
    default:
      return <Brain className="h-5 w-5" />
  }
}

const getInsightColor = (type: string) => {
  switch (type) {
    case "opportunity":
      return "border-green-200 bg-green-50"
    case "risk":
      return "border-red-200 bg-red-50"
    case "optimization":
      return "border-blue-200 bg-blue-50"
    default:
      return "border-gray-200 bg-gray-50"
  }
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return "text-green-600"
  if (confidence >= 60) return "text-yellow-600"
  return "text-red-600"
}

const getConfidenceBg = (confidence: number) => {
  if (confidence >= 80) return "bg-green-100"
  if (confidence >= 60) return "bg-yellow-100"
  return "bg-red-100"
}

export default function ZeroPulseAIPage() {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = () => {
    if (!message.trim()) return
    setIsLoading(true)
    // Simulate AI response
    setTimeout(() => {
      setIsLoading(false)
      setMessage("")
    }, 2000)
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Zap className="h-8 w-8 text-primary mr-3" />
              ZeroPulse AI
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered insights and recommendations for your DeFi portfolio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* AI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">High accuracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insights Generated</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+6 this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Optimized</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+$2,847</div>
              <p className="text-xs text-muted-foreground">Through AI recommendations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Prevented</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">$1,234</div>
              <p className="text-xs text-muted-foreground">Potential losses avoided</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Chat Interface */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                AI Assistant
              </CardTitle>
              <CardDescription>Ask questions about DeFi strategies, risks, and opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[400px] overflow-y-auto pr-4">
                <div className="space-y-4">
                  {chatHistory.map((chat) => (
                    <div key={chat.id} className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`flex items-start space-x-2 max-w-[80%] ${
                          chat.type === "user" ? "flex-row-reverse space-x-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          {chat.type === "user" ? (
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div
                          className={`rounded-lg p-3 ${
                            chat.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{chat.message}</p>
                          <p className="text-xs opacity-70 mt-1">{chat.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2 max-w-[80%]">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg p-3 bg-muted">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Ask about DeFi strategies, risks, or opportunities..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Confidence Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>AI Confidence Dashboard</CardTitle>
              <CardDescription>Real-time confidence metrics across all AI models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Confidence Gauge */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32">
                  {/* Circular Progress Background */}
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className={getConfidenceColor(confidenceMetrics.current)}
                      strokeDasharray={`${(confidenceMetrics.current / 100) * 314} 314`}
                      style={{
                        transition: "stroke-dasharray 0.5s ease-in-out",
                      }}
                    />
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${getConfidenceColor(confidenceMetrics.current)}`}>
                      {confidenceMetrics.current}%
                    </span>
                    <span className="text-xs text-muted-foreground">Overall</span>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className="flex items-center space-x-2">
                  {confidenceMetrics.trend === "up" && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {confidenceMetrics.trend === "down" && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                  {confidenceMetrics.trend === "stable" && (
                    <div className="h-4 w-4 border-2 border-gray-400 rounded-full" />
                  )}
                  <span className="text-sm text-muted-foreground capitalize">{confidenceMetrics.trend} trend</span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Confidence by Category</h4>
                {confidenceMetrics.categories.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{category.name}</span>
                      <span className={`text-sm font-medium ${category.color}`}>{category.confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          category.confidence >= 80
                            ? "bg-green-500"
                            : category.confidence >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${category.confidence}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className={`rounded-lg p-3 ${getConfidenceBg(confidenceMetrics.current)}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={confidenceMetrics.current >= 80 ? "default" : "secondary"}>
                    {confidenceMetrics.current >= 80
                      ? "High Confidence"
                      : confidenceMetrics.current >= 60
                        ? "Moderate"
                        : "Low Confidence"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Last updated: {confidenceMetrics.lastUpdated}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>AI Insights & Recommendations</CardTitle>
            <CardDescription>Personalized insights based on your portfolio and market conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.map((insight) => (
                <div key={insight.id} className={`border rounded-lg p-6 ${getInsightColor(insight.type)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-white">{getInsightIcon(insight.type)}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{insight.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${insight.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{insight.confidence}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Impact</p>
                            <Badge
                              variant={
                                insight.impact === "High"
                                  ? "destructive"
                                  : insight.impact === "Medium"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {insight.impact}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Timeframe</p>
                            <p className="font-medium">{insight.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Action</p>
                            <p className="font-medium">{insight.action}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <Button size="sm">
                        <Target className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Remind Later
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
