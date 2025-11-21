import { Request, Response } from 'express';
import { config } from '../config';

export function createPaymentRequirement() {
  const accepts: any[] = [];

  // Add EVM payment option if configured
  if (config.recipientAddress) {
    accepts.push({
      scheme: 'scheme_exact_evm',
      network: config.chainId.toString(),
      maxAmount: config.paymentAmount,
      recipientAddress: config.recipientAddress,
      assetContract: '0x0000000000000000000000000000000000000000', // Native USD
      timeout: config.paymentTimeout,
    });
  }

  // Add Solana payment option if configured
  if (config.solanaRecipientAddress) {
    accepts.push({
      scheme: 'scheme_exact_solana',
      network: 'solana-mainnet-beta',
      maxAmount: config.solanaPaymentAmount,
      recipientAddress: config.solanaRecipientAddress,
      assetContract: config.sbcTokenAddress, // SBC token
      timeout: config.paymentTimeout,
    });
  }

  return {
    x402Version: 1,
    accepts,
    error: 'Payment required to access premium data',
  };
}

export async function verifyWithFacilitator(
  paymentHeader: string,
  paymentRequirements: any
): Promise<{ isValid: boolean; invalidReason: string | null }> {
  // Decode payment header to determine scheme
  const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  const scheme = paymentData.scheme;

  // Find matching payment requirement
  const matchingRequirement = paymentRequirements.accepts.find(
    (req: any) => req.scheme === scheme
  );

  if (!matchingRequirement) {
    throw new Error(`No matching payment requirement for scheme: ${scheme}`);
  }

  const response = await fetch(`${config.facilitatorUrl}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: matchingRequirement,
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
  // Decode payment header to determine scheme
  const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  const scheme = paymentData.scheme;

  // Find matching payment requirement
  const matchingRequirement = paymentRequirements.accepts.find(
    (req: any) => req.scheme === scheme
  );

  if (!matchingRequirement) {
    throw new Error(`No matching payment requirement for scheme: ${scheme}`);
  }

  const response = await fetch(`${config.facilitatorUrl}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      paymentHeader,
      paymentRequirements: matchingRequirement,
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
