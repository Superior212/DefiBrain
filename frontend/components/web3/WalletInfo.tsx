"use client";

import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useActiveWallet } from 'thirdweb/react';

interface WalletInfoProps {
  className?: string;
}

export function WalletInfo({ className }: WalletInfoProps) {
  const { authenticated, user } = usePrivy();
  const wallet = useActiveWallet();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBalance = async () => {
    if (!wallet || !user?.wallet?.address) return;
    
    setIsLoading(true);
    try {
      // Mock balance for now - replace with actual balance fetching
      setBalance('1.2345');
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && wallet) {
      fetchBalance();
    }
  }, [authenticated, wallet, user?.wallet?.address]);

  const copyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (!authenticated || !user?.wallet?.address) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Details
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBalance}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Your connected wallet information and balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Wallet Address</p>
            <p className="text-sm text-muted-foreground font-mono">
              {formatAddress(user.wallet.address)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              {copied ? (
                <span className="text-green-600">✓</span>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`https://explorer.mantle.xyz/address/${user.wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium mb-1">MNT Balance</p>
            <p className="text-lg font-bold">
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                `${parseFloat(balance).toFixed(4)} MNT`
              )}
            </p>
          </div>
          <Badge variant="secondary">
            Mantle Network
          </Badge>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium mb-1">Network</p>
            <p className="text-sm text-muted-foreground">Mantle Mainnet</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">Connected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}