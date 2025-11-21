/**
 * Test Solana x402 Payment Flow
 *
 * This script tests the complete Solana payment flow:
 * 1. Create payment authorization (sign with Ed25519)
 * 2. Verify payment via facilitator
 * 3. Settle payment via facilitator
 *
 * Usage:
 *   PAYER_PRIVATE_KEY=<base58> node test-solana-payment.js
 */

const { Keypair, PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Configuration
const FACILITATOR_URL = 'http://localhost:3001';
const RECIPIENT_ADDRESS = '2mSjKVjzRGXcipq3DdJCijbepugfNSJCN1yVN2tgdw5K'; // Facilitator's address
const PAYMENT_AMOUNT = '50000000'; // 0.05 SBC (9 decimals)

/**
 * Construct message to be signed
 */
function constructMessage(data) {
  return `from:${data.from}|to:${data.to}|amount:${data.amount}|nonce:${data.nonce}|deadline:${data.deadline}`;
}

/**
 * Create Solana payment authorization
 */
function createPaymentAuthorization(payerKeypair, recipientAddress, amount) {
  const from = payerKeypair.publicKey.toBase58();
  const to = recipientAddress;
  const nonce = Date.now().toString();
  const deadline = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now

  // Construct message
  const message = constructMessage({ from, to, amount, nonce, deadline });
  const messageBytes = Buffer.from(message);

  // Sign with Ed25519
  const signature = nacl.sign.detached(messageBytes, payerKeypair.secretKey);
  const signatureBase58 = bs58.encode(signature);

  // Create payment proof
  const paymentProof = {
    x402Version: 1,
    scheme: 'scheme_exact_solana',
    network: 'solana-mainnet-beta',
    payload: {
      from,
      to,
      amount,
      nonce,
      deadline,
      signature: signatureBase58,
    },
  };

  // Encode as base64
  const paymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString('base64');

  return { paymentHeader, paymentProof };
}

/**
 * Verify payment via facilitator
 */
async function verifyPayment(paymentHeader) {
  const response = await fetch(`${FACILITATOR_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: {
        maxAmount: PAYMENT_AMOUNT,
        recipientAddress: RECIPIENT_ADDRESS,
      },
    }),
  });

  return await response.json();
}

/**
 * Settle payment via facilitator
 */
async function settlePayment(paymentHeader) {
  const response = await fetch(`${FACILITATOR_URL}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: {
        maxAmount: PAYMENT_AMOUNT,
        recipientAddress: RECIPIENT_ADDRESS,
      },
    }),
  });

  return await response.json();
}

/**
 * Main test flow
 */
async function testSolanaPayment() {
  console.log('\n🧪 Testing Solana x402 Payment Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Create payer keypair (from env or generate)
  let payerKeypair;
  if (process.env.PAYER_PRIVATE_KEY) {
    const secretKey = bs58.decode(process.env.PAYER_PRIVATE_KEY);
    payerKeypair = Keypair.fromSecretKey(secretKey);
    console.log('\n📍 Using payer from PAYER_PRIVATE_KEY env var');
  } else {
    payerKeypair = Keypair.generate();
    console.log('\n📍 Generated new payer keypair (no PAYER_PRIVATE_KEY set)');
    console.log('   ⚠️  This wallet has no SOL or SBC! Test will likely fail.');
  }

  console.log(`   Payer: ${payerKeypair.publicKey.toBase58()}`);
  console.log(`   Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`   Amount: ${PAYMENT_AMOUNT} (${Number(PAYMENT_AMOUNT) / 1e9} SBC)`);

  // 2. Create payment authorization
  console.log('\n✍️  Creating payment authorization...');
  const { paymentHeader, paymentProof } = createPaymentAuthorization(
    payerKeypair,
    RECIPIENT_ADDRESS,
    PAYMENT_AMOUNT
  );

  console.log('   ✅ Payment signed with Ed25519');
  console.log(`   Signature: ${paymentProof.payload.signature.substring(0, 20)}...`);

  // 3. Verify payment
  console.log('\n🔍 Verifying payment...');
  const verifyResult = await verifyPayment(paymentHeader);

  if (verifyResult.isValid) {
    console.log('   ✅ Payment verified!');
  } else {
    console.log(`   ❌ Verification failed: ${verifyResult.invalidReason}`);
    console.log('\n❌ Test failed at verification step\n');
    return;
  }

  // 4. Settle payment
  console.log('\n💰 Settling payment...');
  const settleResult = await settlePayment(paymentHeader);

  if (settleResult.success) {
    console.log('   ✅ Payment settled!');
    console.log(`   Transaction: ${settleResult.txHash}`);
    console.log(`   Network: ${settleResult.networkId}`);
    if (settleResult.txHash && !settleResult.txHash.includes('0000')) {
      console.log(`   🔗 Explorer: https://orb.helius.dev/tx/${settleResult.txHash}?cluster=mainnet-beta&tab=summary`);
    }
  } else {
    console.log(`   ❌ Settlement failed: ${settleResult.error}`);
    console.log('\n❌ Test failed at settlement step\n');
    return;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Solana x402 Payment Test Complete!\n');
}

// Run test
testSolanaPayment().catch(console.error);
