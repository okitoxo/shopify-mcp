import {
  formatCustomerSummary,
  formatTaxLines,
  shopMoney,
  type RawCustomerSummary,
  type RawMoneyBag,
  type RawTaxLine,
} from "./common.js";

interface RawAppliedDiscount {
  title: string | null;
  description: string | null;
  value: number;
  valueType: string;
  amountSet: RawMoneyBag;
}

interface RawDraftOrderLineItemNode {
  id: string;
  name: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  vendor: string | null;
  quantity: number;
  custom: boolean;
  taxable: boolean;
  requiresShipping: boolean;
  originalUnitPriceSet: RawMoneyBag;
  originalTotalSet: RawMoneyBag;
  approximateDiscountedUnitPriceSet: RawMoneyBag;
  discountedTotalSet: RawMoneyBag;
  totalDiscountSet: RawMoneyBag;
  appliedDiscount: RawAppliedDiscount | null;
  taxLines: RawTaxLine[];
  customAttributes: Array<{ key: string; value: string | null }>;
  variant: { id: string; title: string; sku: string } | null;
}

interface RawDraftOrderNode {
  id: string;
  name: string;
  status: string;
  ready: boolean;
  invoiceUrl: string | null;
  invoiceSentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currencyCode: string;
  presentmentCurrencyCode: string;
  taxesIncluded: boolean;
  taxExempt: boolean;
  poNumber: string | null;
  email: string | null;
  phone: string | null;
  totalQuantityOfLineItems: number;
  totalWeight: string;
  totalLineItemsPriceSet: RawMoneyBag;
  lineItemsSubtotalPrice: RawMoneyBag;
  subtotalPriceSet: RawMoneyBag;
  totalDiscountsSet: RawMoneyBag;
  totalShippingPriceSet: RawMoneyBag;
  totalTaxSet: RawMoneyBag;
  totalPriceSet: RawMoneyBag;
  appliedDiscount: RawAppliedDiscount | null;
  discountCodes: string[];
  acceptAutomaticDiscounts: boolean | null;
  platformDiscounts: Array<{
    id: string | null;
    title: string;
    code: string | null;
    summary: string;
    shortSummary: string;
    presentationLevel: string;
    discountClasses: string[];
    automaticDiscount: boolean;
    bxgyDiscount: boolean;
    totalAmountPriceSet: RawMoneyBag;
  }>;
  shippingLine: {
    title: string;
    code: string | null;
    custom: boolean;
    originalPriceSet: RawMoneyBag;
    discountedPriceSet: RawMoneyBag;
  } | null;
  taxLines: RawTaxLine[];
  /** Only present when the tool opted into DRAFT_ORDER_PAYMENT_TERMS_FIELDS. */
  paymentTerms?: {
    paymentTermsName: string;
    paymentTermsType: string;
    dueInDays: number | null;
    overdue: boolean;
  } | null;
  customer: RawCustomerSummary | null;
  billingAddress: Record<string, unknown> | null;
  shippingAddress: Record<string, unknown> | null;
  customAttributes: Array<{ key: string; value: string | null }>;
  order: { id: string; name: string } | null;
  lineItems: { edges: Array<{ node: RawDraftOrderLineItemNode }> };
  tags: string[];
  note2: string | null;
}

function formatAppliedDiscount(discount: RawAppliedDiscount | null) {
  if (!discount) return null;
  return {
    title: discount.title,
    description: discount.description,
    value: discount.value,
    valueType: discount.valueType,
    amount: shopMoney(discount.amountSet),
  };
}

/**
 * Format draft order line items, keeping the full price/discount breakdown
 * (original vs. discounted totals, per-line discount, taxes).
 */
