"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  Shield,
  Users,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  Sparkles,
  ChevronDown,
  Play,
  Award,
  Lock,
  Wallet,
  Eye
} from "lucide-react";

interface LandingPageProps {
  onEnterApp: () => void;
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Yield Optimization",
      description: "Let AI move your funds across vaults for better returns. No manual farming, no stress.",
      color: "text-purple-500"
    },
    {
      icon: Zap,
      title: "Built on Mantle Chain",
      description: "Super low gas fees (almost zero). Fast, transparent transactions.",
      color: "text-yellow-500"
    },
    {
      icon: Shield,
      title: "Trusted + Secure",
      description: "On-chain AI decisions you can verify. Audited smart contracts + open-source code.",
      color: "text-green-500"
    },
    {
      icon: Users,
      title: "Social Trading",
      description: "Follow top performers, share strategies, and learn from the DeFi community.",
      color: "text-blue-500"
    },
    {
      icon: Target,
      title: "Multi-Protocol",
      description: "Access the best yields across Mantle's leading DeFi protocols in one platform.",
      color: "text-orange-500"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Comprehensive dashboards with real-time performance tracking and insights.",
      color: "text-cyan-500"
    }
  ];

  const stats = [
    { label: "Total Value Locked", value: "$24.8M", change: "+127%" },
    { label: "Active Users", value: "12,450", change: "+89%" },
    { label: "Average APY", value: "18.5%", change: "+5.2%" },
    { label: "Protocols Integrated", value: "15+", change: "New" }
  ];



  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                DefiBrain
              </h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="hidden md:inline-flex">
                Features
              </Button>
              <Button variant="ghost" className="hidden md:inline-flex">
                About
              </Button>
              <Button variant="ghost" className="hidden md:inline-flex">
                Docs
              </Button>
              <Button onClick={onEnterApp}>
                <Wallet className="h-4 w-4 mr-2" />
                Launch App
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6">
              <Award className="h-3 w-3 mr-1" />
              #1 AI-Powered Yield Aggregator on Mantle
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Smarter DeFi Yields.
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent block">
                Powered by AI.
              </span>
              <span className="text-2xl md:text-4xl text-muted-foreground block mt-2">Built on Mantle Chain.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Let AI move your funds across protocols for better returns.
              <br />
              No manual farming, no stress.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" onClick={onEnterApp}>
                Explore App
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Play className="h-5 w-5 mr-2" />
                Learn More
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-xs text-green-500 font-medium">{stat.change}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Why Choose DefiBrain?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI-powered platform combines cutting-edge technology with user-friendly design 
              to deliver the best DeFi experience on Mantle Network.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="relative group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-background flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Target className="h-3 w-3 mr-1" />
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Get Started in 3 Simple Steps
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
              <p className="text-muted-foreground">
                Connect your Mantle-compatible wallet and deposit your assets to get started.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Choose AI Strategy</h3>
              <p className="text-muted-foreground">
                Select from our AI-optimized strategies or let our algorithm choose the best one for you.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Earn & Optimize</h3>
              <p className="text-muted-foreground">
                Sit back and watch your yields grow while our AI continuously optimizes your portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners & Advisors */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Award className="h-3 w-3 mr-1" />
              Partners & Advisors
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Backed by Industry Leaders
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Supported by leading experts and strategic partners in the DeFi ecosystem.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-6 text-primary">Strategic Partners</h3>
              <div className="space-y-4">
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Mantle Network</h4>
                  <p className="text-muted-foreground">Official ecosystem partner and infrastructure provider</p>
                </div>
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">DeFi Alliance</h4>
                  <p className="text-muted-foreground">Strategic ecosystem and research partner</p>
                </div>
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Chainlink Labs</h4>
                  <p className="text-muted-foreground">Oracle and data infrastructure partner</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-6 text-secondary">Advisory Board</h3>
              <div className="space-y-4">
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Dr. Emily Zhang</h4>
                  <p className="text-muted-foreground">AI Research Lead, Former Google DeepMind</p>
                </div>
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Marcus Chen</h4>
                  <p className="text-muted-foreground">DeFi Pioneer, Yield Protocol Founder</p>
                </div>
                <div className="p-6 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Sarah Williams</h4>
                  <p className="text-muted-foreground">Former Head of DeFi at Coinbase Ventures</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Start Earning Smarter DeFi Yields Today
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join the future of DeFi with AI-powered optimization on Mantle Chain.
              <br />
              No manual work. Just better returns.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" onClick={onEnterApp}>
                Explore App
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Globe className="h-5 w-5 mr-2" />
                Join Community
              </Button>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "Near-Zero Gas Fees",
                  description: "Built on Mantle Chain"
                },
                {
                   icon: <Eye className="h-6 w-6" />,
                   title: "Transparent AI",
                   description: "Verify all decisions on-chain"
                 },
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Audited & Open Source",
                  description: "Security you can trust"
                },
                {
                  icon: <CheckCircle className="h-6 w-6" />,
                  title: "No Lock-up Period",
                  description: "Withdraw anytime"
                }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">DefiBrain</span>
              </div>
              <p className="text-muted-foreground text-sm">
                AI-powered yield optimization for the Mantle ecosystem.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Strategies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Analytics</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 DefiBrain. All rights reserved. Built on Mantle Network.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}