# GOATY Smart Contracts

This directory contains smart contracts for on-chain USDC credit purchases on Base and Solana.

## Directory Structure

```
contracts/
├── base/              # Base (EVM) smart contracts
│   ├── GOATCredits.sol
│   ├── hardhat.config.ts
│   ├── scripts/deploy.ts
│   └── package.json
└── solana/            # Solana Anchor program
    ├── programs/goaty-credits/
    ├── Anchor.toml
    └── Cargo.toml
```

## Base (EVM) Deployment

### Prerequisites
- Node.js 18+
- Private key with ETH on Base for gas
- USDC for testing

### Setup
```bash
cd contracts/base
npm install
cp .env.example .env
# Edit .env with your PRIVATE_KEY
```

### Deploy to Base Sepolia (Testnet)
```bash
npm run deploy:testnet
```

### Deploy to Base Mainnet
```bash
npm run deploy:mainnet
```

### Verify Contract
```bash
npx hardhat verify --network baseMainnet <CONTRACT_ADDRESS> <USDC_ADDRESS>
```

### Contract Addresses
- **Base Mainnet USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Solana Deployment

### Prerequisites
- Rust 1.70+
- Solana CLI 1.17+
- Anchor 0.29+
- SOL on devnet/mainnet for deployment
- USDC SPL tokens for testing

### Setup
```bash
cd contracts/solana
anchor build
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

### Generate IDL
```bash
anchor idl init <PROGRAM_ID> -f target/idl/goaty_credits.json
```

### Solana Addresses
- **Devnet USDC**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Mainnet USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Dev Wallet**: `E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv`

## After Deployment

1. **Update Environment Variables** in Lovable Cloud:
   - `BASE_CONTRACT_ADDRESS`
   - `SOLANA_PROGRAM_ID`

2. **Insert Contract Info** into Supabase `contracts` table:
```sql
INSERT INTO contracts (chain, contract_address, usdc_address, is_active)
VALUES 
  ('base', '<BASE_CONTRACT_ADDRESS>', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', true),
  ('solana', '<SOLANA_PROGRAM_ID>', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', true);
```

3. **Test Purchases**:
   - Ensure you have USDC in your wallet
   - Approve USDC spending (Base only)
   - Execute buy transaction
   - Verify credits in database

## Security Notes

- ✅ Reentrancy protection (Base)
- ✅ Owner-only admin functions
- ✅ Event emission for all purchases
- ✅ Input validation
- ⚠️ Audit recommended before mainnet deployment
- ⚠️ Test thoroughly on testnet first

## Support

For deployment issues, check:
- RPC endpoints are accessible
- Wallet has sufficient gas/SOL
- USDC addresses match the network
- Private keys/keypairs are correctly formatted
