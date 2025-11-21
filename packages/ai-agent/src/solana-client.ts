/**
 * Solana x402 Payment Client
 *
 * Creates payment authorizations for Solana payments
 * - Ed25519 signature signing
 * - Base58 encoding
 * - Compatible with SBC facilitator
 */

import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { config } from './config';

/**
 * Construct message to be signed (must match facilitator's format)
 */
function constructMessage(data: {
  from: string;
  to: string;
  amount: string;
  nonce: string;
  deadline: number;
}): string {
  return `from:${data.from}|to:${data.to}|amount:${data.amount}|nonce:${data.nonce}|deadline:${data.deadline}`;
}

/**
 * Create Solana payment authorization
 */
export async function createSolanaPaymentAuthorization(
  paymentRequirements: any
): Promise<string> {
  const requirement = paymentRequirements.accepts.find(
    (req: any) => req.scheme === 'scheme_exact_solana'
  );

  if (!requirement) {
    throw new Error('No Solana payment option available');
  }

  // Load agent keypair from private key
  if (!config.agentSolanaPrivateKey) {
    throw new Error('AI_AGENT_SOLANA_PRIVATE_KEY not configured');
  }

  const secretKey = bs58.decode(config.agentSolanaPrivateKey);
  const agentKeypair = Keypair.fromSecretKey(secretKey);

  console.log('   Agent address (Solana):', agentKeypair.publicKey.toBase58());
  console.log('   Payment to:', requirement.recipientAddress);
  console.log('   Amount:', requirement.maxAmount, `(${Number(requirement.maxAmount) / 1e9} SBC)`);

  // Create payment message
  const from = agentKeypair.publicKey.toBase58();
  const to = requirement.recipientAddress;
  const amount = requirement.maxAmount;
  const nonce = Date.now().toString();
  const deadline = Math.floor(Date.now() / 1000) + requirement.timeout;

  console.log('   Deadline:', new Date(deadline * 1000).toISOString());

  // Construct message
  const message = constructMessage({ from, to, amount, nonce, deadline });
  const messageBytes = Buffer.from(message);

  // Sign with Ed25519
  const signature = nacl.sign.detached(messageBytes, agentKeypair.secretKey);
  const signatureBase58 = bs58.encode(signature);

  console.log('   Signature:', signatureBase58.slice(0, 20) + '...');

  // Create payment proof
  const paymentProof = {
    x402Version: 1,
    scheme: 'scheme_exact_solana',
    network: requirement.network,
    payload: {
      from,
      to,
      amount,
      nonce,
      deadline,
      signature: signatureBase58,
    },
  };

  // Encode as Base64
  const xPaymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString('base64');

  return xPaymentHeader;
}
