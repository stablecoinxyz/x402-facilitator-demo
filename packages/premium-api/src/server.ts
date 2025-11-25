import express from 'express';
import cors from 'cors';
import { config } from './config';
import {
  createPaymentRequirement,
  verifyWithFacilitator,
  settleWithFacilitator,
} from './middleware/x402';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'premium-api' });
});

// Free endpoint (no payment required)
app.get('/free-data', (req, res) => {
  res.json({
    data: 'This is free data available to everyone!',
    tier: 'free',
  });
});

// Premium endpoint (x402 payment required)
app.get('/premium-data', async (req, res) => {
  const xPayment = req.headers['x-payment'] as string | undefined;

  console.log('\n📡 Premium data request received');

  // If no payment header, return 402 Payment Required
  if (!xPayment) {
    const paymentReq = createPaymentRequirement();
    console.log('   ❌ No payment provided');
    console.log('   → Returning 402 Payment Required\n');

    return res.status(402).json(paymentReq);
  }

  console.log('   ✅ Payment header present');
  console.log('   → Verifying with facilitator...');

  try {
    const paymentRequirements = createPaymentRequirement();

    // Verify payment with facilitator
    const verifyResult = await verifyWithFacilitator(xPayment, paymentRequirements);

    if (!verifyResult.isValid) {
      console.log('   ❌ Payment invalid:', verifyResult.invalidReason);
      return res.status(402).json({
        error: 'Invalid payment',
        reason: verifyResult.invalidReason,
      });
    }

    console.log('   ✅ Payment verified');
    console.log('   → Settling payment...');

    // Settle payment
    const settleResult = await settleWithFacilitator(xPayment, paymentRequirements);

    if (!settleResult.success) {
      console.log('   ❌ Settlement failed:', settleResult.errorReason);
      return res.status(500).json({
        error: 'Settlement failed',
        reason: settleResult.errorReason,
      });
    }

    console.log('   ✅ Payment settled');
    console.log('   📝 Tx Hash:', settleResult.transaction);
    console.log('   → Returning premium data\n');

    // Payment successful, return premium data
    res.json({
      data: 'This is PREMIUM data only available after payment! 💎',
      tier: 'premium',
      features: [
        'Advanced analytics',
        'Real-time data updates',
        'Priority support',
        'API rate limit: 1000 req/min',
      ],
      paymentTxHash: settleResult.transaction,
      networkId: settleResult.network,
      message: 'Payment successful - thank you!',
    });
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Start server
app.listen(config.port, () => {
  console.log('\n🌟 Premium API with x402 Payments');
  console.log('==================================');
  console.log(`✅ Server running on port ${config.port}`);
  console.log(`✅ Facilitator: ${config.facilitatorUrl}`);
  console.log(`✅ Payment: ${(Number(config.paymentAmount) / 10 ** 18).toFixed(2)} (${config.paymentAmount}) USD per request`);
  console.log('\n📡 Endpoints:');
  console.log(`   GET http://localhost:${config.port}/free-data (no payment)`);
  console.log(`   GET http://localhost:${config.port}/premium-data (requires payment)`);
  console.log('\n⏳ Waiting for requests...\n');
});
