import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

// A minimal stand-in for OpenMeshTak Core. It answers the few routes the runtime contract tests
// exercise exactly as Core's OpenAPI contract describes them, records every API request and serves
// the built SDK to a browser page. It does not reimplement Core behavior beyond that.

export const API_KEY = "omtk_ak_contract_secret";
export const SESSION_COOKIE = "better-auth.session_token=contract-session";
export const ZIP_BYTES = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x10, 0x80]);

export const event = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "LightSim 2027",
  slug: "lightsim-2027",
  timeZone: "Europe/Berlin",
  status: "draft",
  version: 1,
  startsAt: null,
  endsAt: null,
  takLoginTokenDays: 0,
  permanentAccounts: false,
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
};

const staticFiles = {
  "/sdk/": new URL("../../dist/", import.meta.url),
  "/vendor/openapi-fetch.mjs": new URL("../../node_modules/openapi-fetch/dist/index.mjs", import.meta.url),
};

const page = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>SDK contract</title>
    <script type="importmap">{ "imports": { "openapi-fetch": "/vendor/openapi-fetch.mjs" } }</script>
  </head>
  <body></body>
</html>`;

function problem(response, status, code, headers = {}) {
  response.writeHead(status, { "content-type": "application/problem+json", ...headers });
  response.end(
    JSON.stringify({
      type: `urn:openmeshtak:problem:${code.toLowerCase().replaceAll("_", "-")}`,
      title: "Contract problem",
      status,
      detail: "Safe detail for the caller.",
      code,
      traceId: "01CONTRACTTRACE",
    }),
  );
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function isAuthenticated(request) {
  return (
    request.headers.authorization === `Bearer ${API_KEY}` ||
    (request.headers.cookie ?? "").split("; ").includes(SESSION_COOKIE)
  );
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(pathname, response) {
  if (pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
    return true;
  }
  for (const [prefix, target] of Object.entries(staticFiles)) {
    if (pathname === prefix || (prefix.endsWith("/") && pathname.startsWith(prefix))) {
      const relative = pathname.slice(prefix.length);
      if (relative.includes("..")) {
        break;
      }
      const file = prefix.endsWith("/") ? new URL(relative, target) : target;
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(await readFile(fileURLToPath(file)));
      return true;
    }
  }
  return false;
}

function route(request, url, body, response) {
  const path = url.pathname.replace(/^\/api\/v1/, "");

  if (request.method === "GET" && path === "/principal") {
    return json(response, 200, { type: "apiClient", id: "client-1" });
  }
  if (request.method === "POST" && path === "/events") {
    if (request.headers["idempotency-key"] === "busy") {
      return problem(response, 409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", { "retry-after": "1" });
    }
    return json(response, 201, { ...event, ...JSON.parse(body) });
  }
  if (request.method === "GET" && path === `/events/${event.id}`) {
    return json(response, 200, event);
  }
  if (request.method === "GET" && path === "/events") {
    const cursor = url.searchParams.get("cursor");
    return cursor === null
      ? json(response, 200, { items: [event], page: { nextCursor: "opaque-2", hasMore: true } })
      : json(response, 200, { items: [{ ...event, id: "second" }], page: { nextCursor: null, hasMore: false } });
  }
  if (request.method === "DELETE" && path === `/events/${event.id}/roles/role-1`) {
    response.writeHead(204);
    return response.end();
  }
  if (request.method === "GET" && path === `/events/${event.id}/data-packages/package-1/revisions/1/atak`) {
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="package.zip"',
    });
    return response.end(ZIP_BYTES);
  }
  return problem(response, 404, "NOT_FOUND");
}

/** Starts the fake Core on a random loopback port. */
export async function startFakeCore() {
  const requests = [];
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/v1/")) {
        if (!(await serveStatic(url.pathname, response))) {
          response.writeHead(404);
          response.end();
        }
        return;
      }

      const body = await readBody(request);
      requests.push({ method: request.method, url: url.pathname + url.search, headers: request.headers, body });
      if (!isAuthenticated(request)) {
        return problem(response, 401, "UNAUTHENTICATED");
      }
      route(request, url, body, response);
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
