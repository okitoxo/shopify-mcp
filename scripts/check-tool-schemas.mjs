#!/usr/bin/env node
/**
 * Validates the JSON Schema every tool exposes over MCP `tools/list`.
 *
 * Reproduces exactly what @modelcontextprotocol/sdk does in
 * server/mcp.js -> zodToJsonSchema(z.object(shape), { strictUnions: true }),
 * then asserts the result is portable across MCP clients.
 *
 * The rule that matters: a `$ref` is only resolvable by clients that rebuild
 * the schema from `$defs` alone (mcpo does `assert ref in schema_defs`, where
 * schema_defs is inputSchema["$defs"]). zod-to-json-schema's default
 * $refStrategy is "root", so reusing the same Zod object identity twice in one
 * tool emits `$ref: "#/properties/<first occurrence>"` — valid JSON Schema,
 * but a hard crash on those clients. Keep tool schemas $ref-free by building a
 * fresh Zod instance per field (see src/lib/schemas.ts).
 *
 * Run: npm run check:schemas   (requires a build; see prepublishOnly)
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tools } from "../dist/tools/registry.js";

function collectRefs(node, path, out) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectRefs(item, `${path}[${i}]`, out));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string") out.push({ path, ref: value });
    else collectRefs(value, `${path}/${key}`, out);
  }
}

const failures = [];

for (const tool of tools) {
  const schema = zodToJsonSchema(z.object(tool.schema.shape), { strictUnions: true });

  const refs = [];
  collectRefs(schema, "", refs);
  const defs = schema.$defs ?? {};

  for (const { path, ref } of refs) {
    if (!ref.startsWith("#/$defs/")) {
      failures.push(
        `${tool.name}: $ref at ${path || "<root>"} points outside $defs -> "${ref}"`,
      );
      continue;
    }
    const name = ref.slice("#/$defs/".length);
    if (!(name in defs)) {
      failures.push(`${tool.name}: $ref at ${path || "<root>"} is unresolved -> "${ref}"`);
    }
  }

  if (schema.definitions) {
    failures.push(
      `${tool.name}: uses draft-07 "definitions" (keys: ${Object.keys(schema.definitions).join(", ")}); ` +
        `clients reading only "$defs" will not find them`,
    );
  }
}

if (failures.length > 0) {
  console.error(`Tool schema check FAILED (${failures.length} problem(s)):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nFix: stop sharing one Zod object across multiple fields of the same tool.\n" +
      "Export a factory that returns a fresh instance per call site instead.",
  );
  process.exit(1);
}

console.log(`Tool schema check passed: ${tools.length} tools, no unresolvable $ref.`);
