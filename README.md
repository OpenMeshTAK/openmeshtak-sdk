# OpenMeshTak SDK

The official TypeScript and JavaScript client for the OpenMeshTak REST API.

The SDK is generated from the released OpenAPI contract and adds a small handwritten layer for
authentication, common operations and predictable problem-details errors. It does not duplicate
Core business rules.

## Local development

This checkout currently targets OpenMeshTak API `>=0.1.9 <0.2.0` and contains the OpenAPI artifact
from Core `v0.1.9`.

```powershell
pnpm install
pnpm check
```

The SDK is a library, not a server, so there is no long-running development process. `pnpm build`
generates the contract types and writes the importable package to `dist/`.

To refresh the checked-in contract from a verified Core release checkout:

```powershell
pnpm api:sync -- ..\openmeshtak\openapi\openapi.json
pnpm check
```

Commit the OpenAPI artifact and generated declarations together. Do not edit
`src/generated/schema.ts` or `src/version.ts` by hand.

## Usage

```ts
import { createOpenMeshTakClient, OpenMeshTakApiError } from "@openmeshtak/sdk";

const client = createOpenMeshTakClient({
  baseUrl: "https://openmeshtak.example/api/v1",
  apiKey: () => process.env.OPENMESHTAK_API_KEY ?? "",
});

try {
  const event = await client.createEvent({
    name: "LightSim 2027",
    slug: "lightsim-2027",
    timeZone: "Europe/Berlin",
  });

  console.log(event.id);
} catch (error) {
  if (error instanceof OpenMeshTakApiError) {
    console.error(error.status, error.code, error.traceId);
  }
}
```

`baseUrl` may be a server origin such as `http://127.0.0.1:3000`, in which case `/api/v1` is
added, or the complete API base URL. Embedded URL credentials, query strings and fragments are
rejected. Outside local development, use HTTPS.

The API key can be a string or an asynchronous provider, which makes key rotation possible without
recreating the client. Never put an API key in a URL or log it. When `apiKey` is omitted, browser
calls may use the Core session cookie according to the configured `credentials` mode.

## Initial convenience surface

- `listEvents`
- `createEvent`
- `getEvent`
- `createEventGroup`
- `upsertExternalMember`
- `getMemberProfile`

Generated DTOs and operation types are exported from `@openmeshtak/sdk/generated`.

## Releases

Releases are driven by annotated `vMAJOR.MINOR.PATCH[-PRERELEASE]` tags. The release workflow:

1. verifies the tag, package version, API compatibility range and OpenAPI checksum;
2. installs with the frozen lockfile, audits dependencies and runs the complete check;
3. packs the npm tarball and generates third-party notices plus a CycloneDX SBOM;
4. publishes `@openmeshtak/sdk` to npm (`latest` for stable versions, `next` for prereleases);
5. creates a GitHub Release containing the verified tarball, notices and SBOM.

Before the first release:

- create the public `OpenMeshTAK/openmeshtak-sdk` repository and add it as `origin`;
- ensure the `@openmeshtak` npm scope can publish the public `sdk` package;
- configure npm trusted publishing for organization `OpenMeshTAK`, repository
  `openmeshtak-sdk` and workflow `release.yml`, with direct publish allowed;
- if npm requires a one-time token for the package's first publication, add a short-lived granular
  `NPM_TOKEN` repository secret, complete the first release, configure trusted publishing and then
  remove the secret.

Prepare and dispatch the current version (including the first `0.1.0` release):

```powershell
./release.ps1
```

Prepare a later version, commit it, create its annotated tag and push both after confirmation:

```powershell
./release.ps1 -Version 0.1.1
```

The script refuses dirty trees, non-`main` branches, unexpected remotes, an out-of-sync `main` and
duplicate tags. Publishing itself happens only in GitHub Actions after the pushed tag passes all
checks.

## License

Apache-2.0
