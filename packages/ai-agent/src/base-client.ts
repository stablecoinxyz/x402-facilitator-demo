import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config';

// Base Mainnet Chain Config
const baseMainnet = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [config.baseRpcUrl],
    },
  },
  testnet: false,
};

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
  }
] as const;

export async function createBasePaymentAuthorization(
  paymentRequirements: any
): Promise<string> {
  // Find the Base payment requirement
  const requirement = paymentRequirements.accepts.find(
    (req: any) => req.network === 'base' || req.network === 'base-sepolia' || req.network === '8453' || req.network === '84532'
  );

  if (!requirement) {
    throw new Error('No Base payment requirement found');
  }

  // Create wallet client
  const account = privateKeyToAccount(config.baseAgentPrivateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: baseMainnet,
    transport: http(config.baseRpcUrl),
  });

  console.log('   Agent address:', account.address);
  console.log('   Payment to:', requirement.payTo);
  console.log('   Amount:', requirement.maxAmountRequired, '(0.01 SBC)');

  // EIP-712 Domain
  const domain = {
    name: 'SBC x402 Facilitator',
    version: '1',
    chainId: config.baseChainId,
    verifyingContract: (requirement.facilitator || config.baseFacilitatorAddress) as `0x${string}`,
  };

  // EIP-712 Types
  const types = {
    Payment: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // Payment message
  const message = {
    from: account.address,
    to: requirement.payTo,
    amount: BigInt(requirement.maxAmountRequired),
    nonce: BigInt(Date.now()),
    deadline: BigInt(Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds),
  };

  console.log('   Deadline:', new Date(Number(message.deadline) * 1000).toISOString());

  // Sign typed data
  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType: 'Payment',
    message,
  });

  console.log('   Signature:', signature.slice(0, 20) + '...');

  // Create payment proof
  const paymentProof = {
    x402Version: 1,
    scheme: 'exact',
    network: requirement.network,
    payload: {
      from: account.address,
      to: requirement.payTo,
      amount: requirement.maxAmountRequired,
      nonce: Number(message.nonce),
      deadline: Number(message.deadline),
      signature,
    },
  };

  // Encode as Base64
  const xPaymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString('base64');

  return xPaymentHeader;
}

/**
 * Check current allowance for facilitator
 */
export async function checkBaseFacilitatorAllowance(): Promise<bigint> {
  if (!config.baseFacilitatorAddress) {
    throw new Error('BASE_FACILITATOR_ADDRESS not configured');
  }
  if (!config.baseAgentPrivateKey) {
    throw new Error('BASE_AGENT_PRIVATE_KEY not configured');
  }
  if (!config.baseSbcTokenAddress) {
    throw new Error('BASE_SBC_TOKEN_ADDRESS not configured');
  }

  const account = privateKeyToAccount(config.baseAgentPrivateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: baseMainnet,
    transport: http(config.baseRpcUrl),
  });

  const allowance = await publicClient.readContract({
    address: config.baseSbcTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, config.baseFacilitatorAddress as `0x${string}`]
  });

  return allowance;
}

/**
 * Approve facilitator to spend SBC tokens on agent's behalf
 * This is a ONE-TIME setup step required before payments can work
 *
 * @param amount - Amount to approve (default: max uint256 for unlimited)
 * @returns Transaction hash
 */
export async function approveBaseFacilitator(
  amount: string = '115792089237316195423570985008687907853269984665640564039457584007913129639935' // max uint256
): Promise<string> {
  if (!config.baseFacilitatorAddress) {
    throw new Error('BASE_FACILITATOR_ADDRESS not configured');
  }
  if (!config.baseAgentPrivateKey) {
    throw new Error('BASE_AGENT_PRIVATE_KEY not configured');
  }
  if (!config.baseSbcTokenAddress) {
    throw new Error('BASE_SBC_TOKEN_ADDRESS not configured');
  }

  const account = privateKeyToAccount(config.baseAgentPrivateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: baseMainnet,
    transport: http(config.baseRpcUrl),
  });

  const publicClient = createPublicClient({
    chain: baseMainnet,
    transport: http(config.baseRpcUrl),
  });

  console.log('\n🔐 Approving Facilitator to Spend SBC Tokens');
  console.log('   Agent:', account.address);
  console.log('   Facilitator (Spender):', config.baseFacilitatorAddress);
  console.log('   SBC Token:', config.baseSbcTokenAddress);
  console.log('   Amount:', amount === '115792089237316195423570985008687907853269984665640564039457584007913129639935' ? 'Unlimited (max uint256)' : amount);

  const hash = await walletClient.writeContract({
    address: config.baseSbcTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [config.baseFacilitatorAddress as `0x${string}`, BigInt(amount)]
  });

  console.log('   ⏳ Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1
  });

  console.log('   ✅ Approval tx hash:', hash);
  console.log('   ✅ Block number:', receipt.blockNumber);
  console.log('   ✅ Gas used:', receipt.gasUsed);
  console.log('✅ Facilitator approved! Agent can now make payments.\n');

  return hash;
}
