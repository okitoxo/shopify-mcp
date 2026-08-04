# Changelog

## 2.0.1

### Fixed

- **mcpo compatibility**: `create-draft-order` and `update-draft-order` no longer emit a
  `$ref` in their JSON Schema. Both tools reused a single Zod object for `shippingAddress`
  and `billingAddress`; the MCP SDK converts tool schemas with `zod-to-json-schema` under
  its default `$refStrategy: "root"`, which deduped the second occurrence into
  `{"$ref": "#/properties/shippingAddress"}`. Clients that rebuild the schema from `$defs`
  alone — [mcpo](https://github.com/open-webui/mcpo) asserts `ref in schema_defs`, where
  `schema_defs` is `inputSchema["$defs"]` — crashed at startup with
  `AssertionError: Custom field not found`. `shippingAddressSchema` is now a factory that
  returns a fresh instance per call site, so every address is inlined.

### Added

- `npm run check:schemas` — validates that no tool emits an unresolvable `$ref` (or
  draft-07 `definitions`), so this class of client incompatibility cannot regress. Runs in
  CI on every push/PR and as part of `prepublishOnly`.
