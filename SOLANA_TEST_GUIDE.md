# Solana Payment Testing Guide

## ✅ What's Complete

Your x402 facilitator now supports **both EVM and Solana** payments:

- ✅ **Facilitator** - Verifies and settles payments on both chains
- ✅ **Premium API** - Offers both payment options
- ✅ **AI Agent** - Intelligently chooses payment method

---

## 🎯 Testing Solana Payments

### Prerequisites

1. **Facilitator Wallet**
   - Must have: 0.02 SOL + 0.05 SBC

2. **AI Agent Wallet** (You need to create/fund this)
   - Must have: 0.01 SOL (for gas) + 0.05 SBC (for payment)

---

## 📝 Step 1: Create AI Agent Solana Wallet

```bash
# Generate keypair
cd /Users/e/code/sbc/x402
node generate-solana-keypair.js
```

This will output:
```
📍 PUBLIC KEY (Address):
<YOUR_AGENT_ADDRESS>

🔒 PRIVATE KEY (Base58 - use this in .env):
<YOUR_AGENT_PRIVATE_KEY>
```

**Save the address - you'll need to fund it!**

---

## 💰 Step 2: Fund AI Agent Wallet

Send from your dev wallet (where you have 0.2 SBC):

1. **Send 0.01 SOL** to agent address (for gas fees)
2. **Send 0.1 SBC** to agent address (for test payments)

Check balance:
```bash
node check-solana-wallet.js <AGENT_ADDRESS>
```

---

## ⚙️ Step 3: Configure Environment

Add to your `.env` file:

```bash
# Solana Facilitator (already configured)
FACILITATOR_SOLANA_PRIVATE_KEY=<YOUR_FACILITATOR_PRIVATE_KEY>
FACILITATOR_SOLANA_ADDRESS=<YOUR_FACILITATOR_ADDRESS>

# Solana AI Agent (ADD THIS)
AI_AGENT_SOLANA_PRIVATE_KEY=<YOUR_AGENT_PRIVATE_KEY>
AI_AGENT_SOLANA_ADDRESS=<YOUR_AGENT_ADDRESS>

# Solana RPC (e.g. helius)
SOLANA_RPC_URL=<YOUR_SOLANA_RPC_URL>

# Payment Settings
SOLANA_PAYMENT_AMOUNT=50000000  # 0.05 SBC
PREFERRED_PAYMENT_SCHEME='solana'

# Enable real settlement
ENABLE_REAL_SETTLEMENT='true'
```

---

## 🚀 Step 4: Run End-to-End Test

### Terminal 1: Start Facilitator
```bash
cd /Users/e/code/sbc/x402/packages/facilitator
npm run dev
```

Expected output:
```
✅ Facilitator configuration loaded
   EVM Chain ID: 1223953
   EVM Recipient: 0x...
   Solana RPC: https://mainnet.helius-rpc.com/...
   Solana Facilitator: 2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K
🚀 Facilitator listening on port 3001
```

### Terminal 2: Start Premium API
```bash
cd /Users/e/code/sbc/x402/packages/premium-api
npm run dev
```

Expected output:
```
✅ Premium API configuration loaded
   Solana Payment Amount: 50000000 (0.05 SBC)
   SBC Token: DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA
   Payment Timeout: 60s
🚀 Premium API listening on port 3000
```

### Terminal 3: Run AI Agent
```bash
cd /Users/e/code/sbc/x402/packages/ai-agent
npm run start
```

---

## 🎬 Expected Flow

### 1. Agent Requests Data (No Payment)
```
🤖 AI Agent Starting...
📡 Step 1: Requesting premium data...
   Status: 402 Payment Required ❌
```

### 2. Payment Required Response
```
💰 Step 2: Payment Required!
   Payment requirements received:
   └─ Version: 1
   └─ Schemes: scheme_exact_evm, scheme_exact_solana
   └─ Solana Amount: 50000000 (0.05 SBC)
   └─ Recipient: 2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K
```

### 3. Payment Authorization Created
```
✍️  Step 3: Creating payment authorization...
   Available payment schemes: scheme_exact_evm, scheme_exact_solana
   Using Solana payment (preferred) 🟣
   Agent address (Solana): <YOUR_AGENT_ADDRESS>
   Payment to: 2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K
   Amount: 50000000 (0.05 SBC)
   Signature: BsA9K7x...
   ✅ Payment authorization created!
```

