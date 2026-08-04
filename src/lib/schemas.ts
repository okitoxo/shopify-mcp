import { z } from "zod";

/**
 * Mailing address schema shared by createDraftOrder / updateDraftOrder
 * (shipping + billing) and manageCustomerAddress.
 * Uses countryCode/provinceCode (API input type).
 *
 * NOTE: updateOrder.shippingAddress intentionally uses country/province
 * (different Shopify input type) and is NOT shared here.
 *
 * This is a factory, not a shared const, on purpose. The MCP SDK converts
 * tool schemas with zod-to-json-schema, which dedupes a repeated Zod object
 * *identity* within one schema into `$ref: "#/properties/<first occurrence>"`.
 * Clients that resolve $ref only against `$defs` (mcpo, which asserts
 * `ref in schema_defs`) crash on that pointer. Building a fresh instance per
 * call site keeps every occurrence inlined and the schema self-contained.
 */
export const shippingAddressSchema = () =>
  z.object({
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
