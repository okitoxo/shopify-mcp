import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { METAFIELD_OWNER_TYPES, normalizeOwnerType } from "../lib/metafieldOwnerTypes.js";

const UpdateMetafieldDefinitionInputSchema = z.object({
  ownerType: z
    .enum(METAFIELD_OWNER_TYPES)
    .describe("The resource type the definition applies to. Identifies the definition together with namespace + key."),
  key: z.string().describe("Key of the definition to update"),
  namespace: z.string().optional().describe("Namespace of the definition to update"),
  name: z.string().optional().describe("New human-readable name"),
  description: z.string().optional().describe("New description"),
  pin: z.boolean().optional().describe("Pin or unpin the definition in the admin"),
  validations: z
    .array(
      z.object({
        name: z.string().describe("Validation name, e.g. 'min', 'max', 'regex'"),
        value: z.string().describe("Validation value as a string"),
      })
    )
    .optional()
    .describe("Type-specific validation rules. The metafield type itself cannot be changed after creation."),
});

type UpdateMetafieldDefinitionInput = z.infer<typeof UpdateMetafieldDefinitionInputSchema>;

let shopifyClient: GraphQLClient;

const updateMetafieldDefinition = {
  name: "update-metafield-definition",
  description:
    "Update an existing metafield definition (name, description, pinning, validations). The definition's type cannot be changed after creation.",
  schema: UpdateMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMetafieldDefinitionInput) => {
    try {
      const query = gql`
        #graphql

        mutation metafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {
          metafieldDefinitionUpdate(definition: $definition) {
            updatedDefinition {
              id
              namespace
              key
              name
              description
              ownerType
              pinnedPosition
              type {
                name
                category
              }
              validations {
                name
                type
                value
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

      const definition: Record<string, any> = {
        ownerType: normalizeOwnerType(input.ownerType),
        key: input.key,
      };

      if (input.namespace) definition.namespace = input.namespace;
      if (input.name) definition.name = input.name;
      if (input.description) definition.description = input.description;
      if (input.pin !== undefined) definition.pin = input.pin;
      if (input.validations) definition.validations = input.validations;

      const data = (await shopifyClient.request(query, { definition })) as {
        metafieldDefinitionUpdate: {
          updatedDefinition: any | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metafieldDefinitionUpdate.userErrors, "update metafield definition");

      return { definition: data.metafieldDefinitionUpdate.updatedDefinition };
    } catch (error) {
      handleToolError("update metafield definition", error);
    }
  },
};

export { updateMetafieldDefinition };
