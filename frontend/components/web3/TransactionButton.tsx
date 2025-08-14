"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/hooks/useContract';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionButtonProps {
  action: 'deposit' | 'withdraw' | 'swap';
  amount?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function TransactionButton({
  action,
  amount = '0',
  disabled = false,
  className,
  children,
}: TransactionButtonProps) {
  const { authenticated } = usePrivy();
  const { isLoading, depositToVault, withdrawFromVault } = useContract();
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const handleTransaction = async () => {
    if (!authenticated || !amount || parseFloat(amount) <= 0) {
      toast.error('Please connect wallet and enter valid amount');
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
        
        // Reset status after 3 seconds
        setTimeout(() => setTxStatus('idle'), 3000);
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
            Failed
          </>
        );
      default:
        return children;
    }
  };

  return (
    <Button
      onClick={handleTransaction}
      disabled={disabled || isLoading || txStatus === 'pending' || !authenticated}
      className={className}
      variant={txStatus === 'success' ? 'default' : txStatus === 'error' ? 'destructive' : 'default'}
    >
      {getButtonContent()}
    </Button>
  );
}