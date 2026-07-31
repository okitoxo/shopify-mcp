import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";
import { formatDraftOrderSummary } from "../lib/formatters/index.js";
import {
  DRAFT_ORDER_FIELDS,
  DRAFT_ORDER_LINE_ITEM_FIELDS,
  DRAFT_ORDER_PAYMENT_TERMS_FIELDS,
} from "../lib/graphql/draftOrder.js";

const GetDraftOrderByIdInputSchema = z.object({
  draftOrderId: z.string().describe("The draft order GID, e.g. gid://shopify/DraftOrder/123"),
  lineItemLimit: z.number().default(50).describe("Maximum number of line items to return (max 250)"),
  includePaymentTerms: z
    .boolean()
    .default(false)
    .describe(
      "Include payment terms (net days, schedule type). Requires the read_payment_terms access scope; the request fails if the app doesn't have it."
    ),
});

type GetDraftOrderByIdInput = z.infer<typeof GetDraftOrderByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getDraftOrderById = {
  name: "get-draft-order-by-id",
  description:
    "Get a single draft order by its GID, including the full quote breakdown: line-item and order-level discounts, discount codes, automatic discounts, shipping, taxes and totals",
  schema: GetDraftOrderByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetDraftOrderByIdInput) => {
    try {
      const query = gql`
        #graphql

        query GetDraftOrderById($id: ID!, $lineItemLimit: Int!) {
          draftOrder(id: $id) {
            ${DRAFT_ORDER_FIELDS}
            ${input.includePaymentTerms ? DRAFT_ORDER_PAYMENT_TERMS_FIELDS : ""}
            lineItems(first: $lineItemLimit) {
              edges {
                node {
                  ${DRAFT_ORDER_LINE_ITEM_FIELDS}
                }
              }
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        id: input.draftOrderId,
        lineItemLimit: input.lineItemLimit,
      })) as {
        draftOrder: any | null;
      };

      if (!data.draftOrder) {
        throw new Error(`Draft order not found: ${input.draftOrderId}`);
      }

      return { draftOrder: formatDraftOrderSummary(data.draftOrder) };
    } catch (error) {
      handleToolError("fetch draft order", error);
    }
  },
};

export { getDraftOrderById };
