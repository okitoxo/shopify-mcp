import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";
import { formatMetaobject } from "../lib/formatters/index.js";

const GetMetaobjectByIdInputSchema = z.object({
  metaobjectId: z
    .string()
    .optional()
    .describe("The metaobject GID, e.g. gid://shopify/Metaobject/123"),
  type: z.string().optional().describe("Metaobject definition type. Use together with handle instead of metaobjectId."),
  handle: z.string().optional().describe("Metaobject handle. Use together with type instead of metaobjectId."),
});

type GetMetaobjectByIdInput = z.infer<typeof GetMetaobjectByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getMetaobjectById = {
  name: "get-metaobject-by-id",
  description:
    "Get a single metaobject, looked up either by GID or by type + handle.",
  schema: GetMetaobjectByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetaobjectByIdInput) => {
    try {
      if (!input.metaobjectId && !(input.type && input.handle)) {
        throw new Error("Provide either metaobjectId, or both type and handle");
      }

      if (input.metaobjectId) {
        const query = gql`
          #graphql

          query GetMetaobjectById($id: ID!) {
            metaobject(id: $id) {
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
        `;

        const data = (await shopifyClient.request(query, { id: input.metaobjectId })) as {
          metaobject: any | null;
        };

        if (!data.metaobject) {
          throw new Error(`Metaobject not found: ${input.metaobjectId}`);
        }

        return { metaobject: formatMetaobject(data.metaobject) };
      }

      const query = gql`
        #graphql

        query GetMetaobjectByHandle($handle: MetaobjectHandleInput!) {
          metaobjectByHandle(handle: $handle) {
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
      `;

      const data = (await shopifyClient.request(query, {
        handle: { type: input.type, handle: input.handle },
      })) as { metaobjectByHandle: any | null };

      if (!data.metaobjectByHandle) {
        throw new Error(`Metaobject not found: type '${input.type}', handle '${input.handle}'`);
      }

      return { metaobject: formatMetaobject(data.metaobjectByHandle) };
    } catch (error) {
      handleToolError("fetch metaobject", error);
    }
  },
};

export { getMetaobjectById };
