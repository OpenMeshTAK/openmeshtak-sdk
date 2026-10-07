import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.argv[2] ?? "../openmeshtak/openapi/openapi.json");
const bytes = readFileSync(sourcePath);
const document = JSON.parse(bytes.toString("utf8"));
const version = document?.info?.version;

if (typeof version !== "string" || !/^0\.1\.\d+$/.test(version)) {
  throw new Error("The OpenAPI artifact must declare a supported 0.1.x Core version.");
}
if (typeof document.openapi !== "string" || !document.openapi.startsWith("3.")) {
  throw new Error("The source is not an OpenAPI 3 document.");
}

const digest = createHash("sha256").update(bytes).digest("hex");
writeFileSync("openapi/openapi.json", bytes);
writeFileSync(
  "openapi/source.json",
  `${JSON.stringify(
    {
      repository: "https://github.com/OpenMeshTAK/openmeshtak",
      tag: `v${version}`,
      path: "openapi/openapi.json",
      sha256: digest,
    },
    null,
    2,
  )}\n`,
);

process.stdout.write(`Synchronized OpenMeshTak Core v${version} OpenAPI (${digest}).\n`);
