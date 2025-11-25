# Base Testing Guide

Complete guide for testing x402 payments with SBC tokens on Base (Mainnet and Sepolia).

## Overview

**Base Mainnet:**
- Chain ID: `8453`
- SBC Token: `0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798` (18 decimals)
- Payment Amount: 0.01 SBC
- Explorer: https://basescan.org

**Base Sepolia (Testnet):**
- Chain ID: `84532`
- SBC Token: `0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16` (6 decimals)
- Payment Amount: 0.01 SBC
- Explorer: https://sepolia.basescan.org

---

## Prerequisites

- Node.js 18+ installed
- Access to Base RPC endpoint (public or Alchemy/QuickNode)
- Two Ethereum wallets (facilitator + agent)
- ETH for gas fees on Base
- SBC tokens for payments

---

## Step 1: Generate Wallets

You can use existing Ethereum wallets or generate new ones:

### Option A: Using Existing Wallets

If you have MetaMask or another Ethereum wallet, export your private keys:
- Facilitator wallet (receives payments)
- Agent wallet (makes payments)

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

## Step 2: Fund Wallets

### Base Mainnet

1. **Get ETH for Gas:**
   - Bridge ETH to Base using https://bridge.base.org
   - Or buy ETH directly on Base via an exchange
   - Minimum: ~0.001 ETH per wallet

2. **Get SBC Tokens:**
   - Contact SBC team for tokens
   - Or swap ETH → SBC on Base DEX (if available)
   - Facilitator needs: 1+ SBC (to receive payments)
   - Agent needs: 0.1+ SBC (to make test payments)

### Base Sepolia (Testnet)

1. **Get ETH for Gas:**
   - Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   - Minimum: 0.01 ETH per wallet

2. **Get SBC Tokens:**
   - Contact SBC team for testnet tokens
   - Or use SBC faucet (https://dashboard.stablecoin.xyz/faucet)

3. **Bridge to Base Sepolia:**
   - Use Base Sepolia Bridge: https://bridge.base.org/deposit?network=base-sepolia

---

## Step 3: Check Balances

Create a script to check your balances:

```bash
# Create check-base-balance.js
cat > check-base-balance.js << 'EOF'
const { ethers } = require('ethers');

const BASE_CHAIN_ID = process.env.BASE_CHAIN_ID || '8453';
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const SBC_TOKEN = process.env.BASE_SBC_TOKEN_ADDRESS || '0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798';
const DECIMALS = parseInt(process.env.BASE_SBC_DECIMALS || '18');
const ADDRESS = process.env.ADDRESS;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function checkBalance() {
  if (!ADDRESS) {
    console.error('Usage: ADDRESS=0x... node check-base-balance.js');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(SBC_TOKEN, ERC20_ABI, provider);

  console.log(`\n🔍 Checking balances on Base (Chain ID: ${BASE_CHAIN_ID})`);
  console.log(`   Address: ${ADDRESS}`);
  console.log(`   SBC Token: ${SBC_TOKEN}\n`);

  // Check ETH balance
  const ethBalance = await provider.getBalance(ADDRESS);
  console.log(`💎 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  // Check SBC balance
  const sbcBalance = await contract.balanceOf(ADDRESS);
  const symbol = await contract.symbol();
  console.log(`💰 ${symbol} Balance: ${ethers.formatUnits(sbcBalance, DECIMALS)} ${symbol}`);
  console.log();
}

checkBalance().catch(console.error);
EOF

# Install ethers if not installed
npm install ethers

# Check facilitator balance (mainnet)
ADDRESS=0xYourFacilitatorAddress node check-base-balance.js

# Check agent balance (mainnet)
ADDRESS=0xYourAgentAddress node check-base-balance.js

