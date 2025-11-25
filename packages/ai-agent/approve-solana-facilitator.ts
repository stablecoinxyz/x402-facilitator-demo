/**
 * One-Time Setup: Approve Solana Facilitator as SPL Token Delegate
 *
 * This script approves the facilitator to execute SPL token transfers on the agent's behalf.
 * Run this ONCE before making any Solana payments.
 *
 * Usage:
 *   cd packages/ai-agent
 *   npx ts-node approve-solana-facilitator.ts
 */

import { approveSolanaFacilitator, checkSolanaFacilitatorAllowance } from './src/solana-client';
import { config } from './src/config';

async function main() {
  console.log('='.repeat(60));
  console.log('   SOLANA FACILITATOR APPROVAL SETUP');
  console.log('='.repeat(60));
  console.log();

  // Validate configuration
  const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const facilitatorAddress = process.env.SOLANA_FACILITATOR_ADDRESS;
  const sbcTokenAddress = process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA';

  if (!facilitatorAddress) {
    console.error('❌ ERROR: SOLANA_FACILITATOR_ADDRESS not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  if (!config.solanaAgentPrivateKey) {
    console.error('❌ ERROR: SOLANA_AGENT_PRIVATE_KEY not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('   RPC URL:', solanaRpcUrl);
  console.log('   SBC Token:', sbcTokenAddress);
  console.log('   Facilitator:', facilitatorAddress);
  console.log();

  // Check current allowance
  console.log('📊 Checking current delegation...\n');
  try {
    const currentAllowance = await checkSolanaFacilitatorAllowance();
    console.log('   Current delegated amount:', currentAllowance.toString(), `(${Number(currentAllowance) / 1e9} SBC)`);

    if (currentAllowance > 0n) {
      console.log('   ✅ Facilitator already has delegation!');
      console.log();
      console.log('   Do you want to update the delegation? (y/n)');

      // For now, just proceed
      console.log('   Proceeding with delegation update...\n');
    } else {
      console.log('   ℹ️  No existing delegation found');
      console.log('   Setting up delegation now...\n');
    }
  } catch (error: any) {
    console.log('   ⚠️  Could not check current delegation:', error.message);
    console.log('   Proceeding with delegation setup...\n');
  }

  // Approve facilitator as delegate
  try {
    const txHash = await approveSolanaFacilitator();

    console.log('='.repeat(60));
    console.log('   ✅ DELEGATION SUCCESSFUL');
    console.log('='.repeat(60));
    console.log();
    console.log('You can now make Solana payments! The facilitator can execute');
    console.log('token transfers from your agent to merchants.');
    console.log();
    console.log('Architecture: Agent → Merchant (via facilitator execution)');
    console.log('Facilitator NEVER holds your funds.');
    console.log();
  } catch (error: any) {
    console.error('\n❌ DELEGATION FAILED');
    console.error('Error:', error.message);
    console.error();
    console.error('Common issues:');
    console.error('1. Insufficient SOL for transaction fees');
    console.error('2. Agent token account does not exist (need to receive SBC tokens first)');
    console.error('3. Invalid private key or facilitator address');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
