import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { formatDraftOrderSummary } from "../lib/formatters/index.js";
import { DRAFT_ORDER_FIELDS, DRAFT_ORDER_LINE_ITEM_FIELDS } from "../lib/graphql/draftOrder.js";
import { shippingAddressSchema } from "../lib/schemas.js";

const UpdateDraftOrderInputSchema = z.object({
  draftOrderId: z.string().describe("The draft order GID to update, e.g. gid://shopify/DraftOrder/123"),
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
    .optional()
    .describe("Replaces the full set of line items (max 499). Omit to leave line items unchanged."),
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

type UpdateDraftOrderInput = z.infer<typeof UpdateDraftOrderInputSchema>;

let shopifyClient: GraphQLClient;

const updateDraftOrder = {
  name: "update-draft-order",
  description:
    "Update an existing draft order. Note: updating a draft order unlinks any checkout that was already started for it.",
  schema: UpdateDraftOrderInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateDraftOrderInput) => {
    try {
      const query = gql`
        #graphql

        mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
          draftOrderUpdate(id: $id, input: $input) {
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

      const draftInput: Record<string, any> = {};

      if (input.lineItems) draftInput.lineItems = input.lineItems;
      if (input.customerId) draftInput.purchasingEntity = { customerId: input.customerId };
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

      const data = (await shopifyClient.request(query, {
        id: input.draftOrderId,
        input: draftInput,
      })) as {
        draftOrderUpdate: {
          draftOrder: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.draftOrderUpdate.userErrors, "update draft order");

      return { draftOrder: formatDraftOrderSummary(data.draftOrderUpdate.draftOrder) };
    } catch (error) {
      handleToolError("update draft order", error);
    }
  },
};

export { updateDraftOrder };
