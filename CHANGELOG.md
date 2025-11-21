# Changelog

All notable changes to the x402 Facilitator project.

---

## [2.0.0] - 2024-11-21

### 🎉 Major Release: Multi-Chain Support

Complete Solana integration enabling production-ready payments with SBC tokens on Solana mainnet.

### ✅ Added

#### Solana Payment Support
- **Facilitator**
  - `packages/facilitator/src/solana/verify.ts` - Ed25519 signature verification
  - `packages/facilitator/src/solana/settle.ts` - SPL token transfer (facilitator-sponsored)
  - Multi-chain routing in `verify.ts` and `settle.ts` based on payment scheme
  - Solana configuration in `config.ts`

- **Premium API**
  - Returns both `scheme_exact_evm` and `scheme_exact_solana` in 402 response
  - Intelligent routing to facilitator based on payment scheme
  - Solana payment requirements (amount: 0.05 SBC, 9 decimals)

- **AI Agent**
  - `packages/ai-agent/src/solana-client.ts` - Solana payment authorization
  - Intelligent payment method selection (prefers Solana by default)
  - Automatic scheme detection and routing
  - Multi-chain configuration support

#### Helper Scripts
- `generate-solana-keypair.js` - Generate Solana wallets (Base58 format)
- `check-solana-wallet.js` - Check SOL and SBC token balances
- `test-solana-payment.js` - Standalone Solana payment flow test

#### Documentation
- **[SOLANA_TEST_GUIDE.md](./SOLANA_TEST_GUIDE.md)** - Complete Solana testing guide
- **[MULTI_CHAIN_ARCHITECTURE.md](./MULTI_CHAIN_ARCHITECTURE.md)** - Multi-chain architecture
- **[EXPLORER_URLS.md](./EXPLORER_URLS.md)** - Explorer URL reference
- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Complete documentation index
- **[CHANGELOG.md](./CHANGELOG.md)** - This file

#### Dependencies
- `@solana/web3.js@1.95.2` - Solana client library
- `@solana/spl-token@0.4.8` - SPL token operations
- `tweetnacl@1.0.3` - Ed25519 signature verification
- `bs58@5.0.0` - Base58 encoding/decoding

#### Environment Variables
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `FACILITATOR_SOLANA_PRIVATE_KEY` - Facilitator's Solana private key (Base58)
- `FACILITATOR_SOLANA_ADDRESS` - Facilitator's Solana address
- `AI_AGENT_SOLANA_PRIVATE_KEY` - Agent's Solana private key (Base58)
- `AI_AGENT_SOLANA_ADDRESS` - Agent's Solana address
- `SBC_TOKEN_ADDRESS` - SBC token mint address
- `SOLANA_PAYMENT_AMOUNT` - Payment amount in base units (9 decimals)
- `PREFERRED_PAYMENT_SCHEME` - Agent's preferred payment method ('evm' or 'solana')

### 🔄 Changed

#### Explorer URLs
- **Solana:** Updated from Solscan to Helius Orb Explorer
  - Format: `https://orb.helius.dev/tx/{TX_SIGNATURE}?cluster=mainnet-beta&tab=summary`
  - Reason: Better integration with Helius RPC, superior UX

- **Updated in:**
  - `packages/ai-agent/src/agent.ts` - Transaction link display
  - `packages/facilitator/src/solana/settle.ts` - Console logging
  - `test-solana-payment.js` - Test script output
  - All documentation files

#### Configuration
- `.env.example` - Added Solana configuration section
- `packages/facilitator/src/config.ts` - Multi-chain configuration
- `packages/premium-api/src/config.ts` - Multi-chain configuration
- `packages/ai-agent/src/config.ts` - Multi-chain configuration

#### Documentation
- **README.md** - Updated with multi-chain support
- **ARCHITECTURE.md** - Extension points updated to reflect Solana implementation

### 🎯 Features

#### Production-Ready Features
- ✅ Real mainnet SBC token transfers on Solana
- ✅ Facilitator-sponsored settlement (no user token delegation needed)
- ✅ Intelligent payment method selection (configurable preference)
- ✅ Multi-chain payment routing
- ✅ Ed25519 + EIP-712 signature verification
- ✅ Sub-2-second settlement on both chains

