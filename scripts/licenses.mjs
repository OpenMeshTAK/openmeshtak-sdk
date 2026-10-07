import { spawnSync } from "node:child_process";

export function readInstalledLicenses(production = false) {
  const pnpmEntry = process.env.npm_execpath;
  if (pnpmEntry === undefined) {
    throw new Error("Run the license scripts through pnpm so npm_execpath is available.");
  }

  const pnpmArgs = ["licenses", "list", "--json", ...(production ? ["--prod"] : [])];
  const isJavaScriptEntry = /\.(?:cjs|mjs|js)$/i.test(pnpmEntry);
  const command = isJavaScriptEntry ? process.execPath : pnpmEntry;
  const args = isJavaScriptEntry ? [pnpmEntry, ...pnpmArgs] : pnpmArgs;
  const result = spawnSync(command, args, {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `pnpm licenses exited with ${String(result.status)}.`);
  }

  return JSON.parse(result.stdout);
}
