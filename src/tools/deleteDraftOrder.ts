import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const DeleteDraftOrderInputSchema = z.object({
  draftOrderId: z.string().describe("The draft order GID to delete, e.g. gid://shopify/DraftOrder/123"),
});

type DeleteDraftOrderInput = z.infer<typeof DeleteDraftOrderInputSchema>;

let shopifyClient: GraphQLClient;

const deleteDraftOrder = {
  name: "delete-draft-order",
  description: "Delete a draft order. This cannot be undone.",
  schema: DeleteDraftOrderInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteDraftOrderInput) => {
    try {
      const query = gql`
        #graphql

        mutation draftOrderDelete($input: DraftOrderDeleteInput!) {
          draftOrderDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        input: { id: input.draftOrderId },
      })) as {
        draftOrderDelete: {
          deletedId: string | null;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.draftOrderDelete.userErrors, "delete draft order");

      return { deletedId: data.draftOrderDelete.deletedId };
    } catch (error) {
      handleToolError("delete draft order", error);
    }
  },
};

export { deleteDraftOrder };
