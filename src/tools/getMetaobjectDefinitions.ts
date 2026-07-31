import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetMetaobjectDefinitionsInputSchema = z.object({
  first: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .describe("Number of definitions to return (default 50, max 100)"),
  after: z.string().optional().describe("Cursor for pagination"),
});

type GetMetaobjectDefinitionsInput = z.infer<typeof GetMetaobjectDefinitionsInputSchema>;

let shopifyClient: GraphQLClient;

const getMetaobjectDefinitions = {
  name: "get-metaobject-definitions",
  description:
    "Discover which metaobject types exist in the store, with their field definitions. Call this first to learn the `type` and field keys needed by the other metaobject tools.",
  schema: GetMetaobjectDefinitionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetaobjectDefinitionsInput) => {
    try {
      const query = gql`
        #graphql

        query GetMetaobjectDefinitions($first: Int!, $after: String) {
          metaobjectDefinitions(first: $first, after: $after) {
            edges {
              node {
                id
                type
                name
                description
                displayNameKey
                metaobjectsCount
                fieldDefinitions {
                  key
                  name
                  description
                  required
                  type {
                    name
                    category
                  }
                }
                capabilities {
                  publishable {
                    enabled
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        first: input.first ?? 50,
        ...(input.after && { after: input.after }),
      })) as { metaobjectDefinitions: any };

      const definitions = edgesToNodes(data.metaobjectDefinitions);

      return {
        definitionsCount: definitions.length,
        definitions,
        pageInfo: data.metaobjectDefinitions.pageInfo,
      };
    } catch (error) {
      handleToolError("fetch metaobject definitions", error);
    }
  },
};

export { getMetaobjectDefinitions };