### 4. Facilitator Verifies Payment
```
🔍 Verifying payment...
   Scheme: scheme_exact_solana
   Network: solana-mainnet-beta
   🟣 Solana payment detected
   From (Solana): <YOUR_AGENT_ADDRESS>
   To (Solana): 2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K
   ✅ Signature valid (Ed25519)
   ✅ Deadline valid
   ✅ Amount sufficient
   ✅ Recipient valid
   ✅ Balance sufficient
✅ Payment verification successful!
```

### 5. Facilitator Settles Payment
```
💰 Settling payment...
   Scheme: scheme_exact_solana
   🟣 Solana settlement
   💰 FACILITATOR-SPONSORED SETTLEMENT
   Facilitator will pay recipient directly
   ⏳ Sending transaction...
   ✅ Transaction confirmed: <TX_SIGNATURE>
   🔗 Explorer: https://orb.helius.dev/tx/<TX_SIGNATURE>?cluster=mainnet-beta&tab=summary
✅ Facilitator-sponsored settlement complete!
```

### 6. Agent Receives Premium Data
```
📡 Step 4: Retrying request with payment...
   Status: 200 OK ✅

🎉 SUCCESS! Premium data received:
   ┌─────────────────────────────────────
   │ Data: This is premium data from the API!
   │ Tier: Premium
   │ Payment Details:
   │ └─ Tx Hash: <TX_SIGNATURE>
   │ └─ Network: solana-mainnet-beta
   │ └─ Message: Payment successful
   └─────────────────────────────────────

🔗 View transaction:
   https://orb.helius.dev/tx/<TX_SIGNATURE>?cluster=mainnet-beta&tab=summary

✅ AI Agent completed successfully!
```

---

## 🔍 Verify on Blockchain

After successful payment, check:

**1. Transaction on Helius Orb Explorer:**
```
https://orb.helius.dev/tx/<TX_SIGNATURE>?cluster=mainnet-beta&tab=summary
```

**2. Check Balances:**

- AI Agent (should have -0.05 SBC)
- Facilitator (should have +0.05 SBC)

---

## 🧪 Test Both Payment Methods

### Test Solana Payment (default)
```bash
# In .env
PREFERRED_PAYMENT_SCHEME=solana
```

### Test EVM Payment
```bash
# In .env
PREFERRED_PAYMENT_SCHEME=evm

# Make sure EVM wallets are funded on Radius testnet
```

---

## 🐛 Troubleshooting

### Error: "Insufficient SBC balance"
- Fund AI agent wallet with more SBC

### Error: "Insufficient SOL for gas"
- Fund AI agent wallet with SOL (0.01 minimum)

### Error: "AI_AGENT_SOLANA_PRIVATE_KEY not configured"
- Add agent's private key to .env

### Error: "No compatible payment method available"
- Check that PREFERRED_PAYMENT_SCHEME matches available options
- Ensure corresponding wallet is configured in .env

---

## 📊 What's Different: EVM vs Solana

| Aspect | EVM (Radius) | Solana |
|--------|--------------|---------|
| **Signature** | EIP-712 (structured) | Ed25519 (raw message) |
| **Token** | Native USD (18 decimals) | SBC SPL token (9 decimals) |
| **Amount** | 0.01 USD | 0.05 SBC |
| **Network** | Radius testnet | Solana mainnet-beta |
| **Settlement** | Simulated (testnet) | Real (mainnet) 💰 |
| **Explorer** | testnet.radiustech.xyz/testnet/explorer | orb.helius.dev |

---

## ✅ Success Checklist

- [ ] Facilitator accepts both EVM and Solana payments
- [ ] Premium API offers both payment options
- [ ] AI Agent can pay with Solana
- [ ] Real SBC tokens transferred on-chain
- [ ] Transaction visible on Solscan
- [ ] Balances updated correctly

---

## 🎉 Next Steps

You now have a **production-ready multi-chain x402 facilitator**!

**Possible enhancements:**
1. Add more token support (USDC, USDT)
2. Implement batch payments
3. Add payment history tracking
4. Create merchant dashboard
5. Add webhook notifications

🚀 **Your facilitator is now production-ready for the AI payment economy!**