# Check on Sepolia
BASE_CHAIN_ID=84532 \
BASE_RPC_URL=https://sepolia.base.org \
BASE_SBC_TOKEN_ADDRESS=0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16 \
BASE_SBC_DECIMALS=6 \
ADDRESS=0xYourAddress \
node check-base-balance.js
```

**Expected Output:**
```
🔍 Checking balances on Base (Chain ID: 8453)
   Address: 0x1234...5678
   SBC Token: 0xfdcC...80798

💎 ETH Balance: 0.005 ETH
💰 SBC Balance: 1.5 SBC
```

---

## Step 4: Configure Environment

Edit your `.env` file:

### For Base Mainnet:

```bash
# Base Configuration (Mainnet)
BASE_CHAIN_ID=8453
BASE_RPC_URL=https://mainnet.base.org
# Or use premium RPC: https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Base Facilitator Wallet
BASE_FACILITATOR_PRIVATE_KEY=0xYourFacilitatorPrivateKey
BASE_FACILITATOR_ADDRESS=0xYourFacilitatorAddress

# Base AI Agent Wallet
BASE_AGENT_PRIVATE_KEY=0xYourAgentPrivateKey
BASE_AGENT_ADDRESS=0xYourAgentAddress

# SBC Token on Base Mainnet
BASE_SBC_TOKEN_ADDRESS=0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798
BASE_SBC_DECIMALS=18
BASE_PAYMENT_AMOUNT=10000000000000000  # 0.01 SBC

# Set Base as preferred payment method
PREFERRED_NETWORK=base

# Enable real settlement
ENABLE_REAL_SETTLEMENT=true
```

### For Base Sepolia:

```bash
# Base Configuration (Sepolia Testnet)
BASE_CHAIN_ID=84532
BASE_RPC_URL=https://sepolia.base.org

# Base Facilitator Wallet
BASE_FACILITATOR_PRIVATE_KEY=0xYourFacilitatorPrivateKey
BASE_FACILITATOR_ADDRESS=0xYourFacilitatorAddress

# Base AI Agent Wallet
BASE_AGENT_PRIVATE_KEY=0xYourAgentPrivateKey
BASE_AGENT_ADDRESS=0xYourAgentAddress

# SBC Token on Base Sepolia
BASE_SBC_TOKEN_ADDRESS=0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16
BASE_SBC_DECIMALS=6
BASE_PAYMENT_AMOUNT=10000  # 0.01 SBC (6 decimals)

# Set Base as preferred payment method
PREFERRED_NETWORK=base

# Enable real settlement
ENABLE_REAL_SETTLEMENT=true
```

---

## Step 5: One-Time Approval Setup

**⚠️ CRITICAL:** Before making payments, approve the facilitator as a delegate:

```bash
cd packages/ai-agent
npm run approve-base-facilitator
```

This approves the facilitator to execute ERC-20 `transferFrom()` calls on behalf of your agent wallet.

**Architecture:** The facilitator **never holds your funds** - it only executes atomic Agent → Merchant transfers using the approved allowance.

Expected output:
```
✅ APPROVAL SUCCESSFUL
Transaction Hash: 0x...
The facilitator can now execute transfers on your behalf!
```

You can verify the approval on BaseScan by searching for your agent address and checking the ERC-20 approvals.

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
   Radius Testnet Chain ID: 1223953
   Radius Recipient: Not configured
   Base Chain ID: 8453
   Base Facilitator: 0x1234...5678
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
   Base Chain ID: 8453
   Base Payment Amount: 10000000000000000 (0.01 SBC)
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
   Preferred Network: base
   Base Chain ID: 8453
   Base Agent Address: 0x1234...5678

📡 Requesting premium data...
💰 Payment required!

Payment requirements: {
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "maxAmountRequired": "10000000000000000",
      "payTo": "0x...",
      "asset": "0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798",
      "maxTimeoutSeconds": 60
    }
  ]
}

✍️  Creating payment authorization...
   Available payment networks: radius-testnet, base, solana-mainnet-beta
   Using Base payment (preferred) 🔵
   Agent address: 0x1234...5678
   Payment to: 0xabcd...ef01
   Amount: 10000000000000000 (0.01 SBC)
   Deadline: 2024-11-24T20:45:30.000Z
   Signature: 0x1234...abcd
✅ Payment authorized!

📡 Retrying request with payment...

🔍 Verifying payment...
   Scheme: exact
   Network: base
   🔵 Base payment detected
   From: 0x1234...5678
   To: 0xabcd...ef01
   Amount: 10000000000000000
   Deadline: 2024-11-24T20:45:30.000Z
   ✅ Signature valid
   ✅ Deadline valid
   ✅ Amount sufficient
   ✅ Recipient valid
   Sender SBC balance: 100000000000000000 (0.1 SBC)
   ✅ Balance sufficient
✅ Payment verification successful!

💰 Settling payment...
   Scheme: exact
   Network: base
   🔵 Base settlement
   From: 0x1234...5678
   To: 0xabcd...ef01
   Amount: 10000000000000000
   Executing transfer on Base...
   🔥 REAL SETTLEMENT MODE - Executing on-chain ERC-20 transfer
   ⏳ Waiting for confirmation...
   ✅ Real tx hash: 0x9876543210abcdef...
   ✅ Block number: 12345678
   ✅ Gas used: 65000
✅ Settlement complete on Base!

🎉 Success! Received premium data:
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "0x9876543210abcdef...",
  "networkId": "base",
  "message": "Payment successful"
}

🔗 Transaction: https://basescan.org/tx/0x9876543210abcdef...
✅ AI Agent completed successfully!
```

