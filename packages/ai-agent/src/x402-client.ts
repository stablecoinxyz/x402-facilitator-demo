import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config';

/**
 * Radius Testnet Payment Client
 *
 * Radius uses native USD tokens (not ERC-20). Since native tokens don't support
 * transferFrom/approve patterns, we use a different approach:
 *
 * 1. Agent creates and signs a raw native token transfer transaction
 * 2. Agent includes the signed transaction in the X-PAYMENT header
 * 3. Facilitator verifies the transaction details match the claimed payment
 * 4. Facilitator broadcasts the pre-signed transaction (cannot modify it)
 *
 * This maintains non-custodial properties - agent controls the exact recipient
 * and amount through their signature. Facilitator is just a relay.
 */

// Radius Testnet Chain Config
const radiusTestnet = {
  id: 1223953,
  name: 'Radius Testnet',
  network: 'radius-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USD',
    symbol: 'USD',
  },
  rpcUrls: {
    default: {
      http: [config.radiusRpcUrl],
    },
  },
  testnet: true,
};

export async function createPaymentAuthorization(
  paymentRequirements: any
): Promise<string> {
  // Find Radius payment requirement
  const requirement = paymentRequirements.accepts.find(
    (req: any) => req.network === 'radius-testnet' || req.network === '1223953'
  );

  if (!requirement) {
    throw new Error('No Radius payment option available');
  }

  // Create wallet client
  const account = privateKeyToAccount(config.radiusAgentPrivateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: radiusTestnet,
    transport: http(config.radiusRpcUrl),
  });

  const publicClient = createPublicClient({
    chain: radiusTestnet,
    transport: http(config.radiusRpcUrl),
  });

  console.log('   Agent address:', account.address);
  console.log('   Payment to:', requirement.payTo);
  console.log('   Amount:', requirement.maxAmountRequired, '(0.01 USD)');

  const deadline = BigInt(Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds);
  console.log('   Deadline:', new Date(Number(deadline) * 1000).toISOString());

  // For native token payments on Radius, agent creates and signs the raw transaction
  // This maintains non-custodial properties - agent signs exact tx, facilitator only broadcasts
  console.log('   📝 Creating signed native token transaction...');

  // Get current nonce for agent
  const nonce = await publicClient.getTransactionCount({
    address: account.address,
  });

  // Get current gas price
  const gasPrice = await publicClient.getGasPrice();

  // Prepare the transaction
  const txRequest = {
    account,
    to: requirement.payTo as `0x${string}`,
    value: BigInt(requirement.maxAmountRequired),
    nonce,
    gasPrice,
    gas: BigInt(21000), // Standard native transfer gas
    chainId: radiusTestnet.id,
  };

  // Sign the transaction
  const signedTx = await walletClient.signTransaction(txRequest);

  console.log('   ✅ Transaction signed by agent');
  console.log('   Signed tx:', signedTx.slice(0, 30) + '...');

  // Create payment proof with signed transaction
  // The facilitator will broadcast this signed tx - it cannot modify it
  const paymentProof = {
    x402Version: 1,
    scheme: 'exact',
    network: requirement.network,
    payload: {
      from: account.address,
      to: requirement.payTo,
      amount: requirement.maxAmountRequired,
      nonce: Number(nonce),
      deadline: Number(deadline),
      // Include the signed raw transaction for facilitator to broadcast
      signedTransaction: signedTx,
    },
  };

  // Encode as Base64
  const xPaymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString('base64');

  return xPaymentHeader;
}
