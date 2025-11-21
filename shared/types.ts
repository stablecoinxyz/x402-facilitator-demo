// x402 Protocol Types

export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmount: string;
  recipientAddress: string;
  assetContract: string;
  timeout: number;
}

export interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirement[];
  error: string;
}

export interface PaymentPayload {
  from: string;
  to: string;
  amount: string;
  nonce: number;
  deadline: number;
  signature: string;
}

export interface PaymentProof {
  x402Version: number;
  scheme: string;
  network: string;
  payload: PaymentPayload;
}

export interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirement;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason: string | null;
}

export interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirement;
}

export interface SettleResponse {
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
}

// EIP-712 Domain
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// EIP-712 Payment Type
export const PaymentTypes = {
  Payment: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

// Radius Testnet Chain Config
export const radiusTestnet = {
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
      http: [process.env.RADIUS_TESTNET_RPC_URL || ''],
    },
    public: {
      http: [process.env.RADIUS_TESTNET_RPC_URL || ''],
    },
  },
  blockExplorers: {
    default: {
      name: 'Radius Explorer',
      url: 'https://testnet.radiustech.xyz/testnet/explorer',
    },
  },
  testnet: true,
};
