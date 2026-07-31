import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError, edgesToNodes, type ShopifyConnection } from "../lib/toolUtils.js";
import { formatDraftOrderSummary } from "../lib/formatters.js";

const GetDraftOrdersInputSchema = z.object({
  status: z.enum(["any", "open", "invoice_sent", "completed"]).default("any"),
  limit: z.number().default(10),
  after: z.string().optional().describe("Cursor for forward pagination"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  sortKey: z
    .enum(["CUSTOMER_NAME", "ID", "NUMBER", "RELEVANCE", "STATUS", "TOTAL_PRICE", "UPDATED_AT"])
    .optional()
    .describe("Sort key for draft orders"),
  reverse: z.boolean().optional().describe("Reverse the sort order"),
  query: z.string().optional().describe("Raw query string for advanced filtering (e.g. 'customer_id:123')"),
});

type GetDraftOrdersInput = z.infer<typeof GetDraftOrdersInputSchema>;

let shopifyClient: GraphQLClient;

const getDraftOrders = {
  name: "get-draft-orders",
  description: "Get draft orders with optional filtering by status",
  schema: GetDraftOrdersInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetDraftOrdersInput) => {
    try {
      const { status, limit, after, before, sortKey, reverse, query: rawQuery } = input;

      const queryParts: string[] = [];
      if (status !== "any") {
        queryParts.push(`status:${status}`);
      }
      if (rawQuery) {
        queryParts.push(rawQuery);
      }
      const queryFilter = queryParts.join(" ") || undefined;

      const query = gql`
        #graphql

        query GetDraftOrders(
          $first: Int!
          $query: String
          $after: String
          $before: String
          $sortKey: DraftOrderSortKeys
          $reverse: Boolean
        ) {
          draftOrders(first: $first, query: $query, after: $after, before: $before, sortKey: $sortKey, reverse: $reverse) {
            edges {
              node {
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
                lineItems(first: 20) {
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
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: limit,
        query: queryFilter,
        ...(after && { after }),
        ...(before && { before }),
        ...(sortKey && { sortKey }),
        ...(reverse !== undefined && { reverse }),
      };

      const data = (await shopifyClient.request(query, variables)) as {
        draftOrders: ShopifyConnection<any>;
      };

      const draftOrders = edgesToNodes(data.draftOrders).map(formatDraftOrderSummary);

      return {
        draftOrders,
        pageInfo: data.draftOrders.pageInfo,
      };
    } catch (error) {
      handleToolError("fetch draft orders", error);
    }
  },
};

export { getDraftOrders };
