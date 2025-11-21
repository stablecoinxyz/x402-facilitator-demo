import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.FACILITATOR_PORT || '3001'),

  // EVM Configuration (Radius)
  radiusRpcUrl: process.env.RADIUS_TESTNET_RPC_URL || '',
  facilitatorPrivateKey: process.env.FACILITATOR_WALLET_PRIVATE_KEY || '',
  recipientAddress: process.env.RECIPIENT_ADDRESS || '',
  chainId: 1223953, // Radius testnet

  // Solana Configuration
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaFacilitatorPrivateKey: process.env.FACILITATOR_SOLANA_PRIVATE_KEY || '',
  solanaFacilitatorAddress: process.env.FACILITATOR_SOLANA_ADDRESS || '',
  sbcTokenAddress: process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA',
  sbcDecimals: 9,
};

// Validate EVM config (optional - only if EVM is being used)
if (config.radiusRpcUrl && !config.facilitatorPrivateKey) {
  throw new Error('FACILITATOR_WALLET_PRIVATE_KEY is required for EVM');
}

// Validate Solana config (optional - only if Solana is being used)
if (config.solanaFacilitatorPrivateKey && !config.solanaFacilitatorAddress) {
  throw new Error('FACILITATOR_SOLANA_ADDRESS is required for Solana');
}

console.log('✅ Facilitator configuration loaded');
console.log(`   EVM Chain ID: ${config.chainId}`);
console.log(`   EVM Recipient: ${config.recipientAddress || 'Not configured'}`);
console.log(`   Solana RPC: ${config.solanaRpcUrl}`);
console.log(`   Solana Facilitator: ${config.solanaFacilitatorAddress || 'Not configured'}`);
