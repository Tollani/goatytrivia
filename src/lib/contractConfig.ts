// Contract Configuration
// Set TEST_MODE to true for development without deployed contracts
export const TEST_MODE = true;

// Mock contract addresses for test mode
export const MOCK_CONTRACTS = {
  base: {
    goatCredits: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  solana: {
    programId: 'TestMode1111111111111111111111111111111111',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

// Production contract addresses (update after deployment)
export const PRODUCTION_CONTRACTS = {
  base: {
    goatCredits: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Update with deployed address
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  baseSepolia: {
    goatCredits: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Update with deployed address
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  },
  solana: {
    programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS', // Update with deployed program ID
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

// Get active contract config based on mode
export const getContractConfig = () => {
  return TEST_MODE ? MOCK_CONTRACTS : PRODUCTION_CONTRACTS;
};

// Simulate blockchain transaction delay
export const simulateTransactionDelay = (minMs: number = 1000, maxMs: number = 3000) => {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Generate mock transaction hash
export const generateMockTxHash = (chain: 'base' | 'solana') => {
  if (chain === 'solana') {
    // Solana signature format (base58, ~88 chars)
    return Array(88).fill(0).map(() => 
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');
  } else {
    // EVM transaction hash format (0x + 64 hex chars)
    return '0x' + Array(64).fill(0).map(() => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
  }
};
