import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readInstalledLicenses } from "./licenses.mjs";

function licenseTexts(packagePath) {
  return readdirSync(packagePath)
    .filter((file) => /^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(file))
    .sort()
    .map((file) => readFileSync(join(packagePath, file), "utf8").trim());
}

const dependencies = Object.entries(readInstalledLicenses(true))
  .flatMap(([license, packages]) =>
    packages.flatMap((dependency) =>
      dependency.versions.map((version, index) => ({
        name: dependency.name,
        version,
        license,
        homepage: dependency.homepage,
        path: dependency.paths[index] ?? dependency.paths[0],
      })),
    ),
  )
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));

const noticeSections = dependencies.map((dependency) => {
  const texts = licenseTexts(dependency.path);
  return [
    "=".repeat(78),
    `${dependency.name}@${dependency.version}`,
    `License: ${dependency.license}`,
    dependency.homepage ?? "",
    "",
    texts.join("\n\n"),
  ].join("\n");
});

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const notices = [
  "OpenMeshTak SDK third-party notices",
  "",
  "OpenMeshTak SDK is licensed under Apache-2.0. Dependencies retain their own licenses.",
  "",
  ...noticeSections,
  "",
].join("\n");
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: "library",
      name: packageJson.name,
      version: packageJson.version,
      licenses: [{ license: { id: "Apache-2.0" } }],
      purl: `pkg:npm/%40openmeshtak/sdk@${packageJson.version}`,
    },
  },
  components: dependencies.map((dependency) => ({
    type: "library",
    name: dependency.name,
    version: dependency.version,
    licenses: [{ expression: dependency.license }],
    purl: `pkg:npm/${dependency.name.startsWith("@") ? `%40${dependency.name.slice(1)}` : dependency.name}@${dependency.version}`,
  })),
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/THIRD_PARTY_NOTICES.txt", notices);
writeFileSync("dist/sbom.cdx.json", `${JSON.stringify(sbom, null, 2)}\n`);
process.stdout.write(`Wrote notices and SBOM for ${dependencies.length} production dependencies.\n`);
