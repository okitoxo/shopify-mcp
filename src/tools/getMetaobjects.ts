import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError, type ShopifyConnection } from "../lib/toolUtils.js";
import { formatMetaobject } from "../lib/formatters.js";

const GetMetaobjectsInputSchema = z.object({
  type: z
    .string()
    .describe("The metaobject definition type, e.g. 'size_chart'. Use get-metaobject-definitions to discover available types."),
  limit: z.number().default(10).describe("Number of metaobjects to return"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  sortKey: z
    .enum(["id", "type", "updated_at", "display_name"])
    .optional()
    .describe("Field to sort by"),
  reverse: z.boolean().optional().describe("Reverse the sort order"),
  query: z
    .string()
    .optional()
    .describe("Filter query, e.g. 'display_name:winter' or 'fields.season:winter'"),
});

type GetMetaobjectsInput = z.infer<typeof GetMetaobjectsInputSchema>;

let shopifyClient: GraphQLClient;

const getMetaobjects = {
  name: "get-metaobjects",
  description:
    "List metaobjects of a given type, with filtering, pagination, and sorting. Requires the definition type.",
  schema: GetMetaobjectsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetaobjectsInput) => {
    try {
      const query = gql`
        #graphql

        query GetMetaobjects(
          $type: String!
          $first: Int!
          $after: String
          $before: String
          $sortKey: String
          $reverse: Boolean
          $query: String
        ) {
          metaobjects(
            type: $type
            first: $first
            after: $after
            before: $before
            sortKey: $sortKey
            reverse: $reverse
            query: $query
          ) {
            edges {
              node {
                id
                handle
                type
                displayName
                updatedAt
                capabilities {
                  publishable {
                    status
                  }
                }
                fields {
                  key
                  value
                  type
                }
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
        type: input.type,
        first: input.limit,
        ...(input.after && { after: input.after }),
        ...(input.before && { before: input.before }),
        ...(input.sortKey && { sortKey: input.sortKey }),
        ...(input.reverse !== undefined && { reverse: input.reverse }),
        ...(input.query && { query: input.query }),
      };

      const data = (await shopifyClient.request(query, variables)) as {
        metaobjects: ShopifyConnection<any>;
      };

      return {
        metaobjects: edgesToNodes(data.metaobjects).map(formatMetaobject),
        pageInfo: data.metaobjects.pageInfo,
      };
    } catch (error) {
      handleToolError("fetch metaobjects", error);
    }
  },
};

export { getMetaobjects };