#### Developer Experience
- ✅ Helper scripts for wallet generation and balance checking
- ✅ Comprehensive testing guide
- ✅ Complete multi-chain architecture documentation
- ✅ Environment configuration examples
- ✅ Troubleshooting guides

### 📊 Metrics

#### Supported Networks
- **Before:** 1 network (Radius testnet)
- **After:** 2 networks (Radius testnet + Solana mainnet)

#### Payment Schemes
- **Before:** `scheme_exact_evm` only
- **After:** `scheme_exact_evm` + `scheme_exact_solana`

#### Settlement
- **Before:** Simulated (testnet only)
- **After:** Real on-chain transfers (Solana mainnet) 💰

### 🔒 Security

#### Signature Verification
- EVM: EIP-712 typed data signatures (existing)
- Solana: Ed25519 signature verification (new)

#### Balance Checks
- EVM: Native token balance via RPC
- Solana: SPL token balance via `getTokenAccountBalance`

#### Key Management
- Separate keys for EVM and Solana
- Base58 format for Solana keys
- Environment variable storage

### 🐛 Fixes

#### TypeScript Compilation
- Fixed `@solana/web3.js` version conflicts in monorepo
- Resolved hoisting issues with npm workspaces
- Updated to use `getTokenAccountBalance` instead of `getAccount` to avoid type conflicts

### 🚀 Performance

#### Verification Time
- EVM: ~100ms (unchanged)
- Solana: ~150ms (new)

#### Settlement Time
- EVM: <500ms simulated (unchanged)
- Solana: <2s real on-chain (new)

#### Throughput
- Current: ~10 payments/second (both chains)
- Target: 1000+ payments/second (with horizontal scaling)

---

## [1.0.0] - 2024-11-18

### Initial Release

#### Features
- ✅ Complete x402 protocol implementation
- ✅ EVM support (Radius testnet)
- ✅ EIP-712 signature verification
- ✅ Facilitator infrastructure (/verify + /settle)
- ✅ Premium API with 402 responses
- ✅ AI agent with autonomous payments
- ✅ Native USD token support (18 decimals)

#### Components
- Facilitator package
- Premium API package
- AI Agent package
- Shared types

#### Documentation
- README.md
- ARCHITECTURE.md
- QUICKSTART.md
- TESTING.md

---

## Roadmap

### v2.1.0 (Planned)
- [ ] Base mainnet support
- [ ] USDC token support (Solana + EVM)
- [ ] Payment history database
- [ ] Analytics dashboard

### v2.2.0 (Planned)
- [ ] Account Abstraction (ERC-4337)
- [ ] Session keys for recurring payments
- [ ] Gasless transactions
- [ ] Webhook notifications

### v3.0.0 (Future)
- [ ] Multi-chain routing optimization
- [ ] Cross-chain swaps
- [ ] Advanced fraud detection
- [ ] Enterprise SLA features

---

## Migration Guide

### Upgrading from v1.0.0 to v2.0.0

#### Breaking Changes
None! Solana support is additive. Existing EVM functionality unchanged.

#### Optional Changes

1. **Add Solana Configuration** (optional)
   ```bash
   # .env
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   FACILITATOR_SOLANA_PRIVATE_KEY=<base58_key>
   FACILITATOR_SOLANA_ADDRESS=<address>
   AI_AGENT_SOLANA_PRIVATE_KEY=<base58_key>
   AI_AGENT_SOLANA_ADDRESS=<address>
   SBC_TOKEN_ADDRESS=DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA
   PREFERRED_PAYMENT_SCHEME='solana'
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd packages/facilitator && npm install
   cd packages/ai-agent && npm install
   ```

3. **Generate Solana Wallets** (if using Solana)
   ```bash
   node generate-solana-keypair.js
   ```

4. **Fund Wallets** (if using Solana)
   - Send SOL for gas fees
   - Send SBC for test payments

5. **Test**
   ```bash
   cd packages/facilitator && npm run dev  # Terminal 1
   cd packages/premium-api && npm run dev  # Terminal 2
   cd packages/ai-agent && npm run start   # Terminal 3
   ```

---
