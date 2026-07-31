interface RawMetaobjectNode {
  id: string;
  handle: string;
  type: string;
  displayName: string;
  updatedAt: string;
  capabilities?: {
    publishable?: { status: string } | null;
  } | null;
  fields: Array<{
    key: string;
    value: string | null;
    type: string;
  }>;
}

/**
 * Format a raw metaobject node into a flat, readable shape.
 * Used by getMetaobjects, getMetaobjectById, and the metaobject mutations.
 */
export function formatMetaobject(metaobject: RawMetaobjectNode) {
  return {
    id: metaobject.id,
    handle: metaobject.handle,
    type: metaobject.type,
    displayName: metaobject.displayName,
    updatedAt: metaobject.updatedAt,
    status: metaobject.capabilities?.publishable?.status ?? null,
    fields: metaobject.fields.map((field) => ({
      key: field.key,
      value: field.value,
      type: field.type,
    })),
  };
}
