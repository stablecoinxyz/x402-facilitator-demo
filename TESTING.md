# Testing Guide - x402 Facilitator POC

## Quick Test Commands

### 1. Test Free Endpoint (No Payment)

```bash
curl http://localhost:3000/free-data
```

Expected response:
```json
{
  "data": "This is free data available to everyone!",
  "tier": "free"
}
```

### 2. Test Premium Endpoint Without Payment

```bash
curl -i http://localhost:3000/premium-data
```

Expected response:
```
HTTP/1.1 402 Payment Required

{
  "x402Version": 1,
  "accepts": [{
    "scheme": "scheme_exact_evm",
    "network": "1223953",
    "maxAmount": "10000000000000000",
    "recipientAddress": "0x...",
    "assetContract": "0x0000000000000000000000000000000000000000",
    "timeout": 60
  }],
  "error": "Payment required to access premium data"
}
```

### 3. Test Facilitator Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "SBC x402 Facilitator"
}
```

## Manual Testing Workflow

### Step 1: Verify Wallets Have Funds

```bash
# Set your API key
export RADIUS_RPC="https://rpc.testnet.radiustech.xyz/YOUR_API_KEY"

# Check facilitator balance
curl "$RADIUS_RPC" \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{
    "method": "eth_getBalance",
    "params": ["YOUR_FACILITATOR_ADDRESS", "latest"],
    "id": 1,
    "jsonrpc": "2.0"
  }' | jq

# Check agent balance
curl "$RADIUS_RPC" \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{
    "method": "eth_getBalance",
    "params": ["YOUR_AGENT_ADDRESS", "latest"],
    "id": 1,
    "jsonrpc": "2.0"
  }' | jq
```

Convert wei to USD:
- Result: `0x16345785d8a0000` = 100000000000000000 wei = 0.1 USD
- Result: `0x2386f26fc10000` = 10000000000000000 wei = 0.01 USD

### Step 2: Test Payment Verification (Direct API Call)

First, get the payment requirements:

```bash
curl -i http://localhost:3000/premium-data
```

Copy the response, then manually test the facilitator `/verify` endpoint:

```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "x402Version": 1,
    "paymentHeader": "BASE64_ENCODED_PAYMENT",
    "paymentRequirements": {
      "scheme": "scheme_exact_evm",
      "network": "1223953",
      "maxAmount": "10000000000000000",
      "recipientAddress": "YOUR_RECIPIENT_ADDRESS",
      "assetContract": "0x0000000000000000000000000000000000000000",
      "timeout": 60
    }
  }'
```

(Note: You'll need to generate a valid EIP-712 signature for this - easier to use the AI agent)

### Step 3: Run Full Flow with AI Agent

```bash
cd packages/ai-agent
npm run start
```

Watch the console output in all three terminals:
1. **Facilitator** - Should log verification and settlement
2. **Premium API** - Should log 402 then 200 response
3. **AI Agent** - Should log complete payment flow

## Test Scenarios

### Scenario 1a: Successful Payment (Simulated Settlement - Default)

**Setup:**
- `ENABLE_REAL_SETTLEMENT=false` in .env (or omitted)
- Both services running
- Valid .env configuration
- No wallet funding required

**Run:**
```bash
cd packages/ai-agent && npm run start
```

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates payment authorization
- ✅ Facilitator verifies EIP-712 signature
- ✅ Facilitator simulates settlement (fake tx hash)
- ✅ Agent receives premium data
- ✅ Console shows "SIMULATED MODE" message

### Scenario 1b: Successful Payment (Real Settlement on Radius)

**Setup:**
- `ENABLE_REAL_SETTLEMENT=true` in .env
- Facilitator wallet funded with testnet USD
- Both services running
- Valid .env configuration

**Run:**
```bash
cd packages/ai-agent && npm run start
```

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates payment authorization
- ✅ Facilitator verifies EIP-712 signature
- ✅ Facilitator executes REAL on-chain transfer
- ✅ Real transaction hash returned
- ✅ Transaction visible on https://testnet.radius.xyz
- ✅ Agent receives premium data
- ✅ Console shows "REAL SETTLEMENT MODE" with block number and gas used

### Scenario 2: Insufficient Balance

**Setup:**
- Empty AI agent wallet

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates signature
- ❌ Facilitator rejects: "Insufficient balance"
- ❌ Agent fails to get premium data

### Scenario 3: Expired Payment

**Setup:**
- Set `PAYMENT_TIMEOUT=1` in .env
- Wait 2 seconds before retry

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates signature
- ❌ Facilitator rejects: "Payment expired"
- ❌ Agent fails to get premium data

### Scenario 4: Invalid Signature

**Setup:**
- Modify the signature in x402-client.ts (corrupt it)

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates corrupted signature
- ❌ Facilitator rejects: "Invalid signature"
- ❌ Agent fails to get premium data

### Scenario 5: Wrong Recipient

**Setup:**
- Modify recipient address in payment message

**Expected:**
- ✅ Agent receives 402
- ✅ Agent creates signature with wrong recipient
- ❌ Facilitator rejects: "Invalid recipient"
- ❌ Agent fails to get premium data

## Automated Test Suite

### Create a test file:

```typescript
// packages/facilitator/src/test/verify.test.ts
import { createPaymentAuthorization } from '../../ai-agent/src/x402-client';

