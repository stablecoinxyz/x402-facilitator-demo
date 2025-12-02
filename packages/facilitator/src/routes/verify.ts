import { Request, Response } from 'express';
import { createPublicClient, http, verifyTypedData, parseTransaction } from 'viem';
import { config } from '../config';
import { verifySolanaPayment } from '../solana/verify';

/**
 * Payment Verification Handler
 *
 * Verifies payment authorizations for multiple networks:
 *
 * - Solana: Ed25519 signature verification (handled by solana/verify.ts)
 * - Base: EIP-712 typed data signature verification
 * - Radius: Signed transaction verification (native USD tokens)
 *
 * Radius uses a different approach because native tokens don't support ERC-20
 * approve/transferFrom. Instead, the agent signs a raw transaction that the
 * facilitator will broadcast. We verify the transaction details match the
 * claimed payment (recipient, amount, chain ID).
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

// EIP-712 Domain (used for Base payments only)
const getDomain = (verifyingContract: string, chainId: number) => ({
  name: 'SBC x402 Facilitator',
  version: '1',
  chainId,
  verifyingContract: verifyingContract as `0x${string}`,
});

// EIP-712 Types (used for Base payments only)
const types = {
  Payment: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export async function verifyPayment(req: Request, res: Response) {
  try {
    const { x402Version, paymentHeader, paymentRequirements } = req.body;

    console.log('\n🔍 Verifying payment...');

    // 1. Decode payment header (Base64)
    const paymentData = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString()
    );

    console.log('   Scheme:', paymentData.scheme);
    console.log('   Network:', paymentData.network);

    // Verify scheme is "exact"
    if (paymentData.scheme !== 'exact') {
      console.log('   ❌ Unsupported payment scheme');
      return res.json({
        isValid: false,
        payer: paymentData.payload?.from || 'unknown',
        invalidReason: `Unsupported scheme: ${paymentData.scheme}`
      });
    }

    // Route by network
    if (paymentData.network === 'solana-mainnet-beta') {
      console.log('   🟣 Solana payment detected');
      const result = await verifySolanaPayment(paymentData.payload, paymentRequirements);
      console.log(result.isValid ? '✅ Payment verification successful!\n' : '❌ Payment verification failed!\n');
      return res.json(result);
    }

    // Handle EVM-based payments (Radius or Base)
    const isBaseSepolia = paymentData.network === 'base-sepolia' || paymentData.network === '84532';
    const isBaseMainnet = paymentData.network === 'base' || paymentData.network === '8453';
    const isBase = isBaseSepolia || isBaseMainnet;
    const isRadius = paymentData.network === 'radius-testnet' || paymentData.network === '1223953';

    if (!isBase && !isRadius) {
      console.log('   ❌ Unknown payment network');
      return res.json({
        isValid: false,
        payer: paymentData.payload?.from || 'unknown',
        invalidReason: `Unknown network: ${paymentData.network}`
      });
    }

    console.log(isBaseSepolia ? '   🔵 Base Sepolia payment detected' : isBaseMainnet ? '   🔵 Base Mainnet payment detected' : '   🔵 Radius payment detected');

    const { from, to, amount, nonce, deadline, signature, signedTransaction } = paymentData.payload;

    console.log('   From:', from);
    console.log('   To:', to);
    console.log('   Amount:', amount);
    console.log('   Deadline:', new Date(deadline * 1000).toISOString());

    // Select chain config and RPC based on network
    // Base Sepolia and Base Mainnet have different token addresses and RPCs
    let chain, chainId, rpcUrl, facilitatorAddress;
    if (isBaseSepolia) {
      chain = { ...baseMainnet, id: 84532, name: 'Base Sepolia', testnet: true };
      chainId = 84532;
      rpcUrl = 'https://sepolia.base.org';
      facilitatorAddress = config.baseFacilitatorAddress;
    } else if (isBaseMainnet) {
      chain = baseMainnet;
      chainId = config.baseChainId;
      rpcUrl = config.baseRpcUrl;
      facilitatorAddress = config.baseFacilitatorAddress;
    } else {
      chain = radiusTestnet;
      chainId = config.radiusChainId;
      rpcUrl = config.radiusRpcUrl;
      facilitatorAddress = config.radiusFacilitatorAddress;
    }

    // 2. Verify authorization
    if (isRadius && signedTransaction) {
      // Radius: Verify the signed transaction
      // The signed transaction itself is the authorization - parse and verify its contents
      console.log('   📝 Verifying signed transaction...');

      try {
        const parsedTx = parseTransaction(signedTransaction as `0x${string}`);

        // Verify transaction details match the claimed payment
        if (parsedTx.to?.toLowerCase() !== to.toLowerCase()) {
          console.log('   ❌ Transaction recipient mismatch');
          return res.json({
            isValid: false,
            payer: from,
            invalidReason: 'Transaction recipient does not match claimed recipient'
          });
        }

        if (parsedTx.value !== BigInt(amount)) {
          console.log('   ❌ Transaction amount mismatch');
          return res.json({
            isValid: false,
            payer: from,
            invalidReason: 'Transaction amount does not match claimed amount'
          });
        }

        if (parsedTx.chainId !== radiusTestnet.id) {
          console.log('   ❌ Transaction chain ID mismatch');
          return res.json({
            isValid: false,
            payer: from,
            invalidReason: 'Transaction chain ID does not match Radius testnet'
          });
        }

        console.log('   ✅ Signed transaction valid');
        console.log('   ✅ Transaction matches claimed payment details');
      } catch (error) {
        console.log('   ❌ Failed to parse signed transaction:', error);
        return res.json({
          isValid: false,
          payer: from,
          invalidReason: 'Invalid signed transaction'
        });
      }
    } else {
      // Base: Verify EIP-712 signature
      // IMPORTANT: verifyingContract must be facilitator address (who verifies), not merchant (who receives)
      const domain = getDomain(facilitatorAddress, chainId);
      const message = { from, to, amount: BigInt(amount), nonce: BigInt(nonce), deadline: BigInt(deadline) };

      try {
        const isValidSig = await verifyTypedData({
          address: from as `0x${string}`,
          domain,
          types,
          primaryType: 'Payment',
          message,
          signature: signature as `0x${string}`,
        });

        if (!isValidSig) {
          console.log('   ❌ Invalid signature');
          return res.json({
            isValid: false,
            payer: from,
            invalidReason: 'Invalid signature'
          });
        }

        console.log('   ✅ Signature valid');
      } catch (error) {
        console.log('   ❌ Signature verification failed:', error);
        return res.json({
          isValid: false,
          payer: from,
          invalidReason: 'Signature verification failed'
        });
      }
    }

    // 3. Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (now > deadline) {
      console.log('   ❌ Payment expired');
      return res.json({
        isValid: false,
        payer: from,
        invalidReason: 'Payment expired'
      });
    }

    console.log('   ✅ Deadline valid');

    // 4. Check amount
    if (BigInt(amount) < BigInt(paymentRequirements.maxAmountRequired)) {
      console.log('   ❌ Insufficient amount');
      return res.json({
        isValid: false,
        payer: from,
        invalidReason: 'Insufficient amount'
      });
    }

    console.log('   ✅ Amount sufficient');

    // 5. Check recipient
    if (to.toLowerCase() !== paymentRequirements.payTo.toLowerCase()) {
      console.log('   ❌ Invalid recipient');
      return res.json({
        isValid: false,
        payer: from,
        invalidReason: 'Invalid recipient'
      });
    }

    console.log('   ✅ Recipient valid');

    // 6. Check on-chain balance
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    let balance: bigint;

    if (isBase) {
      // Base: Check ERC-20 token balance
      const ERC20_ABI = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }
      ] as const;

      // Use correct SBC token address for network
      const sbcTokenAddress = isBaseSepolia
        ? '0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16'  // Base Sepolia (6 decimals)
        : config.baseSbcTokenAddress;                    // Base Mainnet (18 decimals)

      const decimals = isBaseSepolia ? 6 : config.baseSbcDecimals;

      console.log('   SBC Token:', sbcTokenAddress);

      balance = await publicClient.readContract({
        address: sbcTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [from as `0x${string}`]
      });

      const balanceFormatted = Number(balance) / Math.pow(10, decimals);
      console.log(`   Sender SBC balance: ${balance.toString()} (${balanceFormatted} SBC)`);
    } else {
      // EVM (Radius): Check native token balance
      balance = await publicClient.getBalance({ address: from as `0x${string}` });
      console.log('   Sender balance:', balance.toString());
    }

    if (balance < BigInt(amount)) {
      console.log('   ❌ Insufficient balance');
      return res.json({
        isValid: false,
        payer: from,
        invalidReason: 'Insufficient balance'
      });
    }

    console.log('   ✅ Balance sufficient');

    // All checks passed
    console.log('✅ Payment verification successful!\n');
    res.json({
      isValid: true,
      payer: from,
      invalidReason: null
    });

  } catch (error: any) {
    console.error('❌ Verification error:', error);

    // Try to extract payer from request if possible
    let payer = 'unknown';
    try {
      const paymentData = JSON.parse(Buffer.from(req.body.paymentHeader, 'base64').toString());
      payer = paymentData.payload?.from || 'unknown';
    } catch {}

    res.status(500).json({
      isValid: false,
      payer,
      invalidReason: `Server error: ${error.message}`,
    });
  }
}
