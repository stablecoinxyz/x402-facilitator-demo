# x402 Facilitator POC

**SBC's Multi-Chain x402 Payment Facilitator**

Production-ready x402 facilitator supporting both EVM and Solana:

- ✅ Full x402 protocol flow (HTTP 402 Payment Required)
- ✅ **Multi-chain support:** EVM (Radius) + Solana (Mainnet)
- ✅ Custom facilitator infrastructure (not using Coinbase CDP)
- ✅ **Real mainnet payments:** SBC token on Solana
- ✅ AI agent making autonomous payments
- ✅ Sub-2-second payment settlement

## Architecture

```
AI Agent (Multi-Chain) → Premium API (offers both EVM & Solana)
                              ↓
                    Facilitator (/verify + /settle)
                              ↓
              ┌───────────────┴────────────────┐
              ↓                                ↓
    Radius Testnet (EVM)          Solana Mainnet (SBC Token)
```

### Components

1. **Premium API** (`packages/premium-api`) - Express server on port 3000

   - Returns 402 Payment Required with **both** EVM and Solana payment options
   - Verifies and settles payments via facilitator
   - Returns premium content after successful payment

2. **Facilitator** (`packages/facilitator`) - Express server on port 3001

   - `/verify` - Validates payment signatures (EIP-712 for EVM, Ed25519 for Solana)
   - `/settle` - Executes on-chain transfers on both chains
   - Routes by payment scheme (`scheme_exact_evm` or `scheme_exact_solana`)

3. **AI Agent** (`packages/ai-agent`) - TypeScript CLI
   - Intelligently chooses payment method (prefers Solana by default)
   - Creates signed payment authorizations for either chain
   - Completes payment and receives premium data

## Quick Start

Choose your payment chain:
- **EVM (Radius Testnet)** - Test with native USD tokens
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

**For Solana (Mainnet):**
- `SOLANA_RPC_URL` - Solana RPC endpoint (e.g., Helius)
- `FACILITATOR_SOLANA_PRIVATE_KEY` - Facilitator's Solana private key (Base58)
- `FACILITATOR_SOLANA_ADDRESS` - Facilitator's Solana address
- `AI_AGENT_SOLANA_PRIVATE_KEY` - AI agent's Solana private key (Base58)
- `AI_AGENT_SOLANA_ADDRESS` - AI agent's Solana address
- `SBC_TOKEN_ADDRESS` - SBC token mint (default: `DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA`)
- `PREFERRED_PAYMENT_SCHEME` - `'solana'` or `'evm'`

**💡 See [SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md) for detailed Solana setup instructions.**

### 3. Start Services

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

### 4. Expected Output

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
      "scheme": "scheme_exact_evm",
      "network": "1223953",
      "maxAmount": "10000000000000000",
      "recipientAddress": "0x..."
    },
    {
      "scheme": "scheme_exact_solana",
      "network": "solana-mainnet-beta",
      "maxAmount": "50000000",
      "recipientAddress": "<SOLANA_ADDRESS>"
    }
  ]
}

✍️  Creating payment authorization...
   Available payment schemes: scheme_exact_evm, scheme_exact_solana
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
→ { "success": true, "txHash": "0x...", "networkId": "1223953" }
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

### Solana Mainnet

- Network: `mainnet-beta`
- RPC: `https://api.mainnet-beta.solana.com` (or use Helius, QuickNode, etc.)
- Explorer: `https://orb.helius.dev`
- Token: SBC (`DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA`)
- Decimals: 9

## Payment Details

### EVM (Radius Testnet)
- **Scheme:** `scheme_exact_evm`
- **Amount:** 0.01 USD (10000000000000000 wei, 18 decimals)
- **Token:** Native USD on Radius testnet
- **Settlement:** Simulated (testnet)
- **Settlement Time:** <2 seconds

### Solana (Mainnet)
- **Scheme:** `scheme_exact_solana`
- **Amount:** 0.05 SBC (50000000, 9 decimals)
- **Token:** SBC SPL token
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
- Multi-chain support (EVM + Solana)
- Real mainnet payments (SBC on Solana)
- Intelligent payment routing
- Facilitator-sponsored settlements
- Ed25519 + EIP-712 signature verification

### 🚧 Future Enhancements
1. **More Chains** - Base, Polygon, Arbitrum
2. **More Tokens** - USDC, USDT support
3. **Account Abstraction** - Gasless payments for users
4. **Monitoring Dashboard** - Analytics, SLA tracking
5. **Enterprise Features** - Rate limiting, fraud detection, compliance
6. **Batch Payments** - Multiple payments in one transaction

## Documentation

- **[SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md)** - Complete Solana testing guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[TESTING.md](./TESTING.md)** - Testing documentation

## Helper Scripts

- `generate-solana-keypair.js` - Generate Solana wallets
- `check-solana-wallet.js` - Check SOL and SBC balances
- `test-solana-payment.js` - Standalone Solana payment test

## References

- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Coinbase CDP x402 Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [Radius Network Docs](https://docs.radiustech.xyz)
- [Solana Docs](https://docs.solana.com)

## License

MIT