describe('Facilitator Verification', () => {
  test('Valid payment should pass', async () => {
    // Implementation
  });

  test('Expired payment should fail', async () => {
    // Implementation
  });

  test('Insufficient amount should fail', async () => {
    // Implementation
  });

  test('Invalid signature should fail', async () => {
    // Implementation
  });

  test('Wrong recipient should fail', async () => {
    // Implementation
  });
});
```

## Performance Testing

### Test Settlement Speed

Run the agent multiple times and measure:

```bash
for i in {1..5}; do
  echo "Run $i:"
  time npm run start
  echo ""
done
```

**Target:** <2 seconds total for full payment flow

### Test Concurrent Payments

Run multiple agents simultaneously:

```bash
# Terminal 1
cd packages/ai-agent && npm run start &

# Terminal 2
cd packages/ai-agent && npm run start &

# Terminal 3
cd packages/ai-agent && npm run start &
```

**Expected:** All payments processed successfully

## Debugging

### Enable Verbose Logging

Add to each server's config:

```typescript
// facilitator/src/config.ts
export const config = {
  // ...
  logLevel: 'debug',
};
```

### Check Radius Testnet Status

```bash
curl https://rpc.testnet.radiustech.xyz/YOUR_API_KEY \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}'
```

Should return current block number.

### Inspect Payment Header

```bash
# In agent.ts, log the payment header before sending:
console.log('Payment Header:', xPaymentHeader);

# Decode it:
echo "BASE64_STRING" | base64 -d | jq
```

### Monitor Network Traffic

```bash
# In facilitator terminal:
npm install -g tcpdump
sudo tcpdump -i lo0 port 3001 -A
```

## Validation Checklist

Before marking the POC as complete, verify:

- [ ] Both services start without errors
- [ ] Agent can access free endpoint
- [ ] Agent receives 402 for premium endpoint
- [ ] Agent creates valid EIP-712 signature
- [ ] Facilitator verifies signature correctly
- [ ] Facilitator checks balance on Radius testnet
- [ ] Facilitator simulates settlement (or executes real settlement)
- [ ] Premium API returns data after payment
- [ ] All error cases handled gracefully
- [ ] Console output is clear and helpful
- [ ] Transaction visible on Radius explorer (if real settlement)

## Next Steps After Testing

1. **Add Real Settlement** - Implement actual on-chain transfers
2. **Add Database** - Store payment records
3. **Add Monitoring** - Track success rate, latency
4. **Add Rate Limiting** - Prevent abuse
5. **Add Authentication** - API keys for merchants
6. **Deploy to Production** - Radius mainnet + Base mainnet

## Common Issues

### "Connection refused" on localhost

**Solution:** Make sure both servers are running

### "Invalid signature"

**Solution:** Check that chainId matches (1223953) in all files

### "Insufficient balance"

**Solution:** Fund wallet from https://faucet.radius.xyz

### "Payment expired"

**Solution:** Increase `PAYMENT_TIMEOUT` or reduce latency

### "Module not found"

**Solution:** Run `npm install` in each package directory

## Success Criteria

The POC is successful when:

1. ✅ AI agent autonomously makes payment
2. ✅ Facilitator verifies EIP-712 signature
3. ✅ Facilitator checks on-chain balance
4. ✅ Payment flow completes in <2 seconds
5. ✅ Premium data returned to agent
6. ✅ All components log clearly
7. ✅ Code follows x402 protocol spec
8. ✅ Ready to demo to CEO/CTO

## Demo Preparation

For the CEO demo:

1. **Pre-fund wallets** - Ensure smooth execution
2. **Test run** - Run the demo 3 times successfully
3. **Prepare slides** - Explain architecture
4. **Have backup** - Record video in case of issues
5. **Show logs** - Display all 3 terminals
6. **Explain flow** - Narrate each step
7. **Show transaction** - Open Radius explorer
8. **Discuss next steps** - Production roadmap

---

**Ready to test?** Start with the Quick Test Commands above!
