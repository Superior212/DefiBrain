"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionModal } from '@/components/web3/TransactionModal';
import { usePortfolio } from '@/hooks/usePortfolio';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function TransactionTest() {
  const { portfolioData } = usePortfolio();
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Test</CardTitle>
          <CardDescription>Please connect your wallet to test transactions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vault Transactions</CardTitle>
          <CardDescription>Test deposit and withdrawal functionality using modal dialogs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <TransactionModal action="deposit">
              <Button className="flex-1" size="lg">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Deposit to Vault
              </Button>
            </TransactionModal>
            
            <TransactionModal action="withdraw">
              <Button variant="outline" className="flex-1" size="lg">
                <ArrowDownRight className="h-4 w-4 mr-2" />
                Withdraw from Vault
              </Button>
            </TransactionModal>
          </div>
        </CardContent>
      </Card>

      {portfolioData && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                <div className="font-medium">${portfolioData.totalValue}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Deposited:</span>
                <div className="font-medium">${portfolioData.totalDeposited}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Yield:</span>
                <div className="font-medium">${portfolioData.totalYield}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Vault Shares:</span>
                <div className="font-medium">{portfolioData.vaultShares}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}