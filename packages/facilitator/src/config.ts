import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  port: parseInt(process.env.FACILITATOR_PORT || '3001'),
  radiusRpcUrl: process.env.RADIUS_TESTNET_RPC_URL || '',
  facilitatorPrivateKey: process.env.FACILITATOR_WALLET_PRIVATE_KEY || '',
  recipientAddress: process.env.RECIPIENT_ADDRESS || '',
  chainId: 1223953, // Radius testnet
};

// Validate required config
if (!config.radiusRpcUrl) {
  throw new Error('RADIUS_TESTNET_RPC_URL is required');
}

if (!config.facilitatorPrivateKey) {
  throw new Error('FACILITATOR_WALLET_PRIVATE_KEY is required');
}

if (!config.recipientAddress) {
  throw new Error('RECIPIENT_ADDRESS is required');
}

console.log('✅ Facilitator configuration loaded');
console.log(`   Chain ID: ${config.chainId}`);
console.log(`   Recipient: ${config.recipientAddress}`);
