/**
 * Shared MetafieldOwnerType handling for the metafield definition tools.
 *
 * Some Shopify enum values are concatenated rather than underscore-separated
 * (PRODUCTVARIANT, not PRODUCT_VARIANT). Both spellings are accepted from
 * callers and normalized to the API's spelling before the request.
 */

export const METAFIELD_OWNER_TYPES = [
  "API_PERMISSION",
  "ARTICLE",
  "BLOG",
  "CART_TRANSFORM",
  "CARTTRANSFORM",
  "COLLECTION",
  "COMPANY",
  "COMPANY_LOCATION",
  "CUSTOMER",
  "DELIVERY_CUSTOMIZATION",
  "DISCOUNT",
  "DRAFT_ORDER",
  "DRAFTORDER",
  "FULFILLMENT_CONSTRAINT_RULE",
  "GIFT_CARD_TRANSACTION",
  "LOCATION",
  "MARKET",
  "MEDIA_IMAGE",
  "ORDER",
  "ORDER_ROUTING_LOCATION_RULE",
  "PAGE",
  "PAYMENT_CUSTOMIZATION",
  "PRODUCT",
  "PRODUCT_VARIANT",
  "PRODUCTVARIANT",
  "SELLING_PLAN",
  "SHOP",
  "VALIDATION",
] as const;

export type MetafieldOwnerType = (typeof METAFIELD_OWNER_TYPES)[number];

/** Map common underscore aliases to their correct Shopify API enum values */
const OWNER_TYPE_NORMALIZE: Record<string, string> = {
  PRODUCT_VARIANT: "PRODUCTVARIANT",
  DRAFT_ORDER: "DRAFTORDER",
  CART_TRANSFORM: "CARTTRANSFORM",
};

export function normalizeOwnerType(ownerType: string): string {
  return OWNER_TYPE_NORMALIZE[ownerType] ?? ownerType;
}
