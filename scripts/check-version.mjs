import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";

const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function parseVersion(value, label) {
  const match = semverPattern.exec(value);
  if (match === null) {
    throw new Error(`${label} must be MAJOR.MINOR.PATCH with an optional prerelease suffix.`);
  }
  return {
    value,
    numbers: match.slice(1, 4).map(Number),
    prerelease: match[4] !== undefined,
  };
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const source = JSON.parse(readFileSync("openapi/source.json", "utf8"));
const openApiBytes = readFileSync("openapi/openapi.json");
const openApi = JSON.parse(openApiBytes.toString("utf8"));
const sdkVersion = parseVersion(packageJson.version, "SDK version");
const apiVersion = parseVersion(openApi.info?.version, "OpenAPI version");
const range = /^(?:>=)(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/.exec(packageJson.openmeshtak?.apiVersionRange);

if (range === null) {
  throw new Error("openmeshtak.apiVersionRange must use the form >=MAJOR.MINOR.PATCH <MAJOR.MINOR.PATCH.");
}

const minimum = parseVersion(range[1], "API range minimum");
const maximum = parseVersion(range[2], "API range maximum");
if (compare(apiVersion.numbers, minimum.numbers) < 0 || compare(apiVersion.numbers, maximum.numbers) >= 0) {
  throw new Error(`OpenAPI ${apiVersion.value} is outside ${packageJson.openmeshtak.apiVersionRange}.`);
}
if (packageJson.openmeshtak.openApiVersion !== apiVersion.value) {
  throw new Error("package.json openApiVersion does not match the OpenAPI document.");
}
if (source.tag !== `v${apiVersion.value}`) {
  throw new Error("openapi/source.json tag does not match the OpenAPI document.");
}

const digest = createHash("sha256").update(openApiBytes).digest("hex");
if (source.sha256 !== digest) {
  throw new Error("openapi/source.json checksum does not match openapi/openapi.json.");
}

const tag = process.argv[2];
if (tag !== undefined && tag !== `v${sdkVersion.value}`) {
  throw new Error(`Release tag ${tag} does not match package version ${sdkVersion.value}.`);
}

if (process.env.GITHUB_OUTPUT !== undefined) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${sdkVersion.value}\nprerelease=${String(sdkVersion.prerelease)}\nnpm_tag=${sdkVersion.prerelease ? "next" : "latest"}\n`,
  );
}

process.stdout.write(
  `SDK ${sdkVersion.value} targets OpenMeshTak API ${packageJson.openmeshtak.apiVersionRange} from Core ${apiVersion.value}.\n`,
);
