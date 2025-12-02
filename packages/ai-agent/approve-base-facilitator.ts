/**
 * One-Time Setup: Approve Facilitator to Spend SBC Tokens
 *
 * This script approves the facilitator to execute token transfers on the agent's behalf.
 * Run this ONCE before making any payments.
 *
 * Usage:
 *   cd packages/ai-agent
 *   npx ts-node approve-facilitator.ts
 */

import { approveBaseFacilitator, checkBaseFacilitatorAllowance } from './src/base-client';
import { config } from './src/config';

async function main() {
  console.log('='.repeat(60));
  console.log('   BASE FACILITATOR APPROVAL SETUP');
  console.log('='.repeat(60));
  console.log();

  if (!config.baseFacilitatorAddress) {
    console.error('❌ ERROR: BASE_FACILITATOR_ADDRESS not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  if (!config.baseAgentPrivateKey) {
    console.error('❌ ERROR: BASE_AGENT_PRIVATE_KEY not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  if (!config.baseSbcTokenAddress) {
    console.error('❌ ERROR: BASE_SBC_TOKEN_ADDRESS not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  // Check current allowance
  console.log('📊 Checking current allowance...\n');
  const currentAllowance = await checkBaseFacilitatorAllowance();
  console.log('   Current allowance:', currentAllowance.toString());

  if (currentAllowance > 0n) {
    console.log('   ✅ Facilitator already has approval!');
    console.log();
    console.log('   Do you want to update the approval? (y/n)');

    // For now, just proceed
    console.log('   Proceeding with approval...\n');
  } else {
    console.log('   ℹ️  No existing approval found');
    console.log('   Setting up approval now...\n');
  }

  // Approve facilitator
  try {
    const txHash = await approveBaseFacilitator();

    console.log('='.repeat(60));
    console.log('   ✅ APPROVAL SUCCESSFUL');
    console.log('='.repeat(60));
    console.log();
    console.log('Transaction:', txHash);
    console.log();
    console.log('You can now make payments! The facilitator can execute');
    console.log('token transfers from your agent to merchants.');
    console.log();
    console.log('View on BaseScan:');
    console.log(`https://basescan.org/tx/${txHash}`);
    console.log();
  } catch (error: any) {
    console.error('\n❌ APPROVAL FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
