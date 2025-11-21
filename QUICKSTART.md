# Quick Start - x402 Facilitator POC

Get the POC running in 5 minutes!

## 1. Install Dependencies (2 minutes)

```bash
cd /Users/e/code/sbc/x402

# Install all packages
cd packages/facilitator && npm install && cd ../..
cd packages/premium-api && npm install && cd ../..
cd packages/ai-agent && npm install && cd ../..
```

## 2. Configure environment variables in .env (2 minutes)

```bash
cp .env.example .env
```

Fill in these required fields:
```bash
RADIUS_TESTNET_RPC_URL=https://rpc.testnet.radiustech.xyz/YOUR_API_KEY
FACILITATOR_WALLET_PRIVATE_KEY=0x...
RECIPIENT_ADDRESS=0x...
AI_AGENT_PRIVATE_KEY=0x...
AI_AGENT_ADDRESS=0x...
```

**Get API Key:** https://testnet.radiustech.xyz/testnet/rpc
**Get Testnet USD:** https://testnet.radiustech.xyz/testnet/faucet

### Optional: Enable Real Settlement

By default, the POC uses **simulated settlement** (fake transaction hashes) to demonstrate the flow without requiring funded wallets.

To enable **real on-chain settlement** on Radius testnet:

1. Fund your facilitator wallet with testnet USD
2. In your `.env` file, set:
```bash
ENABLE_REAL_SETTLEMENT=true
```

When enabled:
- ✅ Real transactions executed on Radius testnet
- ✅ Real transaction hashes and block confirmations
- ✅ Viewable on Radius explorer: https://testnet.radiustech.xyz/testnet/explorer
- ⚠️ Requires facilitator wallet to have sufficient USD balance

When disabled (default):
- ✅ Full x402 flow demonstration
- ✅ No wallet funding required
- ✅ Fast testing and development
- ⚠️ Transaction hashes are simulated

## 3. Run (1 minute)

Open 3 terminals:

**Terminal 1:**
```bash
cd /Users/e/code/sbc/x402/packages/facilitator
npm run dev
```

**Terminal 2:**
```bash
cd /Users/e/code/sbc/x402/packages/premium-api
npm run dev
```

**Terminal 3:**
```bash
cd /Users/e/code/sbc/x402/packages/ai-agent
npm run start
```

## Expected Output

```
🤖 AI Agent Starting...
========================

💭 Agent Goal: Access premium data from the API

📡 Step 1: Requesting premium data...
   Status: 402 Payment Required ❌

💰 Step 2: Payment Required!

✍️  Step 3: Creating payment authorization...
   ✅ Payment authorization created!

📡 Step 4: Retrying request with payment...
   Status: 200 OK ✅

🎉 SUCCESS! Premium data received:
   Data: This is PREMIUM data only available after payment! 💎
   Tx Hash: 0x...

✅ AI Agent completed successfully!
```

## Troubleshooting

**"RADIUS_TESTNET_RPC_URL is required"**
→ Check .env file exists and has RPC URL

**"Insufficient balance"**
→ Fund wallets at https://testnet.radiustech.xyz/testnet/faucet

**"Connection refused"**
→ Make sure all 3 services are running

## What's Next?

- Read [SETUP.md](./SETUP.md) for detailed setup
- Read [TESTING.md](./TESTING.md) for testing guide
- Read [README.md](./README.md) for architecture details

## Demo Script

Once everything works, use:
```bash
./demo.sh
```

---

**Need help?** Check the full documentation or contact the SBC team.
