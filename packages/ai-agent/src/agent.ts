import { config } from './config';
import { createPaymentAuthorization } from './x402-client';

// Type definitions
interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmount: string;
  recipientAddress: string;
  assetContract: string;
  timeout: number;
}

interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirement[];
  error: string;
}

interface PremiumDataResponse {
  data: string;
  tier: string;
  features?: string[];
  paymentTxHash: string;
  networkId: string;
  message: string;
}

async function main() {
  console.log('\n🤖 AI Agent Starting...');
  console.log('========================\n');

  console.log('💭 Agent Goal: Access premium data from the API\n');

  // Step 1: Try to access premium API without payment
  console.log('📡 Step 1: Requesting premium data...');

  const response1 = await fetch(`${config.premiumApiUrl}/premium-data`);

  // Step 2: Handle 402 Payment Required
  if (response1.status === 402) {
    console.log('   Status: 402 Payment Required ❌\n');

    const paymentReq = (await response1.json()) as PaymentRequiredResponse;
    console.log('💰 Step 2: Payment Required!');
    console.log('   Payment requirements received:');
    console.log('   └─ Version:', paymentReq.x402Version);
    console.log('   └─ Scheme:', paymentReq.accepts[0].scheme);
    console.log('   └─ Network:', paymentReq.accepts[0].network, '(Radius Testnet)');
    console.log('   └─ Amount:', paymentReq.accepts[0].maxAmount, '(0.01 USD)');
    console.log('   └─ Recipient:', paymentReq.accepts[0].recipientAddress);
    console.log('   └─ Timeout:', paymentReq.accepts[0].timeout, 'seconds\n');

    // Step 3: Create payment authorization
    console.log('✍️  Step 3: Creating payment authorization...');

    const xPaymentHeader = await createPaymentAuthorization(paymentReq);

    console.log('   ✅ Payment authorization created!\n');

    // Step 4: Retry with payment
    console.log('📡 Step 4: Retrying request with payment...');

    const response2 = await fetch(`${config.premiumApiUrl}/premium-data`, {
      headers: {
        'X-PAYMENT': xPaymentHeader,
      },
    });

    // Step 5: Handle response
    if (response2.ok) {
      const data = (await response2.json()) as PremiumDataResponse;

      console.log('   Status:', response2.status, 'OK ✅\n');

      console.log('🎉 SUCCESS! Premium data received:');
      console.log('   ┌─────────────────────────────────────');
      console.log('   │ Data:', data.data);
      console.log('   │ Tier:', data.tier);
      console.log('   │ Features:', data.features?.join(', ') || 'N/A');
      console.log('   │');
      console.log('   │ Payment Details:');
      console.log('   │ └─ Tx Hash:', data.paymentTxHash);
      console.log('   │ └─ Network:', data.networkId);
      console.log('   │ └─ Message:', data.message);
      console.log('   └─────────────────────────────────────\n');

      console.log('🔗 View transaction:');
      console.log(`   https://testnet.radiustech.xyz/testnet/explorer?view=tx-details&hash=${data.paymentTxHash}\n`);

      console.log('✅ AI Agent completed successfully!\n');
    } else {
      const error = await response2.text();
      console.log('   Status:', response2.status, '❌\n');
      console.log('❌ Payment failed:', error, '\n');
    }
  } else if (response1.ok) {
    const data = (await response1.json()) as any;
    console.log('   Status:', response1.status, 'OK ✅\n');
    console.log('🎉 Data received (no payment required):', data, '\n');
  } else {
    console.log('   Status:', response1.status, '❌\n');
    console.log('❌ Unexpected error:', await response1.text(), '\n');
  }
}

// Run the agent
main().catch((error) => {
  console.error('\n❌ Agent error:', error.message);
  console.error(error);
  process.exit(1);
});
