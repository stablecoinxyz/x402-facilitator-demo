# Radius Testing Guide

Complete guide for testing x402 payments with native USD tokens on Radius Testnet.

## Overview

**Radius Testnet:**
- Chain ID: `1223953`
- Native Token: USD (18 decimals)
- Payment Amount: 0.01 USD
- Explorer: https://testnet.radiustech.xyz/testnet/explorer
- Faucet: https://testnet.radiustech.xyz/testnet/faucet
- Settlement: Simulated (testnet mode)

---

## Prerequisites

- Node.js 18+ installed
- Access to Radius testnet RPC endpoint (requires API key)
- Two Ethereum wallets (facilitator + agent)
- Testnet USD tokens (from faucet)

---

## Step 1: Get Radius API Key

1. **Visit Radius Developer Portal:**
   - Go to https://radiustech.xyz
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key for testnet

2. **Save Your API Key:**
   ```
   Your RPC URL will be:
   https://rpc.testnet.radiustech.xyz/<YOUR_API_KEY>
   ```

---

## Step 2: Generate Wallets

You can use existing Ethereum wallets or generate new ones:

### Option A: Using Existing Wallets

If you have MetaMask or another Ethereum wallet, export your private keys:
- Facilitator wallet (sponsors payments from its own USD balance)
- Agent wallet (signs payment authorizations)
- Merchant wallet (receives payments)

### Option B: Generate New Wallets

```bash
# Create a simple script to generate wallets
node -e "
const { Wallet } = require('ethers');
const facilitator = Wallet.createRandom();
const agent = Wallet.createRandom();
console.log('Facilitator:');
console.log('  Address:', facilitator.address);
console.log('  Private Key:', facilitator.privateKey);
console.log('\\nAgent:');
console.log('  Address:', agent.address);
console.log('  Private Key:', agent.privateKey);
"
```

**⚠️ IMPORTANT:** Save these private keys securely. Never commit them to git.

---

## Step 3: Fund Wallets with Testnet USD

On Radius, the native token is USD. Unlike ERC-20 tokens, native tokens don't support `transferFrom`. To maintain non-custodial properties, the agent creates and signs the full native token transfer transaction, and the facilitator broadcasts it.

1. **Visit Radius Testnet Faucet:**
   ```
   https://testnet.radiustech.xyz/testnet/faucet
   ```

2. **Fund Agent Wallet:**
   - Enter your agent address
   - Request testnet USD (usually get 10-100 USD)
   - Agent needs: USD for payments + gas fees
   - Minimum: 0.02 USD per payment (0.01 payment + gas)

3. **Fund Facilitator Wallet (optional):**
   - Facilitator only needs minimal USD for failed transaction retries
   - The facilitator does NOT pay from its own balance - it broadcasts the agent's signed transaction

4. **Verify on Explorer:**
   ```
   https://testnet.radiustech.xyz/testnet/explorer/address/0xYourAddress
   ```

---

## Step 4: Check Balances

Create a script to check your balances:

```bash
# Create check-radius-balance.js
cat > check-radius-balance.js << 'EOF'
const { ethers } = require('ethers');

const RPC_URL = process.env.RADIUS_RPC_URL || 'https://rpc.testnet.radiustech.xyz/YOUR_API_KEY';
const ADDRESS = process.env.ADDRESS;

async function checkBalance() {
  if (!ADDRESS) {
    console.error('Usage: ADDRESS=0x... node check-radius-balance.js');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log('\n🔍 Checking balances on Radius Testnet');
  console.log(`   Chain ID: 1223953`);
  console.log(`   Address: ${ADDRESS}\n`);

  // Check USD balance (native token)
  const balance = await provider.getBalance(ADDRESS);
  console.log(`💰 USD Balance: ${ethers.formatEther(balance)} USD`);

  // Check if enough for payment (0.01 USD minimum)
  const minRequired = ethers.parseEther('0.01');
  if (balance >= minRequired) {
    console.log('✅ Sufficient balance for payments\n');
  } else {
    console.log('❌ Insufficient balance. Need at least 0.01 USD\n');
  }
}

checkBalance().catch(console.error);
EOF

# Install ethers if not installed
npm install ethers

# Check facilitator balance
RADIUS_RPC_URL=https://rpc.testnet.radiustech.xyz/YOUR_API_KEY \
ADDRESS=0xYourFacilitatorAddress \
node check-radius-balance.js

# Check agent balance
RADIUS_RPC_URL=https://rpc.testnet.radiustech.xyz/YOUR_API_KEY \
ADDRESS=0xYourAgentAddress \
node check-radius-balance.js
```

**Expected Output:**
```
🔍 Checking balances on Radius Testnet
   Chain ID: 1223953
   Address: 0x1234...5678

💰 USD Balance: 10.0 USD
✅ Sufficient balance for payments
```

---

## Step 5: Configure Environment

Edit your `.env` file:

```bash
# Radius Testnet Configuration
RADIUS_TESTNET_RPC_URL=https://rpc.testnet.radiustech.xyz/YOUR_API_KEY

# Radius Merchant Wallet (receives payments)
RADIUS_MERCHANT_ADDRESS=0xYourMerchantAddress

# Radius Facilitator Wallet (executes transactions, never holds funds)
RADIUS_FACILITATOR_PRIVATE_KEY=0xYourFacilitatorPrivateKey
RADIUS_FACILITATOR_ADDRESS=0xYourFacilitatorAddress

# Radius AI Agent Wallet (makes payments)
RADIUS_AGENT_PRIVATE_KEY=0xYourAgentPrivateKey
RADIUS_AGENT_ADDRESS=0xYourAgentAddress

# Payment Configuration
RADIUS_PAYMENT_AMOUNT=10000000000000000  # 0.01 USD (18 decimals)
PAYMENT_TIMEOUT=60

# Set Radius as preferred payment method
PREFERRED_NETWORK=radius-testnet

# Settlement mode (simulated for Radius testnet)
ENABLE_REAL_SETTLEMENT=false
```

---

## Step 6: Start Services

Open 3 terminals:

**Terminal 1 - Facilitator:**
```bash
cd packages/facilitator
npm run dev
```

Expected output:
```
✅ Facilitator configuration loaded
   EVM Chain ID: 1223953
   EVM Recipient: 0x1234...5678
   Base Chain ID: 8453
   Base Facilitator: Not configured
   Solana RPC: https://api.mainnet-beta.solana.com
   Solana Facilitator: Not configured
🚀 Facilitator running on port 3001
```

**Terminal 2 - Premium API:**
```bash
cd packages/premium-api
npm run dev
```

Expected output:
```
✅ Premium API configuration loaded
   EVM Chain ID: 1223953
   EVM Payment Amount: 10000000000000000 (0.01 USD)
   Payment Timeout: 60s
🚀 Premium API running on port 3000
```

**Terminal 3 - AI Agent:**
```bash
cd packages/ai-agent
npm run start
```

---

## Step 7: Expected Output (Success)

```
🤖 AI Agent starting...
✅ AI Agent configuration loaded
   Preferred Network: radius-testnet
   Radius Agent Address: 0x1234...5678

📡 Requesting premium data...
💰 Payment required!

Payment requirements: {
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "radius-testnet",
      "maxAmountRequired": "10000000000000000",
      "payTo": "0x...",
      "asset": "0x0000000000000000000000000000000000000000",
      "maxTimeoutSeconds": 60
    }
  ]
}

✍️  Creating payment authorization...
   Available payment networks: radius-testnet, base, solana-mainnet-beta
   Using Radius payment (preferred) 🔵
   Agent address: 0x1234...5678
   Payment to: 0xabcd...ef01
   Amount: 10000000000000000 (0.01 USD)
   Deadline: 2025-11-24T20:45:30.000Z
   📝 Creating signed native token transaction...
   ✅ Transaction signed by agent
   Signed tx: 0xf86c0b8502540be400...
✅ Payment authorized!

📡 Retrying request with payment...

🔍 Verifying payment...
   Scheme: exact
   Network: radius-testnet
   🔵 Radius payment detected
   From: 0x1234...5678
   To: 0xabcd...ef01
   Amount: 10000000000000000
   Deadline: 2025-11-24T20:45:30.000Z
   📝 Verifying signed transaction...
   ✅ Signed transaction valid
   ✅ Transaction matches claimed payment details
   ✅ Deadline valid
   ✅ Amount sufficient
   ✅ Recipient valid
   Sender balance: 10000000000000000000 (10.0 USD)
   ✅ Balance sufficient
✅ Payment verification successful!

💰 Settling payment...
   Scheme: exact
   Network: radius-testnet
   🔵 Radius settlement
   From: 0x1234...5678
   To: 0xabcd...ef01
   Amount: 10000000000000000
   💵 Native token transfer (USD)
   📝 Agent signed transaction - Facilitator broadcasting
   Executing transfer on Radius testnet...
   ⚠️  SIMULATED MODE - Set ENABLE_REAL_SETTLEMENT=true for real transactions
   ✅ Simulated tx hash: 0x9876543210abcdef...
✅ Simulated settlement complete!

🎉 Success! Received premium data:
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "0x9876543210abcdef...",
  "networkId": "radius-testnet",
  "message": "Payment successful"
}

🔗 Transaction: https://testnet.radiustech.xyz/testnet/explorer/tx/0x9876543210abcdef...
✅ AI Agent completed successfully!
```

---

## Step 8: Verify on Block Explorer

```
https://testnet.radiustech.xyz/testnet/explorer/tx/0xYourTransactionHash
```

**Note:** Since Radius testnet uses simulated settlement by default, you may not see the transaction on-chain. The transaction hash is generated for demonstration purposes.

---

## Troubleshooting

### Error: "Insufficient balance"

**Problem:** Agent doesn't have enough USD tokens

**Solution:**
```bash
# Check balance
RADIUS_RPC_URL=https://rpc.testnet.radiustech.xyz/YOUR_API_KEY \
ADDRESS=0xYourAgentAddress \
node check-radius-balance.js

# If balance is low, get more from faucet
# Visit: https://testnet.radiustech.xyz/testnet/faucet
```

