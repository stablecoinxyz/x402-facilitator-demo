# x402 Facilitator POC

**SBC's Multi-Chain x402 Payment Facilitator**

Production-ready x402 facilitator supporting EVM, Base, and Solana:

- ✅ Full x402 protocol flow (HTTP 402 Payment Required)
- ✅ **Multi-chain support:** EVM (Radius) + Base (Mainnet/Sepolia) + Solana (Mainnet)
- ✅ Custom facilitator infrastructure (not using Coinbase CDP)
- ✅ **Real mainnet payments:** SBC token on Base and Solana
- ✅ AI agent making autonomous payments
- ✅ Sub-2-second payment settlement

## Quick Start 🚀 Get started in 5 minutes!

Choose your payment chain:
- **EVM (Radius Testnet)** - Test with native USD tokens
- **Base (Mainnet or Sepolia)** - Production-ready with SBC token (18 decimals on mainnet, 6 on sepolia)
- **Solana (Mainnet)** - Production-ready with real SBC tokens

### 1. Install Dependencies

```bash
npm install
cd packages/facilitator && npm install && cd ../..
cd packages/premium-api && npm install && cd ../..
cd packages/ai-agent && npm install && cd ../..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**For EVM (Radius Testnet):**
- `RADIUS_TESTNET_RPC_URL` - Get API key from <https://radiustech.xyz>
- `FACILITATOR_WALLET_PRIVATE_KEY` - Facilitator's EVM private key
- `RECIPIENT_ADDRESS` - Facilitator's EVM address
- `AI_AGENT_PRIVATE_KEY` - AI agent's EVM private key
- Get testnet USD: https://testnet.radiustech.xyz/testnet/faucet

**For Base (Mainnet or Sepolia):**
- `BASE_RPC_URL` - Base RPC endpoint (mainnet: `https://mainnet.base.org`, sepolia: `https://sepolia.base.org`)
- `BASE_CHAIN_ID` - Chain ID (`8453` for mainnet, `84532` for sepolia)
- `BASE_FACILITATOR_PRIVATE_KEY` - Facilitator's Base private key
- `BASE_FACILITATOR_ADDRESS` - Facilitator's Base address
- `BASE_AGENT_PRIVATE_KEY` - AI agent's Base private key
- `BASE_AGENT_ADDRESS` - AI agent's Base address
- `BASE_SBC_TOKEN_ADDRESS` - SBC token address
  - Mainnet: `0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798` (18 decimals)
  - Sepolia: `0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16` (6 decimals)
- `BASE_SBC_DECIMALS` - Token decimals (`18` for mainnet, `6` for sepolia)
- `BASE_PAYMENT_AMOUNT` - Payment amount (default: `10000000000000000` = 0.01 SBC for mainnet)

**For Solana (Mainnet):**
- `SOLANA_RPC_URL` - Solana RPC endpoint (e.g., Helius)
- `FACILITATOR_SOLANA_PRIVATE_KEY` - Facilitator's Solana private key (Base58)
- `FACILITATOR_SOLANA_ADDRESS` - Facilitator's Solana address
- `AI_AGENT_SOLANA_PRIVATE_KEY` - AI agent's Solana private key (Base58)
- `AI_AGENT_SOLANA_ADDRESS` - AI agent's Solana address
- `SBC_TOKEN_ADDRESS` - SBC token mint (default: `DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA`)
- `PREFERRED_NETWORK` - `'radius-testnet'`, `'base'`, `'base-sepolia'`, or `'solana-mainnet-beta'`

**💡 See [RADIUS_TEST_GUIDE.md](./RADIUS_TEST_GUIDE.md) for detailed Radius setup instructions.**
**💡 See [BASE_TEST_GUIDE.md](./BASE_TEST_GUIDE.md) for detailed Base setup instructions.**
**💡 See [SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md) for detailed Solana setup instructions.**

### 3. One-Time Approval Setup (Base & Solana Only)

**⚠️ IMPORTANT:** Before making payments on Base or Solana, you must approve the facilitator as a delegate:

**For Base:**
```bash
cd packages/ai-agent
npm run approve-base-facilitator
```

**For Solana:**
```bash
cd packages/ai-agent
npm run approve-solana-facilitator
```

This allows the facilitator to execute token transfers on behalf of your agent wallet. The facilitator **never holds your funds** - it only executes atomic transfers from Agent → Merchant.

**Note:** Radius (EVM) does not require approval setup.

### 4. Start Services

**Terminal 1 - Facilitator:**

```bash
cd packages/facilitator
npm run dev
```

**Terminal 2 - Premium API:**

```bash
cd packages/premium-api
npm run dev
```

**Terminal 3 - Run AI Agent:**

```bash
cd packages/ai-agent
npm run start
```

### 5. Expected Output

```
🤖 AI Agent starting...
✅ AI Agent configuration loaded
   Preferred Scheme: solana
   Solana Agent Address: <YOUR_ADDRESS>

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
    },
    {
      "scheme": "exact",
      "network": "base",
      "maxAmountRequired": "10000000000000000",
      "payTo": "0x...",
      "asset": "0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798",
      "maxTimeoutSeconds": 60
    },
    {
      "scheme": "exact",
      "network": "solana-mainnet-beta",
      "maxAmountRequired": "50000000",
      "payTo": "<SOLANA_ADDRESS>",
      "asset": "DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA",
      "maxTimeoutSeconds": 60
    }
  ]
}

✍️  Creating payment authorization...
   Available payment networks: radius-testnet, base, solana-mainnet-beta
   Using Solana payment (preferred) 🟣
✅ Payment authorized!

📡 Retrying request with payment...

🎉 Success! Received premium data:
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "<TX_SIGNATURE>",
  "networkId": "solana-mainnet-beta",
  "message": "Payment successful"
}

🔗 Transaction: https://orb.helius.dev/tx/<TX_SIGNATURE>?cluster=mainnet-beta&tab=summary
```

