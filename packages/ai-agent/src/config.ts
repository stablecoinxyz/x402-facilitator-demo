import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  premiumApiUrl: 'http://localhost:3000',
  radiusRpcUrl: process.env.RADIUS_TESTNET_RPC_URL || '',
  agentPrivateKey: process.env.AI_AGENT_PRIVATE_KEY || '',
  agentAddress: process.env.AI_AGENT_ADDRESS || '',
  chainId: 1223953, // Radius testnet
};

if (!config.radiusRpcUrl) {
  throw new Error('RADIUS_TESTNET_RPC_URL is required');
}

if (!config.agentPrivateKey) {
  throw new Error('AI_AGENT_PRIVATE_KEY is required');
}

console.log('✅ AI Agent configuration loaded');
console.log(`   Chain ID: ${config.chainId}`);
console.log(`   Agent Address: ${config.agentAddress || 'Will derive from private key'}`);
