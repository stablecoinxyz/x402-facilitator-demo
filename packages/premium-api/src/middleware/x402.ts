import { Request, Response } from 'express';
import { config } from '../config';

export function createPaymentRequirement() {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'scheme_exact_evm',
        network: config.chainId.toString(),
        maxAmount: config.paymentAmount,
        recipientAddress: config.recipientAddress,
        assetContract: '0x0000000000000000000000000000000000000000', // Native USD
        timeout: config.paymentTimeout,
      },
    ],
    error: 'Payment required to access premium data',
  };
}

export async function verifyWithFacilitator(
  paymentHeader: string,
  paymentRequirements: any
): Promise<{ isValid: boolean; invalidReason: string | null }> {
  const response = await fetch(`${config.facilitatorUrl}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: paymentRequirements.accepts[0],
    }),
  });

  if (!response.ok) {
    throw new Error(`Facilitator verify failed: ${response.statusText}`);
  }

  return (await response.json()) as { isValid: boolean; invalidReason: string | null };
}

export async function settleWithFacilitator(
  paymentHeader: string,
  paymentRequirements: any
): Promise<{
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
}> {
  const response = await fetch(`${config.facilitatorUrl}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: paymentRequirements.accepts[0],
    }),
  });

  if (!response.ok) {
    throw new Error(`Facilitator settle failed: ${response.statusText}`);
  }

  return (await response.json()) as {
    success: boolean;
    error: string | null;
    txHash: string | null;
    networkId: string | null;
  };
}
