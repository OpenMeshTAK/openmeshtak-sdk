# OpenMeshTak SDK

[![npm](https://img.shields.io/npm/v/@openmeshtak/sdk)](https://www.npmjs.com/package/@openmeshtak/sdk) [![License](https://img.shields.io/github/license/OpenMeshTAK/openmeshtak-sdk)](LICENSE) [![CI](https://github.com/OpenMeshTAK/openmeshtak-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenMeshTAK/openmeshtak-sdk/actions/workflows/ci.yml)

The official TypeScript and JavaScript client for the OpenMeshTak REST API.

The SDK is generated from the released OpenAPI contract and adds a small handwritten layer for
authentication, common operations and predictable problem-details errors. It does not duplicate
Core business rules. The SDK version always matches the OpenMeshTak version it was built from and
works with the later patch releases of that version line. Node.js 24 or newer is required.

Documentation: https://openmeshtak.github.io/openmeshtak-docs/sdk/

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

## License

Apache-2.0
