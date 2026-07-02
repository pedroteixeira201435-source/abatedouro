import { Customer, BusinessSettings, CreditInterest } from '../types';

/** The interest policy that applies to a customer — their override, else the business default. */
export function effectiveInterest(customer: Customer, settings: BusinessSettings): CreditInterest {
  return customer.interest ?? settings.interest;
}

/** Interest owed on an outstanding balance for one billing cycle. */
export function computeInterest(outstanding: number, interest: CreditInterest): number {
  if (outstanding <= 0 || interest.value <= 0) return 0;
  const raw = interest.mode === 'fixed' ? interest.value : outstanding * (interest.value / 100);
  return Math.round(raw * 100) / 100;
}

/** Current month key (yyyy-mm) used to guard against double-charging interest. */
export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Human label for an interest policy, e.g. "10%" or "N$ 50.00". */
export function interestLabel(interest: CreditInterest): string {
  return interest.mode === 'percent' ? `${interest.value}%` : `N$ ${interest.value.toFixed(2)}`;
}

/**
 * Extra charged when a sale is paid on credit instead of cash (the cost of buying on credit).
 * `subtotal` is the cash price of the cart. Returns the surcharge amount (>= 0), rounded to 2dp.
 */
export function creditSurcharge(subtotal: number, settings: BusinessSettings): number {
  const s = settings.creditSurcharge;
  if (!s || s.value <= 0 || subtotal <= 0) return 0;
  const raw = s.mode === 'fixed' ? s.value : subtotal * (s.value / 100);
  return Math.round(raw * 100) / 100;
}
