/**
 * Solana Payment Settlement
 *
 * Executes SPL token transfers on Solana mainnet
 * - Creates and sends SPL token transfer instruction
 * - Transfers SBC tokens from payer to recipient
 * - Returns transaction signature
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
  createTransferInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { config } from '../config';

interface SolanaPaymentPayload {
  from: string;      // Base58 public key (payer)
  to: string;        // Base58 public key (recipient)
  amount: string;    // Amount in base units
}

/**
 * Settle a Solana payment using delegated SPL token transfer
 *
 * Architecture: Agent → Merchant (facilitator executes via delegation)
 * - Agent has pre-approved facilitator as delegate (one-time setup)
 * - Facilitator executes transfer FROM agent TO merchant
 * - Facilitator NEVER holds customer funds
 * - Same pattern as Base/Radius ERC-20 transferFrom()
 */
export async function settleSolanaPayment(
  paymentPayload: SolanaPaymentPayload
): Promise<{ success: boolean; payer: string; transaction: string; network: string; errorReason?: string }> {
  try {
    const { from, to, amount } = paymentPayload;

    console.log('   💳 DELEGATED TRANSFER (Non-Custodial)');
    console.log('   From (Agent):', from);
    console.log('   To (Merchant):', to);
    console.log('   Amount:', amount, `(${Number(amount) / 1e9} SBC)`);

    // Create connection
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');

    // Load facilitator keypair from private key (Base58)
    if (!config.solanaFacilitatorPrivateKey) {
      throw new Error('SOLANA_FACILITATOR_PRIVATE_KEY not configured');
    }

    const secretKey = bs58.decode(config.solanaFacilitatorPrivateKey);
    const facilitatorKeypair = Keypair.fromSecretKey(secretKey);

    console.log('   Facilitator (Delegate):', facilitatorKeypair.publicKey.toBase58());

    // Parse addresses
    const fromPublicKey = new PublicKey(from);
    const toPublicKey = new PublicKey(to);
    const mintPublicKey = new PublicKey(config.sbcTokenAddress);

    // Get associated token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      fromPublicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      toPublicKey
    );

    console.log('   From token account:', fromTokenAccount.toBase58());
    console.log('   To token account:', toTokenAccount.toBase58());

    // Check if we should use real or simulated settlement
    const useRealSettlement = process.env.ENABLE_REAL_SETTLEMENT === 'true';

    let txHash: string;

    if (useRealSettlement) {
      console.log('   🔥 REAL SETTLEMENT MODE - Executing delegated SPL token transfer');

      // Create transfer instruction using FACILITATOR as authority (delegate)
      // This works because agent has pre-approved facilitator as delegate
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,                 // Source (agent's token account)
        toTokenAccount,                   // Destination (merchant's token account)
        facilitatorKeypair.publicKey,     // Authority (facilitator as delegate)
        BigInt(amount)                    // Amount
      );

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = facilitatorKeypair.publicKey;

      console.log('   ⏳ Sending delegated transfer transaction...');

      // Sign and send transaction (facilitator signs as delegate)
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [facilitatorKeypair],
        {
          commitment: 'confirmed',
        }
      );

      txHash = signature;

      console.log('   ✅ Transaction confirmed:', txHash);
      console.log('   🔗 Explorer:', `https://orb.helius.dev/tx/${txHash}?cluster=mainnet-beta&tab=summary`);
      console.log('   💡 Tokens flowed: Agent → Merchant (facilitator never held funds)');
      console.log('✅ Delegated settlement complete!\n');
    } else {
      console.log('   ⚠️  SIMULATED MODE - Set ENABLE_REAL_SETTLEMENT=true for real transactions');
      console.log('   ⚠️  NOTE: Real settlement requires agent to approve facilitator as delegate');
      console.log('   ⚠️  Run: cd packages/ai-agent && npm run approve-solana-facilitator');

      // Simulate a transaction signature
      txHash = bs58.encode(Buffer.from(Array(64).fill(0).map(() => Math.floor(Math.random() * 256))));

      console.log('   ✅ Simulated tx signature:', txHash);
      console.log('✅ Simulated settlement complete!\n');
    }

    return {
      success: true,
      payer: from,
      transaction: txHash,
      network: 'solana-mainnet-beta',
    };
  } catch (error: any) {
    console.error('❌ Solana settlement error:', error);
    console.error('   💡 If error mentions "insufficient funds" or "owner mismatch", the agent needs to:');
    console.error('   1. Approve facilitator as delegate: npm run approve-solana-facilitator');
    console.error('   2. Ensure agent has sufficient SBC token balance');
    return {
      success: false,
      payer: paymentPayload.from || 'unknown',
      transaction: '',
      network: 'solana-mainnet-beta',
      errorReason: error.message,
    };
  }
}

/**
 * Alternative: Facilitator-sponsored settlement
 *
 * The facilitator directly pays the recipient from its own token balance,
 * then later reconciles with the payer (off-chain or via separate transaction).
 *
 * This is simpler and doesn't require token delegation.
 */
export async function settleSolanaPaymentSponsored(
  paymentPayload: SolanaPaymentPayload
): Promise<{ success: boolean; payer: string; transaction: string; network: string; errorReason?: string }> {
  try {
    const { from, to, amount } = paymentPayload;

    console.log('   💰 FACILITATOR-SPONSORED SETTLEMENT');
    console.log('   Facilitator will pay recipient directly');
    console.log('   To:', to);
    console.log('   Amount:', amount, `(${Number(amount) / 1e9} SBC)`);

    // Create connection
    const connection = new Connection(config.solanaRpcUrl, 'confirmed');

    // Load facilitator keypair
    if (!config.solanaFacilitatorPrivateKey) {
      throw new Error('SOLANA_FACILITATOR_PRIVATE_KEY not configured');
    }

    const secretKey = bs58.decode(config.solanaFacilitatorPrivateKey);
    const facilitatorKeypair = Keypair.fromSecretKey(secretKey);

    console.log('   Facilitator:', facilitatorKeypair.publicKey.toBase58());

    // Parse addresses
    const toPublicKey = new PublicKey(to);
    const mintPublicKey = new PublicKey(config.sbcTokenAddress);

    // Get token accounts
    const facilitatorTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      facilitatorKeypair.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      toPublicKey
    );

    console.log('   Facilitator token account:', facilitatorTokenAccount.toBase58());
    console.log('   Recipient token account:', toTokenAccount.toBase58());

    // Create transfer instruction (facilitator pays recipient)
    const transferInstruction = createTransferInstruction(
      facilitatorTokenAccount,     // Source (facilitator's tokens)
      toTokenAccount,              // Destination (recipient)
      facilitatorKeypair.publicKey, // Owner (facilitator)
      BigInt(amount)               // Amount
    );

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = facilitatorKeypair.publicKey;

    console.log('   ⏳ Sending transaction...');

    // Sign and send
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [facilitatorKeypair],
      { commitment: 'confirmed' }
    );

    console.log('   ✅ Transaction confirmed:', signature);
    console.log('   🔗 Explorer:', `https://orb.helius.dev/tx/${signature}?cluster=mainnet-beta&tab=summary`);
    console.log('✅ Facilitator-sponsored settlement complete!\n');

    return {
      success: true,
      payer: from,
      transaction: signature,
      network: 'solana-mainnet-beta',
    };
  } catch (error: any) {
    console.error('❌ Facilitator-sponsored settlement error:', error);
    return {
      success: false,
      payer: paymentPayload.from || 'unknown',
      transaction: '',
      network: 'solana-mainnet-beta',
      errorReason: error.message,
    };
  }
}
