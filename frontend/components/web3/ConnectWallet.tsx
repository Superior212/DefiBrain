"use client";

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, User, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ConnectWalletProps {
  variant?: 'default' | 'compact' | 'full';
  className?: string;
}

export function ConnectWallet({ variant = 'default', className }: ConnectWalletProps) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Loading state
  if (!ready) {
    return (
      <Button disabled className={className}>
        <Wallet className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  // Compact variant for header
  if (variant === 'compact') {
    if (!authenticated) {
      return (
        <Button onClick={login} className={className}>
          <Wallet className="mr-2 h-4 w-4" />
          Connect
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="cursor-pointer" onClick={copyAddress}>
          <Wallet className="mr-1 h-3 w-3" />
          {user?.wallet?.address ? formatAddress(user.wallet.address) : 'Connected'}
          {copied ? <span className="ml-1 text-xs">✓</span> : <Copy className="ml-1 h-3 w-3" />}
        </Badge>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full variant for landing page
  if (variant === 'full') {
    if (!authenticated) {
      return (
        <Card className={className}>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wallet className="h-6 w-6" />
              Connect Your Wallet
            </CardTitle>
            <CardDescription>
              Connect your wallet to start using DefiBrain's AI-powered DeFi strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={login} className="w-full" size="lg">
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Supports MetaMask, WalletConnect, Coinbase Wallet, and more
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-xs text-muted-foreground">
                {user?.wallet?.address ? formatAddress(user.wallet.address) : 'N/A'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                {copied ? '✓' : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://explorer.mantle.xyz/address/${user?.wallet?.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  if (!authenticated) {
    return (
      <Button onClick={login} className={className}>
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={logout} className={className}>
      <User className="mr-2 h-4 w-4" />
      {user?.wallet?.address ? formatAddress(user.wallet.address) : 'Connected'}
    </Button>
  );
}