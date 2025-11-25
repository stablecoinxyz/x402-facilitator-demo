import { Request, Response } from 'express';
import { createPublicClient, http, verifyTypedData } from 'viem';
import { config } from '../config';
import { verifySolanaPayment } from '../solana/verify';

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

// EIP-712 Domain
const getDomain = (verifyingContract: string, chainId: number) => ({
  name: 'SBC x402 Facilitator',
  version: '1',
  chainId,
  verifyingContract: verifyingContract as `0x${string}`,
});

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
    const isBase = paymentData.network === 'base' || paymentData.network === 'base-sepolia' || paymentData.network === '8453' || paymentData.network === '84532';
    const isRadius = paymentData.network === 'radius-testnet' || paymentData.network === '1223953';

    if (!isBase && !isRadius) {
      console.log('   ❌ Unknown payment network');
      return res.json({
        isValid: false,
        payer: paymentData.payload?.from || 'unknown',
        invalidReason: `Unknown network: ${paymentData.network}`
      });
    }

    console.log(isBase ? '   🔵 Base payment detected' : '   🔵 Radius payment detected');

    const { from, to, amount, nonce, deadline, signature } = paymentData.payload;

    console.log('   From:', from);
    console.log('   To:', to);
    console.log('   Amount:', amount);
    console.log('   Deadline:', new Date(deadline * 1000).toISOString());

    // Select chain config and RPC based on scheme
    const chain = isBase ? baseMainnet : radiusTestnet;
    const chainId = isBase ? config.baseChainId : config.radiusChainId;
    const rpcUrl = isBase ? config.baseRpcUrl : config.radiusRpcUrl;
    const facilitatorAddress = isBase ? config.baseFacilitatorAddress : config.radiusFacilitatorAddress;

    // 2. Verify signature using EIP-712
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

      balance = await publicClient.readContract({
        address: config.baseSbcTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [from as `0x${string}`]
      });

      const decimals = config.baseSbcDecimals;
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
