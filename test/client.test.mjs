import assert from "node:assert/strict";
import test from "node:test";
import {
  createOpenMeshTakClient,
  OPENAPI_SOURCE_VERSION,
  OpenMeshTakApiError,
  SDK_VERSION,
  SUPPORTED_API_VERSION_RANGE,
} from "../dist/index.js";

const event = {
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("adds /api/v1, resolves the current API key and creates an event", async () => {
  let apiKey = "omtk_ak_public_first";
  const requests = [];
  const client = createOpenMeshTakClient({
    baseUrl: "http://127.0.0.1:3000/",
    apiKey: async () => apiKey,
    fetch: async (request) => {
      requests.push(request);
      return jsonResponse(event, 201);
    },
  });

  const created = await client.createEvent({ name: event.name, slug: event.slug, timeZone: event.timeZone });
  assert.equal(created.id, event.id);
  assert.equal(requests[0].url, "http://127.0.0.1:3000/api/v1/events");
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].headers.get("authorization"), "Bearer omtk_ak_public_first");

  apiKey = "omtk_ak_public_rotated";
  await client.createEvent({ name: event.name, slug: event.slug, timeZone: event.timeZone });
  assert.equal(requests[1].headers.get("authorization"), "Bearer omtk_ak_public_rotated");
});

test("maps the initial convenience methods to their stable OpenAPI paths", async () => {
  const requests = [];
  const client = createOpenMeshTakClient({
    baseUrl: "https://example.test/api/v1/",
    fetch: async (request) => {
      requests.push(request);
      return jsonResponse({ items: [], page: { nextCursor: null, hasMore: false } });
    },
  });

  await client.listEvents({ limit: 25 });
  await client.getEvent("event-id");
  await client.createEventGroup("event-id", { name: "Alpha", slug: "alpha" });
  await client.upsertExternalMember("event-id", "discord", "external/id", {
    username: "Peter",
    eventRole: "participant",
    group: "alpha",
  });
  await client.getMemberProfile("event-id", "member-id");

  assert.deepEqual(
    requests.map((request) => [request.method, new URL(request.url).pathname, new URL(request.url).search]),
    [
      ["GET", "/api/v1/events", "?limit=25"],
      ["GET", "/api/v1/events/event-id", ""],
      ["POST", "/api/v1/events/event-id/groups", ""],
      ["PUT", "/api/v1/events/event-id/external-members/discord/external%2Fid", ""],
      ["GET", "/api/v1/events/event-id/members/member-id/profile", ""],
    ],
  );
  assert.equal(requests.every((request) => request.headers.get("authorization") === null), true);
});

test("throws a predictable problem-details error without branching on message text", async () => {
  const problem = {
    type: "urn:openmeshtak:problem:access-denied",
    title: "Access denied",
    status: 403,
    detail: "This API client cannot access the event.",
    code: "ACCESS_DENIED",
    traceId: "01TESTTRACE",
  };
  const client = createOpenMeshTakClient({
    baseUrl: "https://example.test/api/v1",
    fetch: async () => jsonResponse(problem, 403),
  });

  await assert.rejects(client.getEvent(event.id), (error) => {
    assert.equal(error instanceof OpenMeshTakApiError, true);
    assert.equal(error.status, 403);
    assert.equal(error.code, "ACCESS_DENIED");
    assert.equal(error.traceId, "01TESTTRACE");
    return true;
  });
});

test("rejects credentials in the base URL and malformed API keys", async () => {
  assert.throws(
    () => createOpenMeshTakClient({ baseUrl: "https://user:secret@example.test/api/v1" }),
    /must not contain credentials/,
  );

  const client = createOpenMeshTakClient({
    baseUrl: "https://example.test/api/v1",
    apiKey: "not-a-key",
    fetch: async () => jsonResponse(event),
  });
  await assert.rejects(client.getEvent(event.id), /invalid OpenMeshTak API key/);
});

test("declares the Core API compatibility range", () => {
  assert.equal(SDK_VERSION, "0.1.0");
  assert.equal(SUPPORTED_API_VERSION_RANGE, ">=0.1.9 <0.2.0");
  assert.equal(OPENAPI_SOURCE_VERSION, "0.1.9");
});
