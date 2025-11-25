import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config';

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

  console.log('   Agent address:', account.address);
  console.log('   Payment to:', requirement.payTo);
  console.log('   Amount:', requirement.maxAmountRequired, '(0.01 USD)');

  // EIP-712 Domain
  const domain = {
    name: 'SBC x402 Facilitator',
    version: '1',
    chainId: config.radiusChainId,
    verifyingContract: (requirement.facilitator || config.radiusFacilitatorAddress) as `0x${string}`,
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
