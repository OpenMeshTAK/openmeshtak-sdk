# Contributing to the OpenMeshTak SDK

## Local development

The SDK needs Node.js 24 or newer.

```powershell
pnpm install
pnpm check
```

The SDK is a library, not a server, so there is no long-running development process. `pnpm build`
generates the contract types and writes the importable package to `dist/`.

`pnpm test` runs the built package against the checked-in OpenAPI contract, over real HTTP in
Node.js and inside a headless browser. The browser tests drive an installed Google Chrome through
Playwright; set `OPENMESHTAK_TEST_BROWSER=msedge` to use Microsoft Edge instead. No browser is
downloaded.

To refresh the checked-in contract from a verified Core release checkout:

```powershell
pnpm api:sync -- ..\openmeshtak\openapi\openapi.json
pnpm check
```

Commit the OpenAPI artifact and generated declarations together. Do not edit
`src/generated/schema.ts` or `src/version.ts` by hand.
