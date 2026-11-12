/**
 * Payment provider interface — implemented in Phase 20 (Campay / Fapshi).
 * Kept here so Student Premium scaffolding can reference it now.
 */

export type PaymentIntent = {
  id: string;
  amountXAF: number;
  phoneNumber: string;
  description: string;
};

export type PaymentResult = {
  success: boolean;
  reference: string;
  raw?: unknown;
};

export interface PaymentProvider {
  /** Initiate a payment and return the provider's reference. */
  request(intent: PaymentIntent): Promise<PaymentResult>;
  /** Verify the outcome of a payment by reference. */
  verify(reference: string): Promise<PaymentResult>;
}

/**
 * Stub provider — always fails cleanly. Real implementation lands later.
 */
export class StubPaymentProvider implements PaymentProvider {
  async request(_intent: PaymentIntent): Promise<PaymentResult> {
    return { success: false, reference: 'stub', raw: { reason: 'not_configured' } };
  }
  async verify(_reference: string): Promise<PaymentResult> {
    return { success: false, reference: 'stub', raw: { reason: 'not_configured' } };
  }
}