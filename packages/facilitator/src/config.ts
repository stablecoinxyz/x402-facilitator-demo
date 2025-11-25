import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.FACILITATOR_PORT || '3001'),

  // Radius Configuration (Radius Testnet)
  radiusRpcUrl: process.env.RADIUS_TESTNET_RPC_URL || '',
  radiusFacilitatorPrivateKey: process.env.RADIUS_FACILITATOR_PRIVATE_KEY || process.env.FACILITATOR_WALLET_PRIVATE_KEY || '',
  radiusFacilitatorAddress: process.env.RADIUS_FACILITATOR_ADDRESS || process.env.FACILITATOR_ADDRESS || '',
  radiusMerchantAddress: process.env.RADIUS_MERCHANT_ADDRESS || process.env.RECIPIENT_ADDRESS || '',
  radiusChainId: 1223953, // Radius testnet

  // Base Configuration
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  baseFacilitatorPrivateKey: process.env.BASE_FACILITATOR_PRIVATE_KEY || '',
  baseFacilitatorAddress: process.env.BASE_FACILITATOR_ADDRESS || '',
  baseChainId: parseInt(process.env.BASE_CHAIN_ID || '8453'), // 8453 = mainnet, 84532 = sepolia
  baseSbcTokenAddress: process.env.BASE_SBC_TOKEN_ADDRESS || '0xfdcC3dd6671eaB0709A4C0f3F53De9a333d80798', // mainnet
  baseSbcDecimals: parseInt(process.env.BASE_SBC_DECIMALS || '18'), // mainnet: 18, sepolia: 6

  // Solana Configuration
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaFacilitatorPrivateKey: process.env.SOLANA_FACILITATOR_PRIVATE_KEY || process.env.FACILITATOR_SOLANA_PRIVATE_KEY || '',
  solanaFacilitatorAddress: process.env.SOLANA_FACILITATOR_ADDRESS || process.env.FACILITATOR_SOLANA_ADDRESS || '',
  solanaMerchantAddress: process.env.SOLANA_MERCHANT_ADDRESS || '',
  sbcTokenAddress: process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA',
  sbcDecimals: 9,
};

// Validate Radius config (optional - only if Radius is being used)
if (config.radiusRpcUrl && !config.radiusFacilitatorPrivateKey) {
  throw new Error('RADIUS_FACILITATOR_PRIVATE_KEY is required for Radius');
}

// Validate Solana config (optional - only if Solana is being used)
if (config.solanaFacilitatorPrivateKey && !config.solanaFacilitatorAddress) {
  throw new Error('SOLANA_FACILITATOR_ADDRESS is required for Solana');
}

console.log('✅ Facilitator configuration loaded');
console.log(`   Radius Chain ID: ${config.radiusChainId}`);
console.log(`   Radius Merchant: ${config.radiusMerchantAddress || 'Not configured'}`);
console.log(`   Radius Facilitator: ${config.radiusFacilitatorAddress || 'Not configured'}`);
console.log(`   Base Chain ID: ${config.baseChainId}`);
console.log(`   Base Facilitator: ${config.baseFacilitatorAddress || 'Not configured'}`);
console.log(`   Solana RPC: ${config.solanaRpcUrl}`);
console.log(`   Solana Facilitator: ${config.solanaFacilitatorAddress || 'Not configured'}`);
