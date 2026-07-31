import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { formatMetaobject } from "../lib/formatters.js";

const UpdateMetaobjectInputSchema = z.object({
  metaobjectId: z.string().describe("The metaobject GID to update, e.g. gid://shopify/Metaobject/123"),
  handle: z.string().optional().describe("New handle for the metaobject"),
  fields: z
    .array(
      z.object({
        key: z.string().describe("Field key as defined in the metaobject definition"),
        value: z.string().describe("Field value, always passed as a string (JSON-encoded for list/reference types)"),
      })
    )
    .optional()
    .describe("Fields to patch. Only the keys provided are modified; omitted fields keep their current values."),
  status: z
    .enum(["ACTIVE", "DRAFT"])
    .optional()
    .describe("Publishable status. Only applies when the definition has the publishable capability enabled."),
  redirectNewHandle: z
    .boolean()
    .optional()
    .describe("When changing the handle, create a redirect from the old handle"),
});

type UpdateMetaobjectInput = z.infer<typeof UpdateMetaobjectInputSchema>;

let shopifyClient: GraphQLClient;

const updateMetaobject = {
  name: "update-metaobject",
  description:
    "Update an existing metaobject entry. Fields are patched individually, so omitted field keys keep their current values.",
  schema: UpdateMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMetaobjectInput) => {
    try {
      const query = gql`
        #graphql

        mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
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

      const metaobjectInput: Record<string, any> = {};

      if (input.handle) metaobjectInput.handle = input.handle;
      if (input.fields) metaobjectInput.fields = input.fields;
      if (input.status) {
        metaobjectInput.capabilities = { publishable: { status: input.status } };
      }
      if (input.redirectNewHandle !== undefined) {
        metaobjectInput.redirectNewHandle = input.redirectNewHandle;
      }

      const data = (await shopifyClient.request(query, {
        id: input.metaobjectId,
        metaobject: metaobjectInput,
      })) as {
        metaobjectUpdate: {
          metaobject: any | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metaobjectUpdate.userErrors, "update metaobject");

      return { metaobject: formatMetaobject(data.metaobjectUpdate.metaobject) };
    } catch (error) {
      handleToolError("update metaobject", error);
    }
  },
};

export { updateMetaobject };
