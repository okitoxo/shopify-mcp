import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { formatMetaobject } from "../lib/formatters.js";

const CreateMetaobjectInputSchema = z.object({
  type: z
    .string()
    .describe("The metaobject definition type, e.g. 'size_chart'. Use get-metaobject-definitions to discover available types."),
  handle: z.string().optional().describe("Unique handle within the type. Auto-generated if omitted."),
  fields: z
    .array(
      z.object({
        key: z.string().describe("Field key as defined in the metaobject definition"),
        value: z.string().describe("Field value, always passed as a string (JSON-encoded for list/reference types)"),
      })
    )
    .min(1)
    .describe("Field values for the metaobject. Keys must match the definition's field definitions."),
  status: z
    .enum(["ACTIVE", "DRAFT"])
    .optional()
    .describe("Publishable status. Only applies when the definition has the publishable capability enabled."),
});

type CreateMetaobjectInput = z.infer<typeof CreateMetaobjectInputSchema>;

let shopifyClient: GraphQLClient;

const createMetaobject = {
  name: "create-metaobject",
  description:
    "Create a metaobject entry for an existing metaobject definition. Use get-metaobject-definitions first to learn the type and its field keys.",
  schema: CreateMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetaobjectInput) => {
    try {
      const query = gql`
        #graphql

        mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
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
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const metaobjectInput: Record<string, any> = {
        type: input.type,
        fields: input.fields,
      };

      if (input.handle) metaobjectInput.handle = input.handle;
      if (input.status) {
        metaobjectInput.capabilities = { publishable: { status: input.status } };
      }

      const data = (await shopifyClient.request(query, { metaobject: metaobjectInput })) as {
        metaobjectCreate: {
          metaobject: any | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metaobjectCreate.userErrors, "create metaobject");

      return { metaobject: formatMetaobject(data.metaobjectCreate.metaobject) };
    } catch (error) {
      handleToolError("create metaobject", error);
    }
  },
};

export { createMetaobject };
