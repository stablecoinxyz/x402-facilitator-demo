import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.PREMIUM_API_PORT || '3000'),
  facilitatorUrl: 'http://localhost:3001',
  recipientAddress: process.env.RECIPIENT_ADDRESS || '',
  paymentAmount: process.env.PAYMENT_AMOUNT || '10000000000000000', // 0.01 USD
  paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT || '60'),
  chainId: 1223953, // Radius testnet
};

if (!config.recipientAddress) {
  throw new Error('RECIPIENT_ADDRESS is required');
}

console.log('✅ Premium API configuration loaded');
console.log(`   Chain ID: ${config.chainId}`);
console.log(`   Payment Amount: ${config.paymentAmount} (0.01 USD)`);
console.log(`   Payment Timeout: ${config.paymentTimeout}s`);
