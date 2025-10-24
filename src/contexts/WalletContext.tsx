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
    
    try {
      const timestamp = Date.now();
      console.log('🔄 Refreshing balance for:', walletAddress, 'at', timestamp);
      
      // Set wallet session first (critical for RLS)
      const { error: sessionError } = await supabase.rpc('set_wallet_session', {
        wallet_addr: walletAddress
      });
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }

      // Ensure admin wallets have enough test credits (no-op for non-admins)
      try {
        await supabase.rpc('admin_ensure_test_credits', {
          _wallet_address: walletAddress,
          _chain: (chain || 'base'),
          _threshold: 10,
          _target: 100,
        });
      } catch (err) {
        console.log('Admin credits check (optional):', err);
      }

      // CRITICAL FIX: Bypass RPC and fetch directly from users table
      // This ensures we always get fresh data without any caching
      const { data, error } = await supabase
        .from('users')
        .select('balance, credits, points, streak')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        
        // Fallback to RPC if direct query fails
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_wallet_profile', {
          _wallet_address: walletAddress,
        });

        if (rpcError) {
          console.error('❌ RPC fallback error:', rpcError);
          throw rpcError;
        }

        const row: any = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (row) {
          console.log('✅ Balance data (via RPC fallback):', row);
          setBalance(Number(row.balance ?? 0));
          setCredits(Number(row.credits ?? 0));
          setPoints(Number(row.points ?? 0));
          setStreak(Number(row.streak ?? 0));
        }
        return;
      }

      if (data) {
        console.log('✅ Fresh balance data:', data, 'fetched at', timestamp);
        console.log('📊 State update:', {
          oldBalance: balance,
          newBalance: Number(data.balance ?? 0),
          oldCredits: credits,
          newCredits: Number(data.credits ?? 0),
          oldPoints: points,
          newPoints: Number(data.points ?? 0),
          oldStreak: streak,
          newStreak: Number(data.streak ?? 0)
        });
        
        // Force state updates even if values appear the same
        setBalance(Number(data.balance ?? 0));
        setCredits(Number(data.credits ?? 0));
        setPoints(Number(data.points ?? 0));
        setStreak(Number(data.streak ?? 0));
      } else {
        console.warn('⚠️ No profile data returned, user might not exist yet');
      }
    } catch (error) {
      console.error('❌ refreshBalance failed:', error);
      toast.error('Failed to fetch wallet data');
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
            
            console.log('🔌 Connected Solana wallet:', address);
            setWalletAddress(address);

            // Set wallet session FIRST (required for RLS)
            await supabase.rpc('set_wallet_session', {
              wallet_addr: address
            });

            // Create or update user in database
            const { data: existingUser, error: selectError } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', address)
              .maybeSingle();

            if (selectError) {
              console.error('❌ Error checking user:', selectError);
            }

            if (!existingUser) {
              console.log('👤 Creating new user...');
              const { error: insertError } = await supabase.from('users').insert({
                wallet_address: address,
                chain: 'solana',
              });
              
              if (insertError) {
                console.error('❌ Error creating user:', insertError);
                throw new Error('Failed to create user account');
              }
              console.log('✅ User created successfully');
            } else {
              console.log('✅ User already exists');
            }

            toast.success(`Connected to Solana: ${truncateAddress(address)}`);
            
            // Wait a bit for database to sync
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshBalance();
            return;
          } catch (error) {
            console.error('Wallet connection error:', error);
            toast.error('Failed to connect wallet');
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
            
            console.log('🔌 Connected Base wallet:', address);
            setWalletAddress(address);

            // Set wallet session FIRST (required for RLS)
            await supabase.rpc('set_wallet_session', {
              wallet_addr: address
            });

            // Create or update user in database
            const { data: existingUser, error: selectError } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', address)
              .maybeSingle();

            if (selectError) {
              console.error('❌ Error checking user:', selectError);
            }

            if (!existingUser) {
              console.log('👤 Creating new user...');
              const { error: insertError } = await supabase.from('users').insert({
                wallet_address: address,
                chain: 'base',
              });
              
              if (insertError) {
                console.error('❌ Error creating user:', insertError);
                throw new Error('Failed to create user account');
              }
              console.log('✅ User created successfully');
            } else {
              console.log('✅ User already exists');
            }
            
            toast.success(`Connected to Base: ${truncateAddress(address)}`);
            
            // Wait a bit for database to sync
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshBalance();
            return;
          } catch (error) {
            console.error('Wallet connection error:', error);
            toast.error('Failed to connect wallet');
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
