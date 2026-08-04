import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { formatDraftOrderSummary } from "../lib/formatters/index.js";
import { DRAFT_ORDER_FIELDS, DRAFT_ORDER_LINE_ITEM_FIELDS } from "../lib/graphql/draftOrder.js";
import { shippingAddressSchema } from "../lib/schemas.js";

const CreateDraftOrderInputSchema = z.object({
  lineItems: z
    .array(
      z.object({
        variantId: z.string().optional().describe("Product variant GID. Required for existing products, omit for custom line items."),
        title: z.string().optional().describe("Title for custom line items (ignored when variantId is set)"),
        quantity: z.number().describe("Quantity of the line item"),
        originalUnitPriceWithCurrency: z
          .object({
            amount: z.string().describe("Price amount as string"),
            currencyCode: z.string().describe("Currency code, e.g. 'USD'"),
          })
          .optional()
          .describe("Custom price for custom line items"),
        sku: z.string().optional().describe("SKU for custom line items"),
        taxable: z.boolean().optional().describe("Whether custom line item is taxable"),
        requiresShipping: z.boolean().optional().describe("Whether custom line item requires shipping"),
      })
    )
    .min(1)
    .describe("Line items (max 499). Use variantId for existing products or title+price for custom items."),
  customerId: z.string().optional().describe("Customer GID to associate with the draft order"),
  email: z.string().optional().describe("Customer email"),
  phone: z.string().optional().describe("Customer phone"),
  note: z.string().optional().describe("Note for the draft order"),
  tags: z.array(z.string()).optional().describe("Tags for the draft order"),
  shippingAddress: shippingAddressSchema().optional(),
  billingAddress: shippingAddressSchema().optional(),
  useCustomerDefaultAddress: z.boolean().optional().describe("Use customer's default address"),
  taxExempt: z.boolean().optional().describe("Whether the draft order is tax exempt"),
  poNumber: z.string().optional().describe("Purchase order number"),
  appliedDiscount: z
    .object({
      title: z.string().optional().describe("Discount title"),
      description: z.string().optional(),
      value: z.number().describe("Discount value"),
      valueType: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]).describe("Whether value is fixed or percentage"),
    })
    .optional()
    .describe("Order-level discount"),
});

type CreateDraftOrderInput = z.infer<typeof CreateDraftOrderInputSchema>;

let shopifyClient: GraphQLClient;

const createDraftOrder = {
  name: "create-draft-order",
  description:
    "Create a draft order for phone/chat sales, invoicing, or wholesale. Supports custom line items, discounts, and customer association.",
  schema: CreateDraftOrderInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateDraftOrderInput) => {
    try {
      const query = gql`
        #graphql

        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              ${DRAFT_ORDER_FIELDS}
              lineItems(first: 50) {
                edges {
                  node {
                    ${DRAFT_ORDER_LINE_ITEM_FIELDS}
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const draftInput: Record<string, any> = {
        lineItems: input.lineItems,
      };

      if (input.customerId) {
        draftInput.purchasingEntity = { customerId: input.customerId };
      }
      if (input.email) draftInput.email = input.email;
      if (input.phone) draftInput.phone = input.phone;
      if (input.note) draftInput.note = input.note;
      if (input.tags) draftInput.tags = input.tags;
      if (input.shippingAddress) draftInput.shippingAddress = input.shippingAddress;
      if (input.billingAddress) draftInput.billingAddress = input.billingAddress;
      if (input.useCustomerDefaultAddress !== undefined)
        draftInput.useCustomerDefaultAddress = input.useCustomerDefaultAddress;
      if (input.taxExempt !== undefined) draftInput.taxExempt = input.taxExempt;
      if (input.poNumber) draftInput.poNumber = input.poNumber;
      if (input.appliedDiscount) draftInput.appliedDiscount = input.appliedDiscount;

      const data = (await shopifyClient.request(query, { input: draftInput })) as {
        draftOrderCreate: {
          draftOrder: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.draftOrderCreate.userErrors, "create draft order");

      return { draftOrder: formatDraftOrderSummary(data.draftOrderCreate.draftOrder) };
    } catch (error) {
      handleToolError("create draft order", error);
    }
  },
};

export { createDraftOrder };
