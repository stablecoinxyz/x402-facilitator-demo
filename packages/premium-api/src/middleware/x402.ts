import { Request, Response } from 'express';
import { config } from '../config';

export function createPaymentRequirement(resource: string) {
  const accepts: any[] = [];

  // Add Radius payment option if configured
  if (config.radiusMerchantAddress) {
    accepts.push({
      scheme: 'exact',
      network: 'radius-testnet',
      maxAmountRequired: config.radiusPaymentAmount,
      resource, // URL of the resource being paid for
      payTo: config.radiusMerchantAddress, // Merchant receives payment
      facilitator: config.radiusFacilitatorAddress, // Facilitator executes tx
      asset: '0x0000000000000000000000000000000000000000', // Native USD
      maxTimeoutSeconds: config.paymentTimeout,
    });
  }

  // Add Base payment option if configured
  if (config.baseMerchantAddress) {
    const networkName = config.baseChainId === 8453 ? 'base' :
                       config.baseChainId === 84532 ? 'base-sepolia' :
                       config.baseChainId.toString();
    accepts.push({
      scheme: 'exact',
      network: networkName,
      maxAmountRequired: config.basePaymentAmount,
      resource, // URL of the resource being paid for
      payTo: config.baseMerchantAddress, // Merchant receives payment
      facilitator: config.baseFacilitatorAddress, // Facilitator executes tx
      asset: config.baseSbcTokenAddress, // SBC token
      maxTimeoutSeconds: config.paymentTimeout,
    });
  }

  // Add Solana payment option if configured
  if (config.solanaMerchantAddress) {
    accepts.push({
      scheme: 'exact',
      network: 'solana-mainnet-beta',
      maxAmountRequired: config.solanaPaymentAmount,
      resource, // URL of the resource being paid for
      payTo: config.solanaMerchantAddress, // Merchant receives payment
      facilitator: config.solanaFacilitatorAddress, // Facilitator sponsors/executes
      asset: config.sbcTokenAddress, // SBC token
      maxTimeoutSeconds: config.paymentTimeout,
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
  // Decode payment header to determine scheme and network
  const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  const { scheme, network } = paymentData;

  // Find matching payment requirement by scheme and network
  const matchingRequirement = paymentRequirements.accepts.find(
    (req: any) => req.scheme === scheme && req.network === network
  );

  if (!matchingRequirement) {
    throw new Error(`No matching payment requirement for scheme: ${scheme}, network: ${network}`);
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
  errorReason?: string;
  transaction: string;
  network: string;
  payer: string;
}> {
  // Decode payment header to determine scheme and network
  const paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  const { scheme, network } = paymentData;

  // Find matching payment requirement by scheme and network
  const matchingRequirement = paymentRequirements.accepts.find(
    (req: any) => req.scheme === scheme && req.network === network
  );

  if (!matchingRequirement) {
    throw new Error(`No matching payment requirement for scheme: ${scheme}, network: ${network}`);
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
    errorReason?: string;
    transaction: string;
    network: string;
    payer: string;
  };
}
