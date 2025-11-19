# x402 Facilitator POC

**SBC's x402 Payment Facilitator on Radius Testnet**

This is a proof-of-concept implementation demonstrating:
- ✅ Full x402 protocol flow (HTTP 402 Payment Required)
- ✅ Custom facilitator infrastructure (not using Coinbase CDP)
- ✅ Radius testnet settlement (2.5M+ TPS capability)
- ✅ AI agent making autonomous payments
- ✅ Sub-2-second payment settlement

## Architecture

```
AI Agent → Premium API (402) → Facilitator (/verify + /settle) → Radius Testnet
```

### Components

1. **Premium API** (`packages/premium-api`) - Express server on port 3000
   - Returns 402 Payment Required for `/premium-data` endpoint
   - Verifies and settles payments via facilitator
   - Returns premium content after successful payment

2. **Facilitator** (`packages/facilitator`) - Express server on port 3001
   - `/verify` - Validates EIP-712 payment signatures
   - `/settle` - Executes on-chain transfers on Radius testnet
   - Implements x402 facilitator protocol

3. **AI Agent** (`packages/ai-agent`) - TypeScript CLI
   - Requests premium API access
   - Creates EIP-712 signed payment authorization
   - Completes payment and receives premium data

## Quick Start

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

Required environment variables:
- `RADIUS_TESTNET_RPC_URL` - Get API key from https://radius.xyz
- `FACILITATOR_WALLET_PRIVATE_KEY` - Facilitator's private key (needs testnet USD)
- `RECIPIENT_ADDRESS` - Facilitator's wallet address (receives payments)
- `AI_AGENT_PRIVATE_KEY` - AI agent's private key (needs testnet USD for payments)

**Get testnet USD:** https://faucet.radius.xyz

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

📡 Requesting premium data...
💰 Payment required!

Payment requirements: {
  "x402Version": 1,
  "accepts": [{
    "scheme": "scheme_exact_evm",
    "network": "1223953",
    "maxAmount": "10000000000000000",
    "recipientAddress": "0x..."
  }]
}

✍️  Creating payment authorization...
✅ Payment authorized!

📡 Retrying request with payment...

🎉 Success! Received premium data:
{
  "data": "This is premium data from the API!",
  "paymentTxHash": "0x...",
  "message": "Payment successful"
}

🔗 Transaction: https://testnet.radius.xyz/tx/0x...
```

## Payment Flow

### Step 1: Agent Requests Data (No Payment)
```bash
GET /premium-data
→ 402 Payment Required
```

### Step 2: Agent Creates Payment Authorization
```typescript
// EIP-712 signature
const signature = await wallet.signTypedData({
  domain: { name: 'SBC x402 Facilitator', version: '1', chainId: 1223953 },
  types: { Payment: [...] },
  message: { from, to, amount, nonce, deadline }
});
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

**Radius Testnet:**
- Chain ID: `1223953`
- RPC: `https://rpc.testnet.radiustech.xyz/<api-key>`
- Explorer: `https://testnet.radius.xyz`
- Native Currency: USD (18 decimals)
- Faucet: `https://faucet.radius.xyz`

## Payment Details

- **Amount:** 0.01 USD (10000000000000000 wei)
- **Token:** Native USD on Radius testnet
- **Settlement Time:** <2 seconds
- **Protocol:** x402 v1 with `scheme_exact_evm`

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

## Next Steps (Production)

1. **Deploy SBC Token to Radius** - Use SBC instead of native USD
2. **Add Base Sepolia Settlement** - Cross-chain routing
3. **Implement Account Abstraction** - Gasless payments for users
4. **Add Multi-Chain Support** - Solana, Polygon, etc.
5. **Build Monitoring Dashboard** - Analytics, SLA tracking
6. **Enterprise Features** - Rate limiting, fraud detection, compliance

## References

- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Coinbase CDP x402 Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [Radius Network Docs](https://docs.radiustech.xyz)
- [SBC Strategy Doc](../../Projects/SBC/x402-radius-strategy.md)

## License

MIT
