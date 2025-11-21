import { Request, Response } from 'express';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config';
import { settleSolanaPaymentSponsored } from '../solana/settle';

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

export async function settlePayment(req: Request, res: Response) {
  try {
    const { paymentHeader, paymentRequirements } = req.body;

    console.log('\n💰 Settling payment...');

    // Decode payment header
    const paymentData = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString()
    );

    console.log('   Scheme:', paymentData.scheme);

    // Route by scheme
    if (paymentData.scheme === 'scheme_exact_solana') {
      console.log('   🟣 Solana settlement');
      const result = await settleSolanaPaymentSponsored(paymentData.payload);
      console.log(result.success ? '✅ Settlement complete!\n' : '❌ Settlement failed!\n');
      return res.json(result);
    }

    // Otherwise, handle EVM payment (existing logic)
    console.log('   🔵 EVM settlement');

    const { from, to, amount } = paymentData.payload;

    console.log('   From:', from);
    console.log('   To:', to);
    console.log('   Amount:', amount);

    // Create facilitator account
    const account = privateKeyToAccount(config.facilitatorPrivateKey as `0x${string}`);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: radiusTestnet,
      transport: http(config.radiusRpcUrl),
    });

    // Create public client
    const publicClient = createPublicClient({
      chain: radiusTestnet,
      transport: http(config.radiusRpcUrl),
    });

    console.log('   Executing transfer on Radius testnet...');

    // NOTE: For native tokens (USD on Radius), the facilitator acts as a paymaster
    // In production with ERC-20 tokens, you would use:
    // - EIP-2612 (permit) + transferFrom (SBC has this!)
    // - EIP-3009 (transferWithAuthorization)
    // - Account Abstraction (ERC-4337) with paymasters

    // Check if we should use real or simulated settlement
    const useRealSettlement = process.env.ENABLE_REAL_SETTLEMENT === 'true';

    let txHash: string;

    if (useRealSettlement) {
      console.log('   🔥 REAL SETTLEMENT MODE - Executing on-chain transfer');

      // Execute real on-chain transfer
      // Facilitator acts as paymaster, sending the amount to recipient
      const hash = await walletClient.sendTransaction({
        to: to as `0x${string}`,
        value: BigInt(amount),
      });

      txHash = hash;

      console.log('   ⏳ Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1
      });

      console.log('   ✅ Real tx hash:', txHash);
      console.log('   ✅ Block number:', receipt.blockNumber);
      console.log('   ✅ Gas used:', receipt.gasUsed);
      console.log('✅ Settlement complete on Radius testnet!\n');
    } else {
      console.log('   ⚠️  SIMULATED MODE - Set ENABLE_REAL_SETTLEMENT=true for real transactions');

      // Simulate a transaction hash
      txHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      console.log('   ✅ Simulated tx hash:', txHash);
      console.log('✅ Simulated settlement complete!\n');
    }

    res.json({
      success: true,
      error: null,
      txHash,
      networkId: config.chainId.toString(),
    });

  } catch (error: any) {
    console.error('❌ Settlement error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      txHash: null,
      networkId: null,
    });
  }
}
