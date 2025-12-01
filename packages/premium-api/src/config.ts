import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.PREMIUM_API_PORT || '3000'),
  facilitatorUrl: 'http://localhost:3001',

  // Radius Configuration (Radius Testnet)
  radiusMerchantAddress: process.env.RADIUS_MERCHANT_ADDRESS || '', // Merchant receives payment
  radiusFacilitatorAddress: process.env.RADIUS_FACILITATOR_ADDRESS || '', // Facilitator executes tx
  radiusPaymentAmount: process.env.RADIUS_PAYMENT_AMOUNT || process.env.PAYMENT_AMOUNT || '10000000000000000', // 0.01 USD (18 decimals)
  paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT || '60'),
  radiusChainId: 1223953, // Radius testnet

  // Base Configuration
  baseMerchantAddress: process.env.BASE_MERCHANT_ADDRESS || '', // Merchant receives payment
  baseFacilitatorAddress: process.env.BASE_FACILITATOR_ADDRESS || '', // Facilitator executes tx
  basePaymentAmount: process.env.BASE_PAYMENT_AMOUNT || '10000', // $0.01 SBC (6 decimals for sepolia, 18 for mainnet)
  baseChainId: parseInt(process.env.BASE_CHAIN_ID || '84532'), // 8453 = mainnet, 84532 = sepolia
  baseSbcTokenAddress: process.env.BASE_SBC_TOKEN_ADDRESS || '0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16', // sepolia default

  // Solana Configuration
  solanaMerchantAddress: process.env.SOLANA_MERCHANT_ADDRESS || '', // Merchant receives payment
  solanaFacilitatorAddress: process.env.SOLANA_FACILITATOR_ADDRESS || process.env.FACILITATOR_SOLANA_ADDRESS || '', // Facilitator executes/sponsors
  solanaPaymentAmount: process.env.SOLANA_PAYMENT_AMOUNT || '50000000', // 0.05 SBC (9 decimals)
  sbcTokenAddress: process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA',
};

// Validate at least one payment method is configured
const hasRadius = config.radiusMerchantAddress;
const hasBase = config.baseMerchantAddress;
const hasSolana = config.solanaMerchantAddress;

if (!hasRadius && !hasBase && !hasSolana) {
  throw new Error('At least one merchant address must be configured');
}

console.log('✅ Premium API configuration loaded');
if (hasRadius) {
  console.log(`   Radius Chain ID: ${config.radiusChainId}`);
  console.log(`   Radius Payment Amount: ${config.radiusPaymentAmount} (0.01 USD)`);
}
if (hasBase) {
  console.log(`   Base Chain ID: ${config.baseChainId}`);
  console.log(`   Base Payment Amount: ${config.basePaymentAmount} (0.01 SBC)`);
}
if (hasSolana) {
  console.log(`   Solana Payment Amount: ${config.solanaPaymentAmount} (0.05 SBC)`);
  console.log(`   SBC Token: ${config.sbcTokenAddress}`);
}
console.log(`   Payment Timeout: ${config.paymentTimeout}s`);
