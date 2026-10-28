import { describe, expect, it } from 'vitest';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { isBillingActive, subscriptionFrom } from './purchases';

const entitlement = (identifier: string, periodType = 'NORMAL') => ({
  identifier, isActive: true, periodType,
  latestPurchaseDate: '2026-10-28T09:00:00Z', expirationDate: '2026-11-28T09:00:00Z',
});
const info = (active: Record<string, unknown>) => ({ entitlements: { active, all: active } }) as unknown as CustomerInfo;

describe('subscriptionFrom', () => {
  it('has no subscription without an active entitlement', () => {
    expect(subscriptionFrom(info({}))).toBeNull();
  });

  it('reads the billing period and trial state', () => {
    expect(subscriptionFrom(info({ standard: entitlement('standard', 'TRIAL') }))).toEqual({
      plan: 'standard', periodStart: '2026-10-28T09:00:00Z', periodEnd: '2026-11-28T09:00:00Z', isTrial: true,
    });
  });

  it('prefers premium when both are active', () => {
    expect(subscriptionFrom(info({ standard: entitlement('standard'), premium: entitlement('premium') }))?.plan).toBe('premium');
  });
});

describe('isBillingActive', () => {
  it('stays off on the web so nothing is locked', () => {
    expect(isBillingActive()).toBe(false);
  });
});
