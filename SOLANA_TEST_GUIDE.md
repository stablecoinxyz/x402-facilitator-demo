# Solana Payment Testing Guide

---

## 🎯 Testing Solana Payments

### Prerequisites

1. **Facilitator Wallet**
   - Must have: 0.02 SOL (for gas to execute delegated transfers)
   - Does NOT need SBC (never holds customer funds)

2. **AI Agent Wallet** (You need to create/fund this)
   - Must have: 0.01 SOL (for gas) + 0.05 SBC (for payment)
   - Must approve facilitator as delegate (one-time setup)

3. **Merchant Wallet**
   - Receives SBC payments (no upfront funding needed)

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
# Solana Merchant Wallet (receives payments)
SOLANA_MERCHANT_ADDRESS=<YOUR_MERCHANT_ADDRESS>

# Solana Facilitator (executes transactions via SPL delegation, never holds funds)
SOLANA_FACILITATOR_PRIVATE_KEY=<YOUR_FACILITATOR_PRIVATE_KEY>
SOLANA_FACILITATOR_ADDRESS=<YOUR_FACILITATOR_ADDRESS>

# Solana AI Agent (makes payments, must approve facilitator as delegate)
SOLANA_AGENT_PRIVATE_KEY=<YOUR_AGENT_PRIVATE_KEY>
SOLANA_AGENT_ADDRESS=<YOUR_AGENT_ADDRESS>

# Solana RPC (e.g. helius)
SOLANA_RPC_URL=<YOUR_SOLANA_RPC_URL>

# SBC Token Address on Solana
SBC_TOKEN_ADDRESS=DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA

# Payment Settings
SOLANA_PAYMENT_AMOUNT=50000000  # 0.05 SBC
PREFERRED_NETWORK='solana-mainnet-beta' 

# Enable real settlement
ENABLE_REAL_SETTLEMENT='true'
```

---

## 🔑 Step 4: One-Time Approval Setup

**⚠️ CRITICAL:** Before making payments, approve the facilitator as a delegate:

```bash
cd /Users/e/code/sbc/x402/packages/ai-agent
npm run approve-solana-facilitator
```

This approves the facilitator to execute SPL token transfers on behalf of your agent wallet.

**Architecture:** The facilitator **never holds your funds** - it only executes atomic Agent → Merchant transfers.

Expected output:
```
✅ DELEGATION SUCCESSFUL
Transaction: <TX_HASH>
The facilitator can now execute transfers on your behalf!
```

---

## 🚀 Step 5: Run End-to-End Test

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
   └─ Networks: radius-testnet, base, solana-mainnet-beta
   └─ Solana Amount: 50000000 (0.05 SBC)
   └─ Recipient: 2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K
```

### 3. Payment Authorization Created
```
✍️  Step 3: Creating payment authorization...
   Available payment networks: radius-testnet, base, solana-mainnet-beta
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
   Scheme: exact
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
   Scheme: exact
   Network: solana-mainnet-beta
   🟣 Solana settlement
   💰 DELEGATED TRANSFER (Non-Custodial)
   Facilitator executes transfer: Agent → Merchant
   ⏳ Sending transaction...
   ✅ Transaction confirmed: <TX_SIGNATURE>
   🔗 Explorer: https://orb.helius.dev/tx/<TX_SIGNATURE>?cluster=mainnet-beta&tab=summary
✅ Delegated settlement complete!
```

### 6. Agent Receives Premium Data
```
📡 Step 4: Retrying request with payment...
   Status: 200 OK ✅

🎉 Success! Received premium data:
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "<TX_SIGNATURE>",
  "networkId": "solana-mainnet-beta",
  "message": "Payment successful"
}

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
- Merchant/Recipient (should have +0.05 SBC)
- Facilitator (balance unchanged - never holds customer funds)

---

## 🐛 Troubleshooting

### Error: "Insufficient SBC balance"
- Fund AI agent wallet with more SBC

### Error: "Insufficient SOL for gas"
- Fund AI agent wallet with SOL (0.01 minimum)

### Error: "SOLANA_AGENT_PRIVATE_KEY not configured"
- Add agent's private key to .env as `SOLANA_AGENT_PRIVATE_KEY`

### Error: "No compatible payment method available"
- Check that PREFERRED_NETWORK matches available options
- Ensure corresponding wallet is configured in .env

---
