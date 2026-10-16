import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createOpenMeshTakClient, OpenMeshTakApiError, paginate } from "../dist/index.js";
import { API_KEY, event, startFakeCore, ZIP_BYTES } from "./support/fake-core.mjs";

// Runs the built package over real HTTP with Node's own fetch: no injected fetch implementation.

let core;
let client;

before(async () => {
  core = await startFakeCore();
  client = createOpenMeshTakClient({ baseUrl: core.origin, apiKey: async () => API_KEY });
});

after(() => core.close());

test("sends JSON, the API key and the Idempotency-Key over the wire", async () => {
  const created = await client.createEvent(
    { name: event.name, slug: event.slug, timeZone: event.timeZone },
    { idempotencyKey: "node-key-1" },
  );

  assert.equal(created.id, event.id);
  const request = core.requests.at(-1);
  assert.equal(request.method, "POST");
  assert.equal(request.url, "/api/v1/events");
  assert.equal(request.headers.authorization, `Bearer ${API_KEY}`);
  assert.equal(request.headers["idempotency-key"], "node-key-1");
  assert.match(request.headers["content-type"], /^application\/json/);
  assert.deepEqual(JSON.parse(request.body), { name: event.name, slug: event.slug, timeZone: event.timeZone });
});

test("turns problem responses into OpenMeshTakApiError with Retry-After", async () => {
  await assert.rejects(client.createEvent({}, { idempotencyKey: "busy" }), (error) => {
    assert.equal(error instanceof OpenMeshTakApiError, true);
    assert.equal(error.status, 409);
    assert.equal(error.code, "IDEMPOTENCY_REQUEST_IN_PROGRESS");
    assert.equal(error.traceId, "01CONTRACTTRACE");
    assert.equal(error.retryAfterSeconds, 1);
    return true;
  });

  const anonymous = createOpenMeshTakClient({ baseUrl: core.origin });
  await assert.rejects(anonymous.getPrincipal(), { status: 401, code: "UNAUTHENTICATED" });
});

test("resolves 204 responses to undefined and follows cursors", async () => {
  assert.equal(await client.deleteEventRole(event.id, "role-1"), undefined);

  const ids = [];
  for await (const item of paginate((page) => client.listEvents({ limit: 1, ...page }))) {
    ids.push(item.id);
  }
  assert.deepEqual(ids, [event.id, "second"]);
  assert.deepEqual(
    core.requests.filter((request) => request.url.startsWith("/api/v1/events?")).map((request) => request.url),
    ["/api/v1/events?limit=1", "/api/v1/events?limit=1&cursor=opaque-2"],
  );
});

test("downloads a Data Package ZIP byte for byte", async () => {
  const archive = await client.downloadDataPackageRevision(event.id, "package-1", 1);
  assert.deepEqual(new Uint8Array(await archive.arrayBuffer()), ZIP_BYTES);
});