---

## Step 8: Verify on Block Explorer

**Base Mainnet:**
```
https://basescan.org/tx/0xYourTransactionHash
```

**Base Sepolia:**
```
https://sepolia.basescan.org/tx/0xYourTransactionHash
```

You should see:
- ✅ Transaction status: Success
- ✅ From: Agent address
- ✅ To: SBC Token Contract
- ✅ Method: Transfer
- ✅ Token Transfer: 0.01 SBC from Agent → Facilitator

---

## Troubleshooting

### Error: "Insufficient balance"

**Problem:** Agent doesn't have enough SBC tokens

**Solution:**
```bash
# Check balance
ADDRESS=0xYourAgentAddress node check-base-balance.js

# If balance is low, add more SBC tokens
```

### Error: "Transaction reverted"

**Problem:** Could be gas, allowance, or token balance issue

**Check:**
1. Agent has enough ETH for gas (>0.001 ETH)
2. Agent has enough SBC tokens (>0.01 SBC)
3. SBC token contract address is correct
4. Chain ID matches network

**Debug:**
```bash
# Check gas price
cast gas-price --rpc-url https://mainnet.base.org

# Check if ERC-20 transfer would work
cast call $SBC_TOKEN "balanceOf(address)(uint256)" $AGENT_ADDRESS --rpc-url https://mainnet.base.org
```

### Error: "Signature verification failed"

**Problem:** Private key mismatch or wrong chain ID

**Solution:**
1. Verify BASE_AGENT_PRIVATE_KEY matches BASE_AGENT_ADDRESS
2. Verify BASE_CHAIN_ID is correct (8453 for mainnet, 84532 for sepolia)
3. Check that agent is using correct signer

### Error: "Network connection failed"

**Problem:** RPC endpoint down or incorrect

**Solution:**
```bash
# Test RPC endpoint
curl -X POST https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should return: {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

### Error: "Payment amount mismatch"

**Problem:** Decimal mismatch between mainnet (18) and sepolia (6)

**Solution:**
```bash
# Mainnet (18 decimals):
BASE_SBC_DECIMALS=18
BASE_PAYMENT_AMOUNT=10000000000000000  # 0.01 SBC

# Sepolia (6 decimals):
BASE_SBC_DECIMALS=6
BASE_PAYMENT_AMOUNT=10000  # 0.01 SBC
```

---
