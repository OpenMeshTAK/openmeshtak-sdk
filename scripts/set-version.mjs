import { readFileSync, writeFileSync } from "node:fs";

const [versionArgument] = process.argv.slice(2).filter((argument) => argument !== "--");
const nextVersion = versionArgument?.replace(/^v/, "");
const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function parse(value) {
  const match = semverPattern.exec(value);
  if (match === null) {
    throw new Error(`Invalid version ${String(value)}.`);
  }
  return {
    value,
    numbers: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split("."),
  };
}

function compareIdentifier(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : undefined;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : undefined;
  if (leftNumber !== undefined && rightNumber !== undefined) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== undefined) {
    return -1;
  }
  if (rightNumber !== undefined) {
    return 1;
  }
  return left.localeCompare(right);
}

function isGreater(next, current) {
  for (let index = 0; index < 3; index += 1) {
    if (next.numbers[index] !== current.numbers[index]) {
      return next.numbers[index] > current.numbers[index];
    }
  }
  if (current.prerelease !== undefined && next.prerelease === undefined) {
    return true;
  }
  if (current.prerelease === undefined || next.prerelease === undefined) {
    return false;
  }
  const length = Math.max(next.prerelease.length, current.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const nextIdentifier = next.prerelease[index];
    const currentIdentifier = current.prerelease[index];
    if (nextIdentifier === undefined) {
      return false;
    }
    if (currentIdentifier === undefined) {
      return true;
    }
    const comparison = compareIdentifier(nextIdentifier, currentIdentifier);
    if (comparison !== 0) {
      return comparison > 0;
    }
  }
  return false;
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const current = parse(packageJson.version);
const next = parse(nextVersion);
if (!isGreater(next, current)) {
  throw new Error(`Version ${next.value} must be greater than ${current.value}.`);
}

packageJson.version = next.value;
writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
process.stdout.write(`Prepared SDK version ${next.value}.\n`);
