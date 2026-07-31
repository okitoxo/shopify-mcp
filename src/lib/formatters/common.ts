/** Shared raw shapes and helpers used by the resource formatters. */

export interface RawMoneyBag {
  shopMoney: { amount: string; currencyCode: string };
}

export interface RawTaxLine {
  title: string;
  rate: number | null;
  ratePercentage: number | null;
  priceSet: RawMoneyBag;
}

export interface RawCustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  defaultEmailAddress?: { emailAddress: string } | null;
  defaultPhoneNumber?: { phoneNumber: string } | null;
}

/** Unwrap a MoneyBag to its shop-currency amount. */
export function shopMoney(moneyBag: RawMoneyBag | null | undefined) {
  return moneyBag?.shopMoney ?? null;
}

export function formatTaxLines(taxLines: RawTaxLine[] | undefined) {
  return (taxLines ?? []).map((tax) => ({
    title: tax.title,
    rate: tax.rate,
    ratePercentage: tax.ratePercentage,
    price: shopMoney(tax.priceSet),
  }));
}

export function formatCustomerSummary(customer: RawCustomerSummary | null) {
  if (!customer) return null;
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.defaultEmailAddress?.emailAddress || null,
  };
}
