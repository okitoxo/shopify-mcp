import {
  CUSTOMER_SUMMARY_FIELDS,
  MAILING_ADDRESS_FIELDS,
  TAX_LINE_FIELDS,
  money,
} from "./common.js";

/** Custom (merchant-entered) discount, at order or line level. */
const APPLIED_DISCOUNT_FIELDS = `
  appliedDiscount {
    title
    description
    value
    valueType
    ${money("amountSet")}
  }
`;

/**
 * Draft order line item selection, including every discount and price
 * breakdown needed to review a quote sent to a customer.
 * Interpolated into the `lineItems(first: n) { edges { node { ... } } }`
 * block of each draft order query so all draft tools stay in sync.
 */
export const DRAFT_ORDER_LINE_ITEM_FIELDS = `
  id
  name
  title
  variantTitle
  sku
  vendor
  quantity
  custom
  taxable
  requiresShipping
  ${money("originalUnitPriceSet")}
  ${money("originalTotalSet")}
  ${money("approximateDiscountedUnitPriceSet")}
  ${money("discountedTotalSet")}
  ${money("totalDiscountSet")}
  ${APPLIED_DISCOUNT_FIELDS}
  taxLines { ${TAX_LINE_FIELDS} }
  customAttributes { key value }
  variant {
    id
    title
    sku
  }
`;

/**
 * Draft order selection excluding `lineItems`, which each query adds with
 * its own page size using DRAFT_ORDER_LINE_ITEM_FIELDS.
 */
export const DRAFT_ORDER_FIELDS = `
  id
  name
  status
  ready
  invoiceUrl
  invoiceSentAt
  completedAt
  createdAt
  updatedAt
  currencyCode
  presentmentCurrencyCode
  taxesIncluded
  taxExempt
  poNumber
  email
  phone
  totalQuantityOfLineItems
  totalWeight
  ${money("totalLineItemsPriceSet")}
  ${money("lineItemsSubtotalPrice")}
  ${money("subtotalPriceSet")}
  ${money("totalDiscountsSet")}
  ${money("totalShippingPriceSet")}
  ${money("totalTaxSet")}
  ${money("totalPriceSet")}
  ${APPLIED_DISCOUNT_FIELDS}
  discountCodes
  acceptAutomaticDiscounts
  platformDiscounts {
    id
    title
    code
    summary
    shortSummary
    presentationLevel
    discountClasses
    automaticDiscount
    bxgyDiscount
    ${money("totalAmountPriceSet")}
  }
  shippingLine {
    title
    code
    custom
    ${money("originalPriceSet")}
    ${money("discountedPriceSet")}
  }
  taxLines { ${TAX_LINE_FIELDS} }
  customer { ${CUSTOMER_SUMMARY_FIELDS} }
  billingAddress { ${MAILING_ADDRESS_FIELDS} }
  shippingAddress { ${MAILING_ADDRESS_FIELDS} }
  customAttributes { key value }
  order {
    id
    name
  }
  tags
  note2
`;

/**
 * Payment terms are kept out of DRAFT_ORDER_FIELDS because they require the
 * extra `read_payment_terms` access scope: requesting the field without it
 * fails the whole query. Tools opt in explicitly.
 */
export const DRAFT_ORDER_PAYMENT_TERMS_FIELDS = `
  paymentTerms {
    paymentTermsName
    paymentTermsType
    dueInDays
    overdue
  }
`;
