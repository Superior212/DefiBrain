"use client";

import { useState } from "react";
import { useAI } from "@/hooks/useAI";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";



const getInsightIcon = (type: string) => {
  switch (type) {
    case "opportunity":
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    case "risk":
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case "optimization":
      return <Lightbulb className="h-5 w-5 text-blue-600" />;
    default:
      return <Brain className="h-5 w-5" />;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case "opportunity":
      return "border-green-200 bg-green-50";
    case "risk":
      return "border-red-200 bg-red-50";
    case "optimization":
      return "border-blue-200 bg-blue-50";
    default:
      return "border-gray-200 bg-gray-50";
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return "text-green-600";
  if (confidence >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getConfidenceBg = (confidence: number) => {
  if (confidence >= 80) return "bg-green-100";
  if (confidence >= 60) return "bg-yellow-100";
  return "bg-red-100";
};

export default function DefiBrainAIPage() {
  const [message, setMessage] = useState("");
  const { insights, chatHistory, confidenceMetrics, stats, isLoading: aiLoading, error, sendMessage, isTyping } = useAI();

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const messageToSend = message;
    setMessage(""); // Clear input immediately
    sendMessage(messageToSend);
  };

  if (aiLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Error loading AI data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Zap className="h-8 w-8 text-primary mr-3" />
            DefiBrain AI
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
            <div className="text-2xl font-bold">{stats.aiConfidence}%</div>
            <p className="text-xs text-muted-foreground">{stats.aiConfidence >= 80 ? 'High accuracy' : stats.aiConfidence >= 60 ? 'Medium accuracy' : 'Low accuracy'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Insights Generated
            </CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInsights}</div>
            <p className="text-xs text-muted-foreground">+{Math.floor(stats.activeInsights * 0.25)} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profit Optimized
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.portfolioScore}/100</div>
            <p className="text-xs text-muted-foreground">
              Through AI recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Risk Prevented
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.riskLevel}</div>
            <p className="text-xs text-muted-foreground">
              Current risk level
            </p>
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
            <CardDescription>
              Ask questions about DeFi strategies, risks, and opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[400px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex ${
                      chat.type === "user" ? "justify-end" : "justify-start"
                    }`}>
                    <div
                      className={`flex items-start space-x-2 max-w-[80%] ${
                        chat.type === "user"
                          ? "flex-row-reverse space-x-reverse"
                          : ""
                      }`}>
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
                          chat.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                        <p className="text-sm">{chat.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {chat.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
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
                            style={{ animationDelay: "0.1s" }}></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}></div>
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
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isTyping || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Confidence Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>AI Confidence Dashboard</CardTitle>
            <CardDescription>
              Real-time confidence metrics across all AI models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Confidence Gauge */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32">
                {/* Circular Progress Background */}
                <svg
                  className="w-32 h-32 transform -rotate-90"
                  viewBox="0 0 120 120">
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
                    strokeDasharray={`${
                      (confidenceMetrics.current / 100) * 314
                    } 314`}
                    style={{
                      transition: "stroke-dasharray 0.5s ease-in-out",
                    }}
                  />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-2xl font-bold ${getConfidenceColor(
                      confidenceMetrics.current
                    )}`}>
                    {confidenceMetrics.current}%
                  </span>
                  <span className="text-xs text-muted-foreground">Overall</span>
                </div>
              </div>

              {/* Trend Indicator */}
              <div className="flex items-center space-x-2">
                {confidenceMetrics.trend === "up" && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                {confidenceMetrics.trend === "down" && (
                  <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                )}
                {confidenceMetrics.trend === "stable" && (
                  <div className="h-4 w-4 border-2 border-gray-400 rounded-full" />
                )}
                <span className="text-sm text-muted-foreground capitalize">
                  {confidenceMetrics.trend} trend
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Confidence by Category</h4>
              {confidenceMetrics.categories.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{category.name}</span>
                    <span className={`text-sm font-medium ${category.color}`}>
                      {category.confidence}%
                    </span>
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
            <div
              className={`rounded-lg p-3 ${getConfidenceBg(
                confidenceMetrics.current
              )}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Status</span>
                <Badge
                  variant={
                    confidenceMetrics.current >= 80 ? "default" : "secondary"
                  }>
                  {confidenceMetrics.current >= 80
                    ? "High Confidence"
                    : confidenceMetrics.current >= 60
                    ? "Moderate"
                    : "Low Confidence"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {confidenceMetrics.lastUpdated}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Insights & Recommendations</CardTitle>
          <CardDescription>
            Personalized insights based on your portfolio and market conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight: { id: number; type: string; title: string; description: string; confidence: number; impact: string; timeframe: string; action: string }) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-6 ${getInsightColor(
                  insight.type
                )}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="p-2 rounded-lg bg-white">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {insight.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Confidence
                          </p>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${insight.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Impact
                          </p>
                          <Badge
                            variant={
                              insight.impact === "High"
                                ? "destructive"
                                : insight.impact === "Medium"
                                ? "default"
                                : "secondary"
                            }>
                            {insight.impact}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Timeframe
                          </p>
                          <p className="font-medium">{insight.timeframe}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Action
                          </p>
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
  );
}
