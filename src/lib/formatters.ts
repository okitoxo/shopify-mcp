import { z } from "zod";

// ── Shared Zod schemas ────────────────────────────────────────────────

/**
 * Mailing address schema shared by createDraftOrder (shipping + billing)
 * and manageCustomerAddress. Uses countryCode/provinceCode (API input type).
 *
 * NOTE: updateOrder.shippingAddress intentionally uses country/province
 * (different Shopify input type) and is NOT shared here.
 */
export const shippingAddressSchema = z.object({
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  company: z.string().optional(),
  countryCode: z.string().optional().describe("Two-letter country code"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional().describe("Phone in E.164 format, e.g. +16135551111"),
  provinceCode: z.string().optional(),
  zip: z.string().optional(),
});

// ── Shared formatters ─────────────────────────────────────────────────

interface RawLineItemNode {
  id: string;
  title: string;
  quantity: number;
  originalTotalSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
  variant: {
    id: string;
    title: string;
    sku: string;
  } | null;
}

interface RawLineItemConnection {
  edges: Array<{ node: RawLineItemNode }>;
}

/**
 * Format a line-item connection into a clean array.
 * Used by getOrders, getOrderById, and getCustomerOrders.
 */
export function formatLineItems(lineItems: RawLineItemConnection) {
  return lineItems.edges.map((edge) => {
    const item = edge.node;
    return {
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      originalTotal: item.originalTotalSet.shopMoney,
      variant: item.variant
        ? {
            id: item.variant.id,
            title: item.variant.title,
            sku: item.variant.sku,
          }
        : null,
    };
  });
}

interface RawOrderNode {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalShippingPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalTaxSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    defaultEmailAddress?: { emailAddress: string } | null;
    defaultPhoneNumber?: { phoneNumber: string } | null;
  } | null;
  shippingAddress: Record<string, unknown> | null;
  lineItems: RawLineItemConnection;
  tags: string[];
  note: string | null;
}

interface RawMetaobjectNode {
  id: string;
  handle: string;
  type: string;
  displayName: string;
  updatedAt: string;
  capabilities?: {
    publishable?: { status: string } | null;
  } | null;
  fields: Array<{
    key: string;
    value: string | null;
    type: string;
  }>;
}

/**
 * Format a raw metaobject node into a flat, readable shape.
 * Used by getMetaobjects, getMetaobjectById, and the metaobject mutations.
 */
export function formatMetaobject(metaobject: RawMetaobjectNode) {
  return {
    id: metaobject.id,
    handle: metaobject.handle,
    type: metaobject.type,
    displayName: metaobject.displayName,
    updatedAt: metaobject.updatedAt,
    status: metaobject.capabilities?.publishable?.status ?? null,
    fields: metaobject.fields.map((field) => ({
      key: field.key,
      value: field.value,
      type: field.type,
    })),
  };
}

interface RawDraftOrderNode {
  id: string;
  name: string;
  status: string;
  invoiceUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalTaxSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    defaultEmailAddress?: { emailAddress: string } | null;
  } | null;
  lineItems: RawLineItemConnection;
  tags: string[];
  note2: string | null;
}

/**
 * Format a raw draft order node into the standard draft order summary shape.
 * Used by getDraftOrders and getDraftOrderById.
 */
export function formatDraftOrderSummary(draft: RawDraftOrderNode) {
  return {
    id: draft.id,
    name: draft.name,
    status: draft.status,
    invoiceUrl: draft.invoiceUrl,
    completedAt: draft.completedAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    totalPrice: draft.totalPriceSet.shopMoney,
    subtotalPrice: draft.subtotalPriceSet.shopMoney,
    totalTax: draft.totalTaxSet.shopMoney,
    customer: draft.customer
      ? {
          id: draft.customer.id,
          firstName: draft.customer.firstName,
          lastName: draft.customer.lastName,
          email: draft.customer.defaultEmailAddress?.emailAddress || null,
        }
      : null,
    lineItems: formatLineItems(draft.lineItems),
    tags: draft.tags,
    note: draft.note2,
  };
}

/**
 * Format a raw order node into the standard order summary shape.
 * Used by getOrders, getCustomerOrders, and getOrderById (as a base).
 */
export function formatOrderSummary(order: RawOrderNode) {
  return {
    id: order.id,
    name: order.name,
    createdAt: order.createdAt,
    financialStatus: order.displayFinancialStatus,
    fulfillmentStatus: order.displayFulfillmentStatus,
    totalPrice: order.totalPriceSet.shopMoney,
    subtotalPrice: order.subtotalPriceSet.shopMoney,
    totalShippingPrice: order.totalShippingPriceSet.shopMoney,
    totalTax: order.totalTaxSet.shopMoney,
    customer: order.customer
      ? {
          id: order.customer.id,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.defaultEmailAddress?.emailAddress || null,
        }
      : null,
    shippingAddress: order.shippingAddress,
    lineItems: formatLineItems(order.lineItems),
    tags: order.tags,
    note: order.note,
  };
}
