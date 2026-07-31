import {
  formatCustomerSummary,
  shopMoney,
  type RawCustomerSummary,
  type RawMoneyBag,
} from "./common.js";

interface RawLineItemNode {
  id: string;
  title: string;
  quantity: number;
  originalTotalSet: RawMoneyBag;
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
      originalTotal: shopMoney(item.originalTotalSet),
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
  totalPriceSet: RawMoneyBag;
  subtotalPriceSet: RawMoneyBag;
  totalShippingPriceSet: RawMoneyBag;
  totalTaxSet: RawMoneyBag;
  customer: RawCustomerSummary | null;
  shippingAddress: Record<string, unknown> | null;
  lineItems: RawLineItemConnection;
  tags: string[];
  note: string | null;
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
    totalPrice: shopMoney(order.totalPriceSet),
    subtotalPrice: shopMoney(order.subtotalPriceSet),
    totalShippingPrice: shopMoney(order.totalShippingPriceSet),
    totalTax: shopMoney(order.totalTaxSet),
    customer: formatCustomerSummary(order.customer),
    shippingAddress: order.shippingAddress,
    lineItems: formatLineItems(order.lineItems),
    tags: order.tags,
    note: order.note,
  };
}