## Payment Flow

### Step 1: Agent Requests Data (No Payment)

```bash
GET /premium-data
→ 402 Payment Required
```

### Step 2: Agent Creates Payment Authorization

**For EVM (Radius):**
```typescript
// EIP-712 signature
const signature = await wallet.signTypedData({
  domain: { name: 'SBC x402 Facilitator', version: '1', chainId: 1223953 },
  types: { Payment: [...] },
  message: { from, to, amount, nonce, deadline }
});
```

**For Solana:**
```typescript
// Ed25519 signature
const message = `from:${from}|to:${to}|amount:${amount}|nonce:${nonce}|deadline:${deadline}`;
const signature = nacl.sign.detached(Buffer.from(message), keypair.secretKey);
```

### Step 3: Agent Retries with X-PAYMENT Header

```bash
GET /premium-data
X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi...
```

### Step 4: Premium API Calls Facilitator /verify

```bash
POST http://localhost:3001/verify
→ { "isValid": true }
```

### Step 5: Premium API Calls Facilitator /settle

```bash
POST http://localhost:3001/settle
→ { "success": true, "payer": "0x...", "transaction": "0x...", "network": "radius-testnet" }
```

### Step 6: Agent Receives Premium Data

```json
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "0x...",
  "message": "Payment successful"
}
```

## Network Configuration

### Radius Testnet (EVM)

- Chain ID: `1223953`
- RPC: `https://rpc.testnet.radiustech.xyz/<api-key>`
- Explorer: `https://testnet.radiustech.xyz/testnet/explorer`
- Native Currency: USD (18 decimals)
- Faucet: `https://testnet.radiustech.xyz/testnet/faucet`

### Base Mainnet

- Chain ID: `8453`
- RPC: `https://mainnet.base.org` (or use Alchemy, QuickNode, etc.)
- Explorer: `https://basescan.org`
- Native Currency: ETH (18 decimals)
- Token: SBC (`0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798`)
- Decimals: 18

### Base Sepolia

- Chain ID: `84532`
- RPC: `https://sepolia.base.org`
- Explorer: `https://sepolia.basescan.org`
- Native Currency: ETH (18 decimals)
- Token: SBC (`0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16`)
- Decimals: 6

### Solana Mainnet

- Network: `mainnet-beta`
- RPC: `https://api.mainnet-beta.solana.com` (or use Helius, QuickNode, etc.)
- Explorer: `https://orb.helius.dev`
- Token: SBC (`DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA`)
- Decimals: 9

## Payment Details

All payment methods use the x402 `exact` scheme with network-based routing.

### Radius Testnet
- **Scheme:** `exact`
- **Network:** `radius-testnet`
- **Amount:** 0.01 USD (10000000000000000 wei, 18 decimals)
- **Token:** Native USD on Radius testnet
- **Settlement:** Simulated (testnet)
- **Settlement Time:** <2 seconds

### Base Mainnet
- **Scheme:** `exact`
- **Network:** `base`
- **Amount:** 0.01 SBC (10000000000000000, 18 decimals)
- **Token:** SBC ERC-20 token (`0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798`)
- **Settlement:** Real on-chain ERC-20 transfers 💰
- **Settlement Time:** <2 seconds

### Base Sepolia
- **Scheme:** `exact`
- **Network:** `base-sepolia`
- **Amount:** 0.01 SBC (10000, 6 decimals)
- **Token:** SBC ERC-20 token (`0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16`)
- **Settlement:** Real on-chain ERC-20 transfers 💰
- **Settlement Time:** <2 seconds

### Solana Mainnet
- **Scheme:** `exact`
- **Network:** `solana-mainnet-beta`
- **Amount:** 0.05 SBC (50000000, 9 decimals)
- **Token:** SBC SPL token (`DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA`)
- **Settlement:** Real on-chain transfers 💰
- **Settlement Time:** <2 seconds

## Project Structure

```
x402-poc/
├── packages/
│   ├── facilitator/       # x402 facilitator (verify + settle)
│   ├── premium-api/       # API requiring payment
│   └── ai-agent/          # Autonomous payment client
├── shared/
│   └── types.ts           # Shared TypeScript types
├── .env.example
├── package.json
└── README.md
```

## Features & Roadmap

### ✅ Production-Ready
- **x402 spec-compliant** - Uses official `exact` scheme with `network` routing
- Multi-chain support (EVM + Base + Solana)
- Real mainnet payments (SBC on Base and Solana)
- Intelligent payment routing
- **Delegated transfers (non-custodial)** - Facilitator never holds customer funds
- Ed25519 + EIP-712 signature verification
- Support for both Base Mainnet and Sepolia testnet

### 🚧 Future Enhancements
1. **More Chains** - Polygon, Arbitrum, Optimism
2. **More Tokens** - USDC, USDT support, native ETH payments
3. **Gasless Transfers** - Implement EIP-2612 permit() for gasless SBC transfers on Base
4. **Account Abstraction** - Gasless payments for users
5. **Monitoring Dashboard** - Analytics, SLA tracking
6. **Enterprise Features** - Rate limiting, fraud detection, compliance
7. **Batch Payments** - Multiple payments in one transaction

## Documentation

- **[RADIUS_TEST_GUIDE.md](./RADIUS_TEST_GUIDE.md)** - Complete Radius testnet testing guide
- **[BASE_TEST_GUIDE.md](./BASE_TEST_GUIDE.md)** - Complete Base testing guide (Mainnet & Sepolia)
- **[SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md)** - Complete Solana testing guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
