import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const DeleteMetaobjectInputSchema = z.object({
  metaobjectId: z.string().describe("The metaobject GID to delete, e.g. gid://shopify/Metaobject/123"),
});

type DeleteMetaobjectInput = z.infer<typeof DeleteMetaobjectInputSchema>;

let shopifyClient: GraphQLClient;

const deleteMetaobject = {
  name: "delete-metaobject",
  description:
    "Delete a metaobject entry. This cannot be undone, and any references to it from other resources are broken.",
  schema: DeleteMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetaobjectInput) => {
    try {
      const query = gql`
        #graphql

        mutation metaobjectDelete($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, { id: input.metaobjectId })) as {
        metaobjectDelete: {
          deletedId: string | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metaobjectDelete.userErrors, "delete metaobject");

      return { deletedId: data.metaobjectDelete.deletedId };
    } catch (error) {
      handleToolError("delete metaobject", error);
    }
  },
};

export { deleteMetaobject };
