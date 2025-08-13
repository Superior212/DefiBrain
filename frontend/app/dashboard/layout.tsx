"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  BarChart3,
  Shield,
  GraduationCap,
  Zap,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Brain,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const carouselSlides = [
  {
    title: "Yield smarter with",
    subtitle: "DefiBrain",
    description: "Automate yields based on user defined criteria.",
    gradient: "from-purple-600 via-blue-600 to-cyan-500",
    icon: Brain,
  },
  {
    title: "Smart Portfolio",
    subtitle: "DefiBrain",
    description: "AI-powered portfolio optimization and risk management.",
    gradient: "from-purple-600 via-blue-600 to-cyan-500",
    icon: Shield,
  },
  {
    title: "Market Intelligence",
    subtitle: "DefiBrain",
    description: "Advanced market analysis and predictive insights.",
    gradient: "from-purple-600 via-blue-600 to-cyan-500",
    icon: TrendingUp,
  },
  {
    title: "Auto Strategies",
    subtitle: "DefiBrain",
    description: "Automated DeFi strategies that work 24/7 for you.",
    gradient: "from-purple-600 via-blue-600 to-cyan-500",
    icon: Target,
  },
];

function BrainAICarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const currentSlideData = carouselSlides[currentSlide];
  const IconComponent = currentSlideData.icon;

  return (
    <div className="relative h-60 my-14">
      <div
        className={`bg-gradient-to-br ${currentSlideData.gradient} rounded-2xl p-4 relative overflow-hidden h-full flex flex-col justify-between`}>
        {/* AI Icon */}
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
            <IconComponent className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-white text-center flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-1">
            {currentSlideData.title}
          </h3>
          <h2 className="text-xl font-bold mb-2">
            {currentSlideData.subtitle}
          </h2>
          <p className="text-sm text-gray-200 leading-relaxed">
            {currentSlideData.description}
          </p>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center space-x-2">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const navigation = [
  {
    name: "Overview",
    href: "/dashboard/overview",
    icon: Package,
  },
  {
    name: "Portfolio",
    href: "/dashboard/portfolio",
    icon: BarChart3,
  },
  {
    name: "Vaults",
    href: "/dashboard/vaults",
    icon: Shield,
  },
  {
    name: "Education",
    href: "/dashboard/education",
    icon: GraduationCap,
  },
  {
    name: "DefiBrain AI",
    href: "/dashboard/ai",
    icon: Zap,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              Def<span className="text-green-500 font-bold">I</span>Brain
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground hover:bg-muted"
            onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.name === "Vaults" && pathname === "/dashboard");
            const isAI = item.name === "ZeroPulse AI";

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6",
                    isAI && "bg-primary rounded-full p-1"
                  )}>
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isAI && "text-primary-foreground h-4 w-4"
                    )}
                  />
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 flex-shrink-0">
          <BrainAICarousel />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-background border-b h-16 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search strategies, protocols..."
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
