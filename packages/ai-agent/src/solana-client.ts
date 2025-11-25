/**
 * Solana x402 Payment Client
 *
 * Creates payment authorizations for Solana payments
 * - Ed25519 signature signing
 * - Base58 encoding
 * - Compatible with SBC facilitator
 * - SPL token delegation for non-custodial transfers
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createApproveInstruction,
  getAccount,
} from '@solana/spl-token';
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
    (req: any) => req.network === 'solana-mainnet-beta'
  );

  if (!requirement) {
    throw new Error('No Solana payment option available');
  }

  // Load agent keypair from private key
  if (!config.solanaAgentPrivateKey) {
    throw new Error('SOLANA_AGENT_PRIVATE_KEY not configured');
  }

  const secretKey = bs58.decode(config.solanaAgentPrivateKey);
  const agentKeypair = Keypair.fromSecretKey(secretKey);

  console.log('   Agent address (Solana):', agentKeypair.publicKey.toBase58());
  console.log('   Payment to:', requirement.payTo);
  console.log('   Amount:', requirement.maxAmountRequired, `(${Number(requirement.maxAmountRequired) / 1e9} SBC)`);

  // Create payment message
  const from = agentKeypair.publicKey.toBase58();
  const to = requirement.payTo;
  const amount = requirement.maxAmountRequired;
  const nonce = Date.now().toString();
  const deadline = Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds;

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
    scheme: 'exact',
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

/**
 * Check current SPL token delegation allowance for facilitator
 */
export async function checkSolanaFacilitatorAllowance(): Promise<bigint> {
  if (!config.solanaAgentPrivateKey) {
    throw new Error('SOLANA_AGENT_PRIVATE_KEY not configured');
  }

  const secretKey = bs58.decode(config.solanaAgentPrivateKey);
  const agentKeypair = Keypair.fromSecretKey(secretKey);

  // We need to know the Solana RPC URL and SBC token address
  const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const sbcTokenAddress = process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA';
  const facilitatorAddress = process.env.SOLANA_FACILITATOR_ADDRESS;

  if (!facilitatorAddress) {
    throw new Error('SOLANA_FACILITATOR_ADDRESS not configured');
  }

  const connection = new Connection(solanaRpcUrl, 'confirmed');
  const mintPublicKey = new PublicKey(sbcTokenAddress);
  const facilitatorPublicKey = new PublicKey(facilitatorAddress);

  // Get agent's token account
  const agentTokenAccount = await getAssociatedTokenAddress(
    mintPublicKey,
    agentKeypair.publicKey
  );

  // Get token account info to check delegated amount
  const accountInfo = await getAccount(connection, agentTokenAccount);

  // Check if delegate matches facilitator
  if (accountInfo.delegate?.toBase58() === facilitatorPublicKey.toBase58()) {
    return accountInfo.delegatedAmount;
  }

  return 0n;
}

/**
 * Approve Solana facilitator as SPL token delegate
 *
 * This is a ONE-TIME setup that allows the facilitator to execute transfers
 * on behalf of the agent without the agent holding any funds.
 *
 * @param amount - Amount to approve (defaults to max uint64)
 */
export async function approveSolanaFacilitator(
  amount: string = '18446744073709551615' // Max uint64 for SPL tokens
): Promise<string> {
  console.log('\n' + '='.repeat(60));
  console.log('   SOLANA FACILITATOR APPROVAL SETUP');
  console.log('='.repeat(60) + '\n');

  if (!config.solanaAgentPrivateKey) {
    throw new Error('SOLANA_AGENT_PRIVATE_KEY not configured');
  }

  const secretKey = bs58.decode(config.solanaAgentPrivateKey);
  const agentKeypair = Keypair.fromSecretKey(secretKey);

  const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const sbcTokenAddress = process.env.SBC_TOKEN_ADDRESS || 'DBAzBUXaLj1qANCseUPZz4sp9F8d2sc78C4vKjhbTGMA';
  const facilitatorAddress = process.env.SOLANA_FACILITATOR_ADDRESS;

  if (!facilitatorAddress) {
    throw new Error('SOLANA_FACILITATOR_ADDRESS not configured');
  }

  console.log('Agent Address:', agentKeypair.publicKey.toBase58());
  console.log('Facilitator Address:', facilitatorAddress);
  console.log('SBC Token:', sbcTokenAddress);
  console.log('Approval Amount:', amount, `(${Number(amount) / 1e9} SBC)`);
  console.log();

  const connection = new Connection(solanaRpcUrl, 'confirmed');
  const mintPublicKey = new PublicKey(sbcTokenAddress);
  const facilitatorPublicKey = new PublicKey(facilitatorAddress);

  // Get agent's token account
  const agentTokenAccount = await getAssociatedTokenAddress(
    mintPublicKey,
    agentKeypair.publicKey
  );

  console.log('Agent Token Account:', agentTokenAccount.toBase58());
  console.log();

  // Create approve instruction
  const approveInstruction = createApproveInstruction(
    agentTokenAccount,           // Token account
    facilitatorPublicKey,        // Delegate
    agentKeypair.publicKey,      // Owner
    BigInt(amount)               // Amount
  );

  // Create transaction
  const transaction = new Transaction().add(approveInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = agentKeypair.publicKey;

  console.log('⏳ Sending approval transaction...');

  // Sign and send
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [agentKeypair],
    { commitment: 'confirmed' }
  );

  console.log('\n✅ APPROVAL SUCCESSFUL');
  console.log('Transaction:', signature);
  console.log('Explorer:', `https://orb.helius.dev/tx/${signature}?cluster=mainnet-beta&tab=summary`);
  console.log('\n' + '='.repeat(60));
  console.log('The facilitator can now execute transfers on your behalf!');
  console.log('Tokens will flow: Agent → Merchant (via facilitator execution)');
  console.log('Facilitator NEVER holds your funds.');
  console.log('='.repeat(60) + '\n');

  return signature;
}
