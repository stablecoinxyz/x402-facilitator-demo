import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  premiumApiUrl: 'http://localhost:3000',

  // EVM Configuration (Radius)
  radiusRpcUrl: process.env.RADIUS_TESTNET_RPC_URL || '',
  agentPrivateKey: process.env.AI_AGENT_PRIVATE_KEY || '',
  agentAddress: process.env.AI_AGENT_ADDRESS || '',
  chainId: 1223953, // Radius testnet

  // Solana Configuration
  agentSolanaPrivateKey: process.env.AI_AGENT_SOLANA_PRIVATE_KEY || '',
  agentSolanaAddress: process.env.AI_AGENT_SOLANA_ADDRESS || '',

  // Payment preference
  preferredScheme: process.env.PREFERRED_PAYMENT_SCHEME || 'solana', // 'evm' or 'solana'
};

// Validate at least one payment method is configured
const hasEVM = config.radiusRpcUrl && config.agentPrivateKey;
const hasSolana = config.agentSolanaPrivateKey;

if (!hasEVM && !hasSolana) {
  throw new Error('At least one payment method must be configured (EVM or Solana)');
}

console.log('✅ AI Agent configuration loaded');
console.log(`   Preferred Scheme: ${config.preferredScheme}`);
if (hasEVM) {
  console.log(`   EVM Chain ID: ${config.chainId}`);
  console.log(`   EVM Agent Address: ${config.agentAddress || 'Will derive from private key'}`);
}
if (hasSolana) {
  console.log(`   Solana Agent Address: ${config.agentSolanaAddress || 'Will derive from private key'}`);
}
