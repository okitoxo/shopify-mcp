import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";
import { formatDraftOrderSummary } from "../lib/formatters.js";

const GetDraftOrderByIdInputSchema = z.object({
  draftOrderId: z.string().describe("The draft order GID, e.g. gid://shopify/DraftOrder/123"),
});

type GetDraftOrderByIdInput = z.infer<typeof GetDraftOrderByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getDraftOrderById = {
  name: "get-draft-order-by-id",
  description: "Get a single draft order by its GID",
  schema: GetDraftOrderByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetDraftOrderByIdInput) => {
    try {
      const query = gql`
        #graphql

        query GetDraftOrderById($id: ID!) {
          draftOrder(id: $id) {
            id
            name
            status
            invoiceUrl
            completedAt
            createdAt
            updatedAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalTaxSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              id
              firstName
              lastName
              defaultEmailAddress {
                emailAddress
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  originalTotalSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  variant {
                    id
                    title
                    sku
                  }
                }
              }
            }
            tags
            note2
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.draftOrderId })) as {
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
