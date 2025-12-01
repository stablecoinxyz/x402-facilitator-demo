/**
 * One-Time Setup: Approve Facilitator to Spend SBC Tokens on Base Sepolia
 *
 * This script approves the facilitator to execute token transfers on the agent's behalf.
 * Run this ONCE before making any payments on Base Sepolia testnet.
 *
 * Usage:
 *   cd packages/ai-agent
 *   npx tsx approve-base-sepolia-facilitator.ts
 *
 * Or from root:
 *   npm run approve-base-sepolia-facilitator
 */

import { createWalletClient, http, createPublicClient, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

// Base Sepolia Chain Config
const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
});

// Base Sepolia SBC Token (6 decimals)
const BASE_SEPOLIA_SBC_TOKEN = '0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16';

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  console.log('='.repeat(60));
  console.log('   BASE SEPOLIA FACILITATOR APPROVAL SETUP');
  console.log('='.repeat(60));
  console.log();

  // Get config from env
  const agentPrivateKey = process.env.BASE_AGENT_PRIVATE_KEY;
  const facilitatorAddress = process.env.BASE_FACILITATOR_ADDRESS;
  const rpcUrl = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

  if (!agentPrivateKey) {
    console.error('❌ ERROR: BASE_AGENT_PRIVATE_KEY not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  if (!facilitatorAddress) {
    console.error('❌ ERROR: BASE_FACILITATOR_ADDRESS not configured');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(agentPrivateKey as `0x${string}`);

  console.log('📋 Configuration:');
  console.log('   Network: Base Sepolia (Chain ID: 84532)');
  console.log('   RPC URL:', rpcUrl);
  console.log('   Agent Address:', account.address);
  console.log('   Facilitator Address:', facilitatorAddress);
  console.log('   SBC Token:', BASE_SEPOLIA_SBC_TOKEN);
  console.log();

  // Create clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  // Check agent's SBC balance
  console.log('📊 Checking agent SBC balance...');
  const balance = await publicClient.readContract({
    address: BASE_SEPOLIA_SBC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address]
  });

  // SBC on Sepolia has 6 decimals
  const balanceFormatted = Number(balance) / 1_000_000;
  console.log(`   Balance: ${balanceFormatted.toFixed(6)} SBC`);

  if (balance === 0n) {
    console.log('   ⚠️  Warning: Agent has no SBC tokens!');
    console.log('   You need to fund this wallet before making payments.');
    console.log();
  }

  // Check current allowance
  console.log('\n📊 Checking current allowance...');
  const currentAllowance = await publicClient.readContract({
    address: BASE_SEPOLIA_SBC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, facilitatorAddress as `0x${string}`]
  });

  const allowanceFormatted = Number(currentAllowance) / 1_000_000;
  console.log(`   Current allowance: ${allowanceFormatted.toFixed(6)} SBC`);

  if (currentAllowance > 0n) {
    console.log('   ✅ Facilitator already has approval!');
    console.log('   Updating to unlimited approval...\n');
  } else {
    console.log('   ℹ️  No existing approval found');
    console.log('   Setting up approval now...\n');
  }

  // Approve facilitator with max uint256 (unlimited)
  const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

  console.log('🔐 Sending approval transaction...');
  console.log('   Spender:', facilitatorAddress);
  console.log('   Amount: Unlimited (max uint256)');

  try {
    const hash = await walletClient.writeContract({
      address: BASE_SEPOLIA_SBC_TOKEN as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [facilitatorAddress as `0x${string}`, maxUint256]
    });

    console.log('   ⏳ Waiting for confirmation...');
    console.log('   Tx hash:', hash);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1
    });

    console.log();
    console.log('='.repeat(60));
    console.log('   ✅ APPROVAL SUCCESSFUL');
    console.log('='.repeat(60));
    console.log();
    console.log('   Transaction:', hash);
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log();
    console.log('   You can now make payments on Base Sepolia!');
    console.log('   The facilitator can execute token transfers from your agent.');
    console.log();
    console.log('   View on BaseScan:');
    console.log(`   https://sepolia.basescan.org/tx/${hash}`);
    console.log();

  } catch (error: any) {
    console.error('\n❌ APPROVAL FAILED');
    console.error('   Error:', error.message);

    if (error.message.includes('insufficient funds')) {
      console.error('\n   💡 Tip: You need ETH on Base Sepolia for gas.');
      console.error('   Get some from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