export function formatDraftOrderLineItems(lineItems: {
  edges: Array<{ node: RawDraftOrderLineItemNode }>;
}) {
  return lineItems.edges.map(({ node: item }) => ({
    id: item.id,
    name: item.name,
    title: item.title,
    variantTitle: item.variantTitle,
    sku: item.sku,
    vendor: item.vendor,
    quantity: item.quantity,
    custom: item.custom,
    taxable: item.taxable,
    requiresShipping: item.requiresShipping,
    originalUnitPrice: shopMoney(item.originalUnitPriceSet),
    originalTotal: shopMoney(item.originalTotalSet),
    discountedUnitPrice: shopMoney(item.approximateDiscountedUnitPriceSet),
    discountedTotal: shopMoney(item.discountedTotalSet),
    totalDiscount: shopMoney(item.totalDiscountSet),
    appliedDiscount: formatAppliedDiscount(item.appliedDiscount),
    taxLines: formatTaxLines(item.taxLines),
    customAttributes: item.customAttributes ?? [],
    variant: item.variant
      ? {
          id: item.variant.id,
          title: item.variant.title,
          sku: item.variant.sku,
        }
      : null,
  }));
}

/**
 * Format a raw draft order node into the standard draft order summary shape.
 * Includes the complete quote breakdown: line-level and order-level discounts,
 * discount codes, automatic (platform) discounts, shipping, and taxes.
 * Used by getDraftOrders, getDraftOrderById, createDraftOrder and updateDraftOrder.
 */
export function formatDraftOrderSummary(draft: RawDraftOrderNode) {
  return {
    id: draft.id,
    name: draft.name,
    status: draft.status,
    ready: draft.ready,
    invoiceUrl: draft.invoiceUrl,
    invoiceSentAt: draft.invoiceSentAt,
    completedAt: draft.completedAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    currencyCode: draft.currencyCode,
    presentmentCurrencyCode: draft.presentmentCurrencyCode,
    taxesIncluded: draft.taxesIncluded,
    taxExempt: draft.taxExempt,
    poNumber: draft.poNumber,
    email: draft.email,
    phone: draft.phone,
    totalQuantityOfLineItems: draft.totalQuantityOfLineItems,
    totalWeight: draft.totalWeight,
    // Quote totals, in the order they appear on the invoice.
    totalLineItemsPrice: shopMoney(draft.totalLineItemsPriceSet),
    lineItemsSubtotalPrice: shopMoney(draft.lineItemsSubtotalPrice),
    subtotalPrice: shopMoney(draft.subtotalPriceSet),
    totalDiscounts: shopMoney(draft.totalDiscountsSet),
    totalShippingPrice: shopMoney(draft.totalShippingPriceSet),
    totalTax: shopMoney(draft.totalTaxSet),
    totalPrice: shopMoney(draft.totalPriceSet),
    // Discounts: custom order-level, codes, and automatic/platform discounts.
    appliedDiscount: formatAppliedDiscount(draft.appliedDiscount),
    discountCodes: draft.discountCodes ?? [],
    acceptAutomaticDiscounts: draft.acceptAutomaticDiscounts ?? null,
    platformDiscounts: (draft.platformDiscounts ?? []).map((discount) => ({
      id: discount.id,
      title: discount.title,
      code: discount.code,
      summary: discount.summary,
      shortSummary: discount.shortSummary,
      presentationLevel: discount.presentationLevel,
      discountClasses: discount.discountClasses,
      automaticDiscount: discount.automaticDiscount,
      bxgyDiscount: discount.bxgyDiscount,
      totalAmount: shopMoney(discount.totalAmountPriceSet),
    })),
    shippingLine: draft.shippingLine
      ? {
          title: draft.shippingLine.title,
          code: draft.shippingLine.code,
          custom: draft.shippingLine.custom,
          originalPrice: shopMoney(draft.shippingLine.originalPriceSet),
          discountedPrice: shopMoney(draft.shippingLine.discountedPriceSet),
        }
      : null,
    taxLines: formatTaxLines(draft.taxLines),
    paymentTerms: draft.paymentTerms
      ? {
          name: draft.paymentTerms.paymentTermsName,
          type: draft.paymentTerms.paymentTermsType,
          dueInDays: draft.paymentTerms.dueInDays,
          overdue: draft.paymentTerms.overdue,
        }
      : null,
    customer: formatCustomerSummary(draft.customer),
    billingAddress: draft.billingAddress,
    shippingAddress: draft.shippingAddress,
    customAttributes: draft.customAttributes ?? [],
    order: draft.order,
    lineItems: formatDraftOrderLineItems(draft.lineItems),
    tags: draft.tags,
    note: draft.note2,
  };
}
