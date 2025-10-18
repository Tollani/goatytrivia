import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// Contract addresses (update after deployment)
export const CONTRACTS = {
  [base.id]: {
    goatCredits: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Update with deployed address
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // Base USDC
  },
  [baseSepolia.id]: {
    goatCredits: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Update with deployed address
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
  },
};

export const SOLANA_CONFIG = {
  programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS', // Update with deployed program ID
  usdcMint: {
    devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  devWallet: 'E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv',
};
