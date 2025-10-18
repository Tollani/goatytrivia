# GOATY Smart Contract Deployment Guide

This guide walks through deploying and integrating the GOAT Credits smart contracts on Base and Solana.

## Prerequisites

### General
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Basic understanding of smart contracts and blockchain

### For Base (EVM)
- [ ] Private key with ETH on Base for gas fees
- [ ] USDC on Base for testing
- [ ] Basescan API key (for verification)
- [ ] Alchemy or Infura RPC endpoint (optional, can use public)

### For Solana
- [ ] Solana CLI installed (`sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`)
- [ ] Anchor CLI installed (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked`)
- [ ] Solana wallet with SOL for deployment
- [ ] USDC SPL tokens for testing

## Part 1: Deploy Base (EVM) Contract

### 1.1 Setup Hardhat Environment

```bash
cd contracts/base
npm install
cp .env.example .env
```

### 1.2 Configure Environment

Edit `.env`:

```bash
# Your deployer wallet private key (KEEP SECRET!)
PRIVATE_KEY=0x1234567890abcdef...

# RPC URLs (use public or your own)
BASE_RPC_URL=https://mainnet.base.org
BASE_TESTNET_RPC_URL=https://sepolia.base.org

# Basescan API key for verification
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
```

### 1.3 Compile Contract

```bash
npm run compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

### 1.4 Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:testnet
```

**Important:** Save the contract address from the output!

Example output:
```
✅ GOATCredits deployed to: 0x1234567890abcdef1234567890abcdef12345678
Credit Price: 1.0 USDC
```

### 1.5 Verify Contract on Basescan

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 1.6 Deploy to Base Mainnet (Production)

**Only after thorough testing on testnet!**

```bash
npm run deploy:mainnet
```

## Part 2: Deploy Solana Program

### 2.1 Setup Anchor Environment

```bash
cd contracts/solana
anchor build
```

### 2.2 Configure Solana CLI

Set your cluster:

```bash
# For devnet testing
solana config set --url devnet

# For mainnet (production)
solana config set --url mainnet-beta
```

Check your wallet balance:

```bash
solana balance
```

If you need SOL for devnet:

```bash
solana airdrop 2
```

### 2.3 Deploy Program

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (after testing)
anchor deploy --provider.cluster mainnet
```

**Save the Program ID from the output!**

### 2.4 Initialize Program IDL

```bash
anchor idl init <PROGRAM_ID> -f target/idl/goaty_credits.json
```

### 2.5 Create Dev Wallet ATA (Associated Token Account)

```bash
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

Save the ATA address for your dev wallet.

## Part 3: Backend Integration

### 3.1 Update Contract Addresses in Code

Edit `src/lib/wagmiConfig.ts`:

```typescript
export const CONTRACTS = {
  [base.id]: {
    goatCredits: '0xYOUR_DEPLOYED_CONTRACT_ADDRESS' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  // ... other networks
};

export const SOLANA_CONFIG = {
  programId: 'YOUR_DEPLOYED_PROGRAM_ID',
  // ... rest
};
```

### 3.2 Insert Contract Info into Database

Connect to your Supabase database and run:

```sql
-- Insert Base contract info
INSERT INTO contracts (chain, contract_address, usdc_address, is_active)
VALUES 
  ('base', '0xYOUR_DEPLOYED_CONTRACT_ADDRESS', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', true);

-- Insert Solana program info  
INSERT INTO contracts (chain, contract_address, usdc_address, program_id, is_active)
VALUES 
  ('solana', 'YOUR_DEPLOYED_PROGRAM_ID', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'YOUR_DEPLOYED_PROGRAM_ID', true);
```

### 3.3 Configure RPC Endpoints (Optional)

For production, consider using:
- **Base**: Alchemy, Infura, or QuickNode
- **Solana**: Helius, QuickNode, or Triton

Update RPC URLs in:
- `contracts/base/hardhat.config.ts`
- Solana connection strings in `src/hooks/useSolanaPurchase.ts`

## Part 4: Testing

### 4.1 Test Base Contract

1. **Get Test USDC** on Base Sepolia:
   - Use faucet or bridge from other testnets

2. **Connect Wallet** to your app on Base Sepolia

3. **Approve USDC**:
   - App will prompt for USDC approval
   - Confirm in MetaMask

4. **Purchase Credits**:
   - Select quantity (1-10)
   - Confirm transaction
   - Wait for confirmation

5. **Verify**:
   - Check credits in database
   - View transaction on Basescan

### 4.2 Test Solana Program

1. **Get Test USDC** on Solana devnet:
   ```bash
   spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
   # Request test USDC from faucet
   ```

2. **Connect Phantom** wallet to devnet

3. **Purchase Credits**:
   - Select quantity
   - Approve transaction
   - Wait for confirmation

4. **Verify**:
   - Check credits in database
   - View transaction on Solana Explorer

## Part 5: Production Checklist

### Security
- [ ] Private keys stored securely (never in code/git)
- [ ] Contract ownership transferred to multisig (recommended)
- [ ] RLS policies tested and verified
- [ ] Rate limiting implemented on backend
- [ ] Smart contract audit completed (recommended for mainnet)

### Monitoring
- [ ] Set up alerts for:
  - Failed transactions
  - Unusual purchase patterns
  - Contract balance thresholds
- [ ] Monitor RPC endpoint health
- [ ] Track gas/SOL costs

### Frontend
- [ ] Error handling for all failure cases
- [ ] Loading states for all async operations
- [ ] Clear user feedback for transaction status
- [ ] Mobile wallet support tested
- [ ] Network switching tested

### Backend
- [ ] Edge function logging enabled
- [ ] Transaction verification working
- [ ] Database triggers functional
- [ ] Backup/recovery plan in place

## Part 6: Maintenance

### Withdrawing Funds

**Base Contract:**
```javascript
// Call withdrawUSDC as contract owner
await contract.withdrawUSDC(amount);
```

**Solana Program:**
```bash
# Use anchor to call withdraw_usdc instruction
anchor run withdraw --provider.cluster mainnet
```

### Updating Credit Price

**Base Contract:**
```javascript
// Call setPrice as contract owner (amount in USDC * 1e6)
await contract.setPrice(1500000); // $1.50 per credit
```

### Monitoring Contract Balances

**Base:**
```bash
# Check USDC balance in contract
cast call <CONTRACT_ADDRESS> "getUSDCBalance()" --rpc-url https://mainnet.base.org
```

**Solana:**
```bash
# Check dev wallet USDC balance
spl-token balance EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --owner <DEV_WALLET>
```

## Troubleshooting

### Common Issues

**Base/EVM:**
- `insufficient funds for gas`: Add more ETH to deployer wallet
- `nonce too high`: Reset MetaMask account
- `execution reverted`: Check USDC balance and approval

**Solana:**
- `insufficient lamports`: Need more SOL for rent/fees
- `AccountNotFound`: Create associated token account first
- `Program failed to complete`: Check program logs with `solana logs`

### Getting Help

- Base: https://docs.base.org
- Solana: https://docs.solana.com
- Anchor: https://www.anchor-lang.com/docs
- Hardhat: https://hardhat.org/docs

## Support

For deployment issues:
1. Check contract deployment logs
2. Verify environment variables
3. Test on testnet first
4. Review transaction on block explorer
5. Check Edge Function logs in Lovable Cloud

---

**Remember**: Always test thoroughly on testnets before mainnet deployment!
