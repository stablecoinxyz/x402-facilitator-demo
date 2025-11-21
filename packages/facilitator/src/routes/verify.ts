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

// EIP-712 Domain
const getDomain = (verifyingContract: string) => ({
  name: 'SBC x402 Facilitator',
  version: '1',
  chainId: config.chainId,
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

    // Route by scheme
    if (paymentData.scheme === 'scheme_exact_solana') {
      console.log('   🟣 Solana payment detected');
      const result = await verifySolanaPayment(paymentData.payload, paymentRequirements);
      console.log(result.isValid ? '✅ Payment verification successful!\n' : '❌ Payment verification failed!\n');
      return res.json(result);
    }

    // Otherwise, handle EVM payment (existing logic)
    console.log('   🔵 EVM payment detected');

    const { from, to, amount, nonce, deadline, signature } = paymentData.payload;

    console.log('   From:', from);
    console.log('   To:', to);
    console.log('   Amount:', amount);
    console.log('   Deadline:', new Date(deadline * 1000).toISOString());

    // 2. Verify signature using EIP-712
    const domain = getDomain(to);
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
        return res.json({ isValid: false, invalidReason: 'Invalid signature' });
      }

      console.log('   ✅ Signature valid');
    } catch (error) {
      console.log('   ❌ Signature verification failed:', error);
      return res.json({ isValid: false, invalidReason: 'Signature verification failed' });
    }

    // 3. Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (now > deadline) {
      console.log('   ❌ Payment expired');
      return res.json({ isValid: false, invalidReason: 'Payment expired' });
    }

    console.log('   ✅ Deadline valid');

    // 4. Check amount
    if (BigInt(amount) < BigInt(paymentRequirements.maxAmount)) {
      console.log('   ❌ Insufficient amount');
      return res.json({ isValid: false, invalidReason: 'Insufficient amount' });
    }

    console.log('   ✅ Amount sufficient');

    // 5. Check recipient
    if (to.toLowerCase() !== paymentRequirements.recipientAddress.toLowerCase()) {
      console.log('   ❌ Invalid recipient');
      return res.json({ isValid: false, invalidReason: 'Invalid recipient' });
    }

    console.log('   ✅ Recipient valid');

    // 6. Check on-chain balance
    const publicClient = createPublicClient({
      chain: radiusTestnet,
      transport: http(config.radiusRpcUrl),
    });

    const balance = await publicClient.getBalance({ address: from as `0x${string}` });

    console.log('   Sender balance:', balance.toString());

    if (balance < BigInt(amount)) {
      console.log('   ❌ Insufficient balance');
      return res.json({ isValid: false, invalidReason: 'Insufficient balance' });
    }

    console.log('   ✅ Balance sufficient');

    // All checks passed
    console.log('✅ Payment verification successful!\n');
    res.json({ isValid: true, invalidReason: null });

  } catch (error: any) {
    console.error('❌ Verification error:', error);
    res.status(500).json({
      isValid: false,
      invalidReason: `Server error: ${error.message}`,
    });
  }
}
