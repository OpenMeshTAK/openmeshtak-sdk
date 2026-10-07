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
`src/generated/schema.ts` by hand.

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

## License

Apache-2.0
