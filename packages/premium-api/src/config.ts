import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.PREMIUM_API_PORT || '3000'),
  facilitatorUrl: 'http://localhost:3001',

  // EVM Configuration
  recipientAddress: process.env.RECIPIENT_ADDRESS || '',
  paymentAmount: process.env.PAYMENT_AMOUNT || '10000000000000000', // 0.01 USD (18 decimals)
  paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT || '60'),
  chainId: 1223953, // Radius testnet

  // Solana Configuration
  solanaRecipientAddress: process.env.FACILITATOR_SOLANA_ADDRESS || '',
  solanaPaymentAmount: process.env.SOLANA_PAYMENT_AMOUNT || '50000000', // 0.05 SBC (9 decimals)
  sbcTokenAddress: process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA',
};

// Validate at least one payment method is configured
const hasEVM = config.recipientAddress;
const hasSolana = config.solanaRecipientAddress;

if (!hasEVM && !hasSolana) {
  throw new Error('At least one recipient address must be configured');
}

console.log('✅ Premium API configuration loaded');
if (hasEVM) {
  console.log(`   EVM Chain ID: ${config.chainId}`);
  console.log(`   EVM Payment Amount: ${config.paymentAmount} (0.01 USD)`);
}
if (hasSolana) {
  console.log(`   Solana Payment Amount: ${config.solanaPaymentAmount} (0.05 SBC)`);
  console.log(`   SBC Token: ${config.sbcTokenAddress}`);
}
console.log(`   Payment Timeout: ${config.paymentTimeout}s`);
