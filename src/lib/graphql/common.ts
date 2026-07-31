/**
 * Reusable GraphQL field selections.
 *
 * These are plain strings interpolated into the `gql` templates of the tools,
 * so a selection is written once and stays in sync across every query and
 * mutation that returns the same resource.
 */

/** Shop-currency amount of a MoneyBag. */
export const MONEY_FIELDS = `shopMoney { amount currencyCode }`;

/** Selects a MoneyBag field, e.g. `money("totalPriceSet")`. */
export const money = (field: string) => `${field} { ${MONEY_FIELDS} }`;

export const TAX_LINE_FIELDS = `
  title
  rate
  ratePercentage
  ${money("priceSet")}
`;

export const MAILING_ADDRESS_FIELDS = `
  address1
  address2
  city
  provinceCode
  zip
  country
  phone
`;

export const CUSTOMER_SUMMARY_FIELDS = `
  id
  firstName
  lastName
  defaultEmailAddress {
    emailAddress
  }
`;
