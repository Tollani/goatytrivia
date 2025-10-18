import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Chain = 'solana' | 'base';

interface WalletContextType {
  walletAddress: string | null;
  chain: Chain | null;
  balance: number;
  credits: number;
  points: number;
  streak: number;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (newChain: Chain) => void;
  refreshBalance: () => Promise<void>;
  updateCredits: (newCredits: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<Chain>('solana');
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);

const truncateAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Allow optimistic UI updates after simulated purchases
const updateCredits = (newCredits: number) => {
  setCredits(newCredits);
};

  const refreshBalance = async () => {
    if (!walletAddress) return;
    // Ensure admin wallets have enough test credits (no-op for non-admins)
    await (supabase as any).rpc('admin_ensure_test_credits', {
      _wallet_address: walletAddress,
      _chain: (chain || 'base'),
      _threshold: 10,
      _target: 100,
    });

    // Fetch user profile via RPC to ensure RLS context within a single request
    const { data, error } = await supabase.rpc('get_wallet_profile', {
      _wallet_address: walletAddress,
    });

    if (error) return;

    const row: any = Array.isArray(data) ? data[0] : data;
    if (row) {
      setBalance(Number(row.balance ?? 0));
      setCredits(Number(row.credits ?? 0));
      setPoints(Number(row.points ?? 0));
      setStreak(Number(row.streak ?? 0));
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const connectWallet = async () => {
    try {
      if (chain === 'solana') {
        // Check if wallet is available (works on both desktop and mobile in-app browsers)
        if (window.solana) {
          try {
            const response = await window.solana.connect();
            const address = response.publicKey.toString();
            
            setWalletAddress(address);

            // Create or update user in database
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', address)
              .single();

            if (!existingUser) {
              await supabase.from('users').insert({
                wallet_address: address,
                chain: 'solana',
              });
            }

            // Set wallet session immediately after connecting
            await supabase.rpc('set_wallet_session', {
              wallet_addr: address
            });
            
            toast.success(`Connected to Solana: ${truncateAddress(address)}`);
            await refreshBalance();
            return;
          } catch (error) {
            console.error('Wallet connection error:', error);
          }
        }

        // If wallet not available, open the app
        if (isMobile()) {
          // On mobile, use deep link to open Phantom app
          const currentUrl = encodeURIComponent(window.location.href);
          const deepLink = `https://phantom.app/ul/browse/${currentUrl}?ref=${currentUrl}`;
          
          toast.info('Opening Phantom app...', {
            description: 'Please approve the connection in your wallet'
          });
          
          // Try to open the app
          window.location.href = deepLink;
          
          // Fallback to app store if app not installed
          setTimeout(() => {
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const storeUrl = isIOS 
              ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
              : 'https://play.google.com/store/apps/details?id=app.phantom';
            
            if (confirm('Phantom app not found. Would you like to install it?')) {
              window.location.href = storeUrl;
            }
          }, 2000);
        } else {
          // On desktop, prompt to install browser extension
          toast.error('Phantom wallet not found', {
            description: 'Please install the Phantom browser extension'
          });
          window.open('https://phantom.app/', '_blank');
        }
      } else {
        // Base (MetaMask) connection
        if (window.ethereum) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []);
            const address = accounts[0].toLowerCase(); // Normalize EVM addresses
            
            setWalletAddress(address);

            // Create or update user in database
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', address)
              .single();

            if (!existingUser) {
              await supabase.from('users').insert({
                wallet_address: address,
                chain: 'base',
              });
            }

            // Set wallet session immediately after connecting
            await supabase.rpc('set_wallet_session', {
              wallet_addr: address
            });
            
            toast.success(`Connected to Base: ${truncateAddress(address)}`);
            await refreshBalance();
            return;
          } catch (error) {
            console.error('Wallet connection error:', error);
          }
        }

        // If MetaMask not available
        if (isMobile()) {
          // On mobile, use MetaMask deep link
          const currentUrl = encodeURIComponent(window.location.href);
          const deepLink = `https://metamask.app.link/dapp/${window.location.host}`;
          
          toast.info('Opening MetaMask app...', {
            description: 'Please approve the connection in your wallet'
          });
          
          window.location.href = deepLink;
          
          setTimeout(() => {
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const storeUrl = isIOS
              ? 'https://apps.apple.com/app/metamask/id1438144202'
              : 'https://play.google.com/store/apps/details?id=io.metamask';
            
            if (confirm('MetaMask app not found. Would you like to install it?')) {
              window.location.href = storeUrl;
            }
          }, 2000);
        } else {
          toast.error('MetaMask not found', {
            description: 'Please install the MetaMask browser extension'
          });
          window.open('https://metamask.io/', '_blank');
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setBalance(0);
    setCredits(0);
    setPoints(0);
    setStreak(0);
    toast.success('Wallet disconnected');
  };

  const switchChain = (newChain: Chain) => {
    if (walletAddress) {
      disconnectWallet();
    }
    setChain(newChain);
    toast.info(`Switched to ${newChain === 'solana' ? 'Solana' : 'Base'}`);
  };

  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
    }
  }, [walletAddress]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        chain,
        balance,
        credits,
        points,
        streak,
        isConnected: !!walletAddress,
        connectWallet,
        disconnectWallet,
        switchChain,
        refreshBalance,
        updateCredits,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

// Type declarations for wallet extensions
declare global {
  interface Window {
    solana?: any;
    ethereum?: any;
  }
}
