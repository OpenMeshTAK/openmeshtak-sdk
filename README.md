# OpenMeshTak SDK

The official TypeScript and JavaScript client for the OpenMeshTak REST API.

The SDK is generated from the released OpenAPI contract and adds a small handwritten layer for
authentication, common operations and predictable problem-details errors. It does not duplicate
Core business rules.

## Local development

This checkout currently targets OpenMeshTak API `>=0.2.0 <0.3.0` and contains the OpenAPI artifact
from Core `v0.2.0`. It requires Node.js 24 or newer.

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

## Convenience surface

Each method maps to one API operation and throws `OpenMeshTakApiError` on a problem response.

- Caller: `getPrincipal`
- Events: `listEvents`, `createEvent`, `getEvent`, `updateEvent`, `activateEvent`, `archiveEvent`,
  `reactivateEvent`
- Roles: `listEventRoles`, `createEventRole`, `getEventRole`, `updateEventRole`, `deleteEventRole`
- Groups: `listEventGroups`, `createEventGroup`, `getEventGroup`, `updateEventGroup`,
  `deleteEventGroup`
- Members: `listEventMembers`, `createEventMember`, `createEventMemberAccount`, `getEventMember`,
  `updateEventMember`, `deleteEventMember`, `upsertExternalMember`, `getMemberProfile`
- Sync issues: `listSyncIssues`, `retrySyncIssue`
- Member claims: `listMemberClaims`, `createMemberClaim`, `revokeMemberClaim`
- Configuration: `listConfigurationRevisions`, `publishConfiguration`, `getConfigurationRevision`

`createEventMemberAccount` and `createMemberClaim` return single-use links. Send them only to the
person they are for and never log them.

List methods return one page. `paginate` walks through all of them:

```ts
import { paginate } from "@openmeshtak/sdk";

for await (const member of paginate((page) => client.listEventMembers(eventId, { limit: 100, ...page }))) {
  console.log(member.id);
}
```

Generated DTOs and operation types for every other operation are exported from
`@openmeshtak/sdk/generated`.

## Releases

The SDK version always equals the OpenMeshTak Core version it was built from: SDK `0.2.0` belongs
to Core `0.2.0`, SDK `0.2.1` to Core `0.2.1`. It supports every Core patch release of the same
minor version (`>=0.2.0 <0.3.0`), so an older SDK keeps working after a Core patch update. The SDK
is released together with Core and Web.

Releases are driven by annotated `vMAJOR.MINOR.PATCH[-PRERELEASE]` tags. The release workflow:

1. verifies the tag, package version, API compatibility range and OpenAPI checksum;
2. installs with the frozen lockfile, audits dependencies and runs the complete check;
3. packs the npm tarball and generates third-party notices plus a CycloneDX SBOM;
4. publishes `@openmeshtak/sdk` to npm (`latest` for stable versions, `next` for prereleases);
5. creates a GitHub Release containing the verified tarball, notices and SBOM.

To prepare a release for Core `0.2.1` by hand:

```powershell
pnpm api:sync -- ..openmeshtakopenapiopenapi.json   # from Core at tag v0.2.1
pnpm version:set -- 0.2.1
# set openmeshtak.apiVersionRange in package.json to ">=0.2.1 <0.3.0"
pnpm generate
pnpm check
git commit -am "chore(release): 0.2.1"
git tag -a v0.2.1 -m "OpenMeshTak SDK 0.2.1"
git push origin main
git push origin v0.2.1
```

The workflow refuses mismatched tags or version metadata. Publishing happens only after the pushed
tag passes all checks.

npm publishing uses trusted publishing for organization `OpenMeshTAK`, repository
`openmeshtak-sdk` and workflow `release.yml`. For the package's very first publication, a
short-lived granular `NPM_TOKEN` repository secret is used once and removed afterwards.

## License

Apache-2.0
