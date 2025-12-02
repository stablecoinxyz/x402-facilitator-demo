import { Request, Response } from 'express';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config';
import { settleSolanaPayment } from '../solana/settle';

/**
 * Payment Settlement Handler
 *
 * Executes on-chain transfers for multiple networks:
 *
 * - Solana: Delegated SPL token transfer (handled by solana/settle.ts)
 *   Facilitator executes transfer as delegate: Agent → Merchant
 *
 * - Base: ERC-20 transferFrom
 *   Facilitator calls transferFrom(agent, merchant, amount) using prior approval
 *   Tokens flow: Agent → Merchant (facilitator never holds funds)
 *
 * - Radius: Broadcast pre-signed transaction
 *   Agent signs the native USD transfer transaction beforehand
 *   Facilitator broadcasts it (cannot modify recipient/amount)
 *   Tokens flow: Agent → Merchant (non-custodial)
 *
 * All settlement methods maintain non-custodial properties - the facilitator
 * never holds customer funds.
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

// Base Sepolia Chain Config
const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
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
    console.log('   Network:', paymentData.network);

    // Verify scheme is "exact"
    if (paymentData.scheme !== 'exact') {
      console.log('   ❌ Unsupported payment scheme');
      return res.json({
        success: false,
        payer: paymentData.payload?.from || 'unknown',
        transaction: '',
        network: paymentData.network || 'unknown',
        errorReason: `Unsupported scheme: ${paymentData.scheme}`
      });
    }

    // Route by network
    if (paymentData.network === 'solana-mainnet-beta') {
      console.log('   🟣 Solana settlement (delegated transfer)');
      const result = await settleSolanaPayment(paymentData.payload);
      console.log(result.success ? '✅ Settlement complete!\n' : '❌ Settlement failed!\n');
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
        success: false,
        payer: paymentData.payload?.from || 'unknown',
        transaction: '',
        network: paymentData.network || 'unknown',
        errorReason: `Unknown network: ${paymentData.network}`
      });
    }

    console.log(isBaseSepolia ? '   🔵 Base Sepolia settlement' : isBaseMainnet ? '   🔵 Base Mainnet settlement' : '   🔵 Radius settlement');

    const { from, to, amount } = paymentData.payload;

    console.log('   From:', from);
    console.log('   To:', to);
    console.log('   Amount:', amount);

    // Select chain config and credentials based on network
    let chain, rpcUrl, chainName;
    if (isBaseSepolia) {
      chain = baseSepolia;
      rpcUrl = 'https://sepolia.base.org';
      chainName = 'Base Sepolia';
    } else if (isBaseMainnet) {
      chain = baseMainnet;
      rpcUrl = config.baseRpcUrl;
      chainName = 'Base Mainnet';
    } else {
      chain = radiusTestnet;
      rpcUrl = config.radiusRpcUrl;
      chainName = 'Radius testnet';
    }
    const privateKey = isBase ? config.baseFacilitatorPrivateKey : config.radiusFacilitatorPrivateKey;
    const chainId = chain.id;

    // Create facilitator account
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // Create public client
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    console.log(`   Executing transfer on ${chainName}...`);

    // Check if we should use real or simulated settlement
    const useRealSettlement = process.env.ENABLE_REAL_SETTLEMENT === 'true';

    let txHash: string;

    if (useRealSettlement) {
      console.log('   🔥 REAL SETTLEMENT MODE - Executing on-chain transfer');

      if (isBase) {
        // Base: ERC-20 token transferFrom
        // Facilitator executes: Agent → Merchant (facilitator never holds funds)
        console.log('   📝 ERC-20 TransferFrom (Agent → Merchant)');
        console.log('   From (Agent):', from);
        console.log('   To (Merchant):', to);

        const ERC20_ABI = [
          {
            inputs: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'transferFrom',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ] as const;

        // Use correct SBC token address for network
        const sbcTokenAddress = isBaseSepolia
          ? '0xf9FB20B8E097904f0aB7d12e9DbeE88f2dcd0F16'  // Base Sepolia (6 decimals)
          : config.baseSbcTokenAddress;                    // Base Mainnet (18 decimals)

        console.log('   Token:', sbcTokenAddress);

        const hash = await walletClient.writeContract({
          address: sbcTokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transferFrom',
          args: [
            from as `0x${string}`,  // Agent (payer)
            to as `0x${string}`,    // Merchant (receiver)
            BigInt(amount)
          ]
        });

        txHash = hash;

        console.log('   ⏳ Waiting for confirmation...');

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1
        });

        console.log('   ✅ Real tx hash:', txHash);
        console.log('   ✅ Block number:', receipt.blockNumber);
        console.log('   ✅ Gas used:', receipt.gasUsed);
        console.log(`✅ Settlement complete on ${chainName}!\n`);
      } else {
        // EVM (Radius): Native token transfer
        // Agent signs the transaction, facilitator broadcasts it (non-custodial)
        console.log('   💵 Native token transfer (USD)');
        console.log('   📝 Agent signed transaction - Facilitator broadcasting');
        console.log('   From (Agent):', from);
        console.log('   To (Merchant):', to);

        // Get signed transaction from payload
        const signedTransaction = paymentData.payload.signedTransaction;
        if (!signedTransaction) {
          throw new Error('No signed transaction provided for Radius payment. Agent must sign the native token transfer.');
        }

        console.log('   Signed tx:', signedTransaction.slice(0, 30) + '...');

        // Broadcast the agent's pre-signed transaction
        // Facilitator cannot modify this - it's already signed by the agent
        const hash = await publicClient.sendRawTransaction({
          serializedTransaction: signedTransaction as `0x${string}`,
        });

        txHash = hash;

        console.log('   ⏳ Waiting for confirmation...');

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1
        });

        console.log('   ✅ Real tx hash:', txHash);
        console.log('   ✅ Block number:', receipt.blockNumber);
        console.log('   ✅ Gas used:', receipt.gasUsed);
        console.log('   ✅ Agent paid from own balance (non-custodial)');
        console.log(`✅ Settlement complete on ${chainName}!\n`);
      }
    } else {
      console.log('   ⚠️  SIMULATED MODE - Set ENABLE_REAL_SETTLEMENT=true for real transactions');

      // Simulate a transaction hash
      txHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      console.log('   ✅ Simulated tx hash:', txHash);
      console.log('✅ Simulated settlement complete!\n');
    }

    res.json({
      success: true,
      payer: from,
      transaction: txHash,
      network: paymentData.network,
    });

  } catch (error: any) {
    console.error('❌ Settlement error:', error);

    // Try to extract payer and network from request if possible
    let payer = 'unknown';
    let network = 'unknown';
    try {
      const paymentData = JSON.parse(Buffer.from(req.body.paymentHeader, 'base64').toString());
      payer = paymentData.payload?.from || 'unknown';
      network = paymentData.network || 'unknown';
    } catch {}

    res.status(500).json({
      success: false,
      payer,
      transaction: '',
      network,
      errorReason: error.message,
    });
  }
}
