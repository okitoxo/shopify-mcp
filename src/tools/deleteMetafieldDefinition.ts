import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { METAFIELD_OWNER_TYPES, normalizeOwnerType } from "../lib/metafieldOwnerTypes.js";

const DeleteMetafieldDefinitionInputSchema = z.object({
  definitionId: z
    .string()
    .optional()
    .describe("The definition GID, e.g. gid://shopify/MetafieldDefinition/123"),
  ownerType: z
    .enum(METAFIELD_OWNER_TYPES)
    .optional()
    .describe("Resource type. Use with key (and namespace) instead of definitionId."),
  key: z.string().optional().describe("Definition key. Use with ownerType instead of definitionId."),
  namespace: z.string().optional().describe("Definition namespace, when identifying by ownerType + key"),
  deleteAllAssociatedMetafields: z
    .boolean()
    .default(false)
    .describe(
      "Also delete every metafield value stored under this definition across all resources. Destructive and irreversible."
    ),
});

type DeleteMetafieldDefinitionInput = z.infer<typeof DeleteMetafieldDefinitionInputSchema>;

let shopifyClient: GraphQLClient;

const deleteMetafieldDefinition = {
  name: "delete-metafield-definition",
  description:
    "Delete a metafield definition, identified by GID or by ownerType + key. Set deleteAllAssociatedMetafields to also erase the stored values on every resource.",
  schema: DeleteMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetafieldDefinitionInput) => {
    try {
      if (!input.definitionId && !(input.ownerType && input.key)) {
        throw new Error("Provide either definitionId, or both ownerType and key");
      }

      const query = gql`
        #graphql

        mutation metafieldDefinitionDelete(
          $id: ID
          $identifier: MetafieldDefinitionIdentifierInput
          $deleteAllAssociatedMetafields: Boolean
        ) {
          metafieldDefinitionDelete(
            id: $id
            identifier: $identifier
            deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields
          ) {
            deletedDefinitionId
            deletedDefinition {
              ownerType
              namespace
              key
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables: Record<string, any> = {
        deleteAllAssociatedMetafields: input.deleteAllAssociatedMetafields,
      };

      if (input.definitionId) {
        variables.id = input.definitionId;
      } else {
        variables.identifier = {
          ownerType: normalizeOwnerType(input.ownerType!),
          key: input.key,
          ...(input.namespace && { namespace: input.namespace }),
        };
      }

      const data = (await shopifyClient.request(query, variables)) as {
        metafieldDefinitionDelete: {
          deletedDefinitionId: string | null;
          deletedDefinition: any | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metafieldDefinitionDelete.userErrors, "delete metafield definition");

      return {
        deletedDefinitionId: data.metafieldDefinitionDelete.deletedDefinitionId,
        deletedDefinition: data.metafieldDefinitionDelete.deletedDefinition,
      };
    } catch (error) {
      handleToolError("delete metafield definition", error);
    }
  },
};

export { deleteMetafieldDefinition };
