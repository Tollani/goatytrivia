# Switching from Test Mode to Production

Your GOATY app is currently running in **Test Mode** - simulating blockchain transactions without real contracts. When you're ready to deploy actual smart contracts, follow this guide.

## Current Setup

✅ **Test Mode Active**
- Users can purchase credits without real blockchain transactions
- Full UX/UI flow is working perfectly
- No gas fees, no actual USDC needed
- Perfect for development and testing

## When to Switch to Production

Switch to production mode when:
1. ✅ You've fully tested the app flow and UX
2. ✅ You're ready to accept real payments
3. ✅ Smart contracts are deployed and verified
4. ✅ You have proper monitoring and support in place

## Step-by-Step Production Switch

### Step 1: Deploy Smart Contracts

Follow the full deployment guide in `DEPLOYMENT.md` to deploy:
- Base (EVM) contract
- Solana program

**You'll get:**
- Base contract address (e.g., `0x1234...5678`)
- Solana program ID (e.g., `Fg6P...FsLnS`)

### Step 2: Update Contract Configuration

Edit `src/lib/contractConfig.ts`:

```typescript
// Line 3: Change TEST_MODE to false
export const TEST_MODE = false; // ← Change this to false

// Lines 23-36: Add your deployed addresses
export const PRODUCTION_CONTRACTS = {
  base: {
    goatCredits: '0xYOUR_DEPLOYED_BASE_CONTRACT' as `0x${string}`, // ← Update
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  baseSepolia: {
    goatCredits: '0xYOUR_TESTNET_CONTRACT' as `0x${string}`, // ← Update
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  },
  solana: {
    programId: 'YOUR_DEPLOYED_PROGRAM_ID', // ← Update
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};
```

### Step 3: Update Database

Insert your deployed contract information:

```sql
-- Insert Base contract info
INSERT INTO contracts (chain, contract_address, usdc_address, is_active)
VALUES 
  ('base', '0xYOUR_DEPLOYED_BASE_CONTRACT', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', true);

-- Insert Solana program info  
INSERT INTO contracts (chain, contract_address, usdc_address, program_id, is_active)
VALUES 
  ('solana', 'YOUR_DEPLOYED_PROGRAM_ID', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'YOUR_DEPLOYED_PROGRAM_ID', true);
```

### Step 4: Switch Component (Optional)

If you want to use the advanced contract component instead of the simulated one:

Edit `src/pages/Index.tsx`:

```typescript
// Line 4: Change import
import { ContractCreditPurchase } from '@/components/ContractCreditPurchase';

// Line 109: Change component
<ContractCreditPurchase />
```

### Step 5: Test on Testnet First

**CRITICAL:** Test everything on testnet before mainnet!

1. Set contracts to testnet addresses
2. Use testnet USDC
3. Verify full purchase flow works
4. Check credits are credited correctly
5. Verify transaction verification works

### Step 6: Deploy to Production

Once testnet testing is complete:

1. Update contracts to mainnet addresses
2. Commit and push changes
3. Deploy via Lovable's publish feature
4. Monitor transactions closely
5. Have support ready for users

## Monitoring Production

After switching to production:

### Backend Monitoring
- Watch Edge Function logs for verification errors
- Monitor database for failed transactions
- Set up alerts for unusual patterns

### Contract Monitoring
- Track USDC balance in contracts
- Monitor gas costs
- Watch for failed transactions on block explorers

### User Support
- Have a support channel ready (Discord/Email)
- Document common issues
- Prepare refund process for edge cases

## Rollback Plan

If issues arise, you can quickly rollback:

```typescript
// src/lib/contractConfig.ts
export const TEST_MODE = true; // ← Switch back to test mode
```

This immediately switches back to simulation mode while you fix issues.

## Cost Considerations

### Gas Fees (Base)
- Deployment: ~$10-50 depending on gas prices
- Per purchase transaction: ~$0.10-0.50

### SOL Fees (Solana)
- Program deployment: ~5-10 SOL
- Per purchase transaction: ~0.000005 SOL (~$0.0001)

### User Costs
- Base users pay ~$0.10-0.50 gas per purchase
- Solana users pay ~$0.0001 per purchase
- Both need USDC for actual purchases

## Frequently Asked Questions

**Q: Can I test production mode without real money?**
A: Yes! Use testnet contracts (Base Sepolia, Solana Devnet) with testnet USDC.

**Q: What if my contract deployment fails?**
A: Check the troubleshooting section in `DEPLOYMENT.md`. Common issues are insufficient gas/SOL or incorrect configuration.

**Q: Can I switch back to test mode anytime?**
A: Yes! Just set `TEST_MODE = true` in `contractConfig.ts`.

**Q: Do I need to deploy both Base AND Solana?**
A: No, you can deploy just one chain initially. Users on that chain will use real contracts, others will see test mode.

**Q: How do I know if transactions are being verified correctly?**
A: Check your Supabase Edge Function logs and the `purchases` table for verification status.

## Support

Need help switching to production?
1. Review `DEPLOYMENT.md` for detailed deployment steps
2. Test thoroughly on testnet first
3. Ask in Lovable Discord for deployment support
4. Check contract verification on block explorers

---

**Remember:** Take your time, test thoroughly on testnet, and don't rush to mainnet!
