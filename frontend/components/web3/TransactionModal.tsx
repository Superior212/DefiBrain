"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContract } from '@/hooks/useContract';
import { usePortfolio } from '@/hooks/usePortfolio';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, CheckCircle, XCircle, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionModalProps {
  action: 'deposit' | 'withdraw';
  children: React.ReactNode;
  className?: string;
}

export function TransactionModal({ action, children, className }: TransactionModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const { authenticated } = usePrivy();
  const { isLoading, depositToVault, withdrawFromVault } = useContract();
  const { portfolioData } = usePortfolio();

  const handleTransaction = async () => {
    if (!authenticated) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (action === 'withdraw' && portfolioData && parseFloat(amount) > parseFloat(portfolioData.totalDeposited)) {
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    setTxStatus('pending');
    
    try {
      let result;
      
      switch (action) {
        case 'deposit':
          result = await depositToVault(amount);
          break;
        case 'withdraw':
          result = await withdrawFromVault(amount);
          break;
        default:
          throw new Error('Unsupported action');
      }

      if (result.success) {
        setTxStatus('success');
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`, {
          description: `Transaction hash: ${result.txHash?.slice(0, 10)}...`,
        });
        
        // Reset form and close modal after success
        setTimeout(() => {
          setTxStatus('idle');
          setAmount('');
          setOpen(false);
        }, 2000);
      } else {
        setTxStatus('error');
        toast.error(`${action.charAt(0).toUpperCase() + action.slice(1)} failed`, {
          description: result.error || 'Transaction failed',
        });
        
        // Reset status after 3 seconds
        setTimeout(() => setTxStatus('idle'), 3000);
      }
    } catch (error: unknown) {
      setTxStatus('error');
      toast.error('Transaction failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      
      // Reset status after 3 seconds
      setTimeout(() => setTxStatus('idle'), 3000);
    }
  };

  const getButtonContent = () => {
    switch (txStatus) {
      case 'pending':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Success!
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Try Again
          </>
        );
      default:
        return (
          <>
            {action === 'deposit' ? (
              <ArrowUpRight className="h-4 w-4 mr-2" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-2" />
            )}
            {action === 'deposit' ? 'Deposit' : 'Withdraw'}
          </>
        );
    }
  };

  const maxAmount = action === 'withdraw' ? portfolioData?.totalDeposited || '0' : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className={className}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'deposit' ? (
              <>
                <ArrowUpRight className="h-5 w-5 text-green-600" />
                Deposit to Vault
              </>
            ) : (
              <>
                <ArrowDownRight className="h-5 w-5 text-red-600" />
                Withdraw from Vault
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'deposit'
              ? 'Deposit USDC to start earning yield through AI-optimized strategies.'
              : `Withdraw your deposited USDC. Available: $${maxAmount}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Amount (USDC)
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={txStatus === 'pending'}
                className="pr-20"
                min="0"
                max={maxAmount}
                step="0.01"
              />
              {action === 'withdraw' && maxAmount && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 px-2 text-xs"
                  onClick={() => setAmount(maxAmount)}
                  disabled={txStatus === 'pending'}
                >
                  MAX
                </Button>
              )}
            </div>
            {action === 'withdraw' && portfolioData && (
              <p className="text-sm text-muted-foreground">
                Available balance: ${portfolioData.totalDeposited}
              </p>
            )}
          </div>
          
          {portfolioData && action === 'deposit' && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-medium">${portfolioData.totalValue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Deposited:</span>
                <span className="font-medium">${portfolioData.totalDeposited}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Yield:</span>
                <span className="font-medium text-green-600">${portfolioData.totalYield}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={txStatus === 'pending'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransaction}
            disabled={
              !authenticated ||
              !amount ||
              parseFloat(amount) <= 0 ||
              isLoading ||
              txStatus === 'pending' ||
              (action === 'withdraw' && portfolioData ? parseFloat(amount) > parseFloat(portfolioData.totalDeposited) : false)
            }
            className="flex-1"
            variant={txStatus === 'success' ? 'default' : txStatus === 'error' ? 'destructive' : 'default'}
          >
            {getButtonContent()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}