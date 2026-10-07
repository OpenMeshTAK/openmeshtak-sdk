import { readFileSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const api = packageJson.openmeshtak;

if (
  typeof packageJson.version !== "string" ||
  typeof api?.apiVersionRange !== "string" ||
  typeof api?.openApiVersion !== "string"
) {
  throw new Error("package.json is missing SDK or OpenMeshTak API version metadata.");
}

const moduleSource = `/** Generated from package.json by \`pnpm generate\`; do not edit manually. */
export const SDK_VERSION = ${JSON.stringify(packageJson.version)} as const;
export const SUPPORTED_API_VERSION_RANGE = ${JSON.stringify(api.apiVersionRange)} as const;
export const OPENAPI_SOURCE_VERSION = ${JSON.stringify(api.openApiVersion)} as const;
`;

writeFileSync("src/version.ts", moduleSource);
