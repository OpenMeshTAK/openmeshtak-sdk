import { readInstalledLicenses } from "./licenses.mjs";

const allowed = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "BlueOak-1.0.0",
  "Unlicense",
]);

// Both packages are build-only dependencies of the OpenAPI generator. OpenMeshTak relies on the
// MIT option for type-fest; versions are pinned so upgrades require another review.
const reviewed = new Map([
  ["Python-2.0", new Set(["argparse@2.0.1"])],
  ["(MIT OR CC0-1.0)", new Set(["type-fest@4.41.0"])],
]);
const blocked = [];

for (const [license, packages] of Object.entries(readInstalledLicenses())) {
  if (allowed.has(license)) {
    continue;
  }

  const exceptions = reviewed.get(license) ?? new Set();
  for (const dependency of packages) {
    for (const version of dependency.versions) {
      const packageVersion = `${dependency.name}@${version}`;
      if (!exceptions.has(packageVersion)) {
        blocked.push(`${packageVersion} (${license})`);
      }
    }
  }
}
if (blocked.length > 0) {
  process.stderr.write(`Blocked dependency licenses:\n${blocked.sort().join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Dependency licenses match the allowlist and reviewed exceptions.\n");
}