### Error: "Network connection failed"

**Problem:** RPC endpoint down or incorrect API key

**Solution:**
```bash
# Test RPC endpoint
curl -X POST https://rpc.testnet.radiustech.xyz/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x..."}

# If it fails:
# 1. Check your API key is correct
# 2. Verify your API key has testnet access enabled
# 3. Check Radius status page for outages
```

### Error: "Transaction verification failed" or "Invalid signed transaction"

**Problem:** Signed transaction doesn't match claimed payment details

**Solution:**
1. Verify `RADIUS_AGENT_PRIVATE_KEY` matches `RADIUS_AGENT_ADDRESS`
2. Verify chain ID is `1223953` (Radius testnet)
3. Check that recipient, amount, and chain ID in the signed transaction match the payment payload
4. Ensure nonce hasn't been used (check on-chain)

```bash
# Verify address from private key
node -e "
const { Wallet } = require('ethers');
const wallet = new Wallet('0xYourPrivateKey');
console.log('Address:', wallet.address);
"
```

### Error: "Invalid recipient"

**Problem:** Merchant or facilitator address mismatch

**Solution:**
```bash
# Verify addresses are correctly configured in .env:
RADIUS_MERCHANT_ADDRESS=0x...           # Merchant receives payments
RADIUS_FACILITATOR_ADDRESS=0x...        # Must match facilitator private key
RADIUS_FACILITATOR_PRIVATE_KEY=0x...    # Must derive to facilitator address
```

### Error: "Payment expired"

**Problem:** Deadline passed before verification

**Solution:**
1. Increase `PAYMENT_TIMEOUT` in `.env` (default: 60 seconds)
2. Check system clocks are synchronized
3. Reduce network latency

```bash
# In .env
PAYMENT_TIMEOUT=120  # 2 minutes
```

### Error: "Faucet rate limit exceeded"

**Problem:** Too many faucet requests

**Solution:**
- Wait 24 hours before requesting again
- Use different address
- Ask in Radius Discord for additional testnet funds

---

## Performance Metrics

**Expected Performance on Radius Testnet:**

| Metric | Value |
|--------|-------|
| **Verification Time** | ~100ms |
| **Settlement Time** | <1s (simulated) |
| **Block Confirmation** | 2-3 seconds |
| **Gas Cost** | Free (testnet) |
| **Total Latency** | <2 seconds |

---

## Comparison: Radius vs Other Chains

| Feature | Radius Testnet | Base Mainnet | Solana Mainnet |
|---------|----------------|--------------|----------------|
| **Real Settlement** | ❌ Simulated | ✅ Yes (ERC-20) | ✅ Yes (SPL) |
| **Token Type** | Native USD | SBC ERC-20 | SBC SPL |
| **Decimals** | 18 | 18 | 9 |
| **Gas Token** | USD | ETH | SOL |
| **Block Time** | 2-3s | 2s | 0.4s |
| **Cost** | Free (testnet) | ~$0.01/tx | ~$0.0001/tx |
| **Finality** | 2-3s | 2-3s | <1s |
| **Purpose** | Testing/Demo | Production | Production |

---

## Why Use Radius Testnet?

**Benefits:**
- ✅ Free testnet tokens (no real money needed)
- ✅ Fast testing iterations
- ✅ No mainnet risk
- ✅ Native USD token (no ERC-20 complexity)
- ✅ EVM-compatible (same code as Ethereum/Base)
- ✅ Good for development and demos

**Limitations:**
- ❌ Not production-ready (testnet only)
- ❌ Simulated settlement (not real on-chain transfers)
- ❌ Testnet can be reset/wiped
- ❌ Requires API key
- ❌ Limited testnet token supply from faucet

---

## Next Steps

Once Radius testnet works:

1. **Verify the flow** - Ensure payment authorization, verification, and settlement work end-to-end
2. **Test edge cases** - Try insufficient balance, expired deadlines, invalid signatures
3. **Move to production chains**:
   - Base Mainnet with real SBC tokens (see [BASE_TEST_GUIDE.md](./BASE_TEST_GUIDE.md))
   - Solana Mainnet with real SBC tokens (see [SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md))
4. **Monitor and iterate** - Track success rates and latency

---

## Additional Resources

**Radius Documentation:**
- Radius Docs: https://docs.radiustech.xyz
- Radius Developer Portal: https://radiustech.xyz
- Radius Testnet Faucet: https://testnet.radiustech.xyz/testnet/faucet

**Explorers:**
- Radius Testnet Explorer: https://testnet.radiustech.xyz/testnet/explorer

---

## Support

**Issues?**
- Check [README.md](./README.md) for quick start and basic setup
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [BASE_TEST_GUIDE.md](./BASE_TEST_GUIDE.md) for Base testing
- Check [SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md) for Solana testing
- Check [debug/REVIEW.md](./debug/REVIEW.md) for production considerations
- File issue: https://github.com/yourusername/x402/issues

**Need API Key?**
- Sign up at https://radiustech.xyz

---
