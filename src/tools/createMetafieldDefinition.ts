import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { METAFIELD_OWNER_TYPES, normalizeOwnerType } from "../lib/metafieldOwnerTypes.js";

const CreateMetafieldDefinitionInputSchema = z.object({
  ownerType: z
    .enum(METAFIELD_OWNER_TYPES)
    .describe(
      "The resource type the definition applies to (e.g. PRODUCT, ORDER, CUSTOMER). " +
        "Underscore aliases like PRODUCT_VARIANT are normalized automatically."
    ),
  key: z.string().describe("Unique identifier within the namespace (2-64 chars)"),
  name: z.string().describe("Human-readable name shown in the Shopify admin"),
  type: z
    .string()
    .describe("Metafield type, e.g. 'single_line_text_field', 'number_integer', 'json', 'list.product_reference'"),
  namespace: z.string().optional().describe("Namespace for the definition. App-reserved namespace is used if omitted."),
  description: z.string().optional().describe("Description shown in the Shopify admin"),
  pin: z.boolean().optional().describe("Pin the definition so it appears prominently in the admin"),
  validations: z
    .array(
      z.object({
        name: z.string().describe("Validation name, e.g. 'min', 'max', 'regex'"),
        value: z.string().describe("Validation value as a string"),
      })
    )
    .optional()
    .describe("Type-specific validation rules"),
});

type CreateMetafieldDefinitionInput = z.infer<typeof CreateMetafieldDefinitionInputSchema>;

let shopifyClient: GraphQLClient;

const createMetafieldDefinition = {
  name: "create-metafield-definition",
  description:
    "Create a metafield definition, which declares a reusable custom field on a resource type. Set values on individual resources with set-metafields.",
  schema: CreateMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetafieldDefinitionInput) => {
    try {
      const query = gql`
        #graphql

        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
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
        name: input.name,
        type: input.type,
      };

      if (input.namespace) definition.namespace = input.namespace;
      if (input.description) definition.description = input.description;
      if (input.pin !== undefined) definition.pin = input.pin;
      if (input.validations) definition.validations = input.validations;

      const data = (await shopifyClient.request(query, { definition })) as {
        metafieldDefinitionCreate: {
          createdDefinition: any | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metafieldDefinitionCreate.userErrors, "create metafield definition");

      return { definition: data.metafieldDefinitionCreate.createdDefinition };
    } catch (error) {
      handleToolError("create metafield definition", error);
    }
  },
};

export { createMetafieldDefinition };
