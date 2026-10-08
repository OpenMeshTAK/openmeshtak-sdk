import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createOpenMeshTakClient,
  OPENAPI_SOURCE_VERSION,
  OpenMeshTakApiError,
  paginate,
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

test("maps every convenience method to its OpenAPI operation", async () => {
  const requests = [];
  const client = createOpenMeshTakClient({
    baseUrl: "https://example.test",
    fetch: async (request) => {
      requests.push(request);
      return request.method === "DELETE" ? new Response(null, { status: 204 }) : jsonResponse({});
    },
  });
  const e = "e1";
  const transition = { version: 1 };

  const calls = [
    [() => client.getPrincipal(), "GET", "/principal"],
    [() => client.updateEvent(e, {}), "PUT", "/events/e1"],
    [() => client.activateEvent(e, transition), "POST", "/events/e1/activate"],
    [() => client.archiveEvent(e, transition), "POST", "/events/e1/archive"],
    [() => client.reactivateEvent(e, transition), "POST", "/events/e1/reactivate"],
    [() => client.listEventRoles(e, { limit: 10 }), "GET", "/events/e1/roles?limit=10"],
    [() => client.createEventRole(e, {}), "POST", "/events/e1/roles"],
    [() => client.getEventRole(e, "r1"), "GET", "/events/e1/roles/r1"],
    [() => client.updateEventRole(e, "r1", {}), "PUT", "/events/e1/roles/r1"],
    [() => client.deleteEventRole(e, "r1"), "DELETE", "/events/e1/roles/r1"],
    [() => client.listEventGroups(e), "GET", "/events/e1/groups"],
    [() => client.getEventGroup(e, "g1"), "GET", "/events/e1/groups/g1"],
    [() => client.updateEventGroup(e, "g1", {}), "PUT", "/events/e1/groups/g1"],
    [() => client.deleteEventGroup(e, "g1"), "DELETE", "/events/e1/groups/g1"],
    [() => client.listEventMembers(e, { cursor: "c1" }), "GET", "/events/e1/members?cursor=c1"],
    [() => client.createEventMember(e, {}), "POST", "/events/e1/members"],
    [() => client.createEventMemberAccount(e, {}), "POST", "/events/e1/members/accounts"],
    [() => client.getEventMember(e, "m1"), "GET", "/events/e1/members/m1"],
    [() => client.updateEventMember(e, "m1", {}), "PUT", "/events/e1/members/m1"],
    [() => client.deleteEventMember(e, "m1"), "DELETE", "/events/e1/members/m1"],
    [() => client.listSyncIssues(e, { status: "open" }), "GET", "/events/e1/sync-issues?status=open"],
    [() => client.retrySyncIssue(e, "s1"), "POST", "/events/e1/sync-issues/s1/retry"],
    [() => client.listMemberClaims(e, "m1"), "GET", "/events/e1/members/m1/claims"],
    [() => client.createMemberClaim(e, "m1"), "POST", "/events/e1/members/m1/claims"],
    [() => client.revokeMemberClaim(e, "m1", "c1"), "POST", "/events/e1/members/m1/claims/c1/revoke"],
    [() => client.listConfigurationRevisions(e), "GET", "/events/e1/configuration-revisions"],
    [() => client.publishConfiguration(e), "POST", "/events/e1/configuration-revisions"],
    [() => client.getConfigurationRevision(e, "v1"), "GET", "/events/e1/configuration-revisions/v1"],
  ];

  for (const [call, method, path] of calls) {
    requests.length = 0;
    await call();
    const url = new URL(requests[0].url);
    assert.deepEqual([requests[0].method, `${url.pathname}${url.search}`], [method, `/api/v1${path}`]);
  }
  assert.equal(await client.deleteEventRole(e, "r1"), undefined);
});

test("paginate follows opaque cursors until the last page", async () => {
  const pages = {
    "": { items: [1, 2], page: { nextCursor: "next-1", hasMore: true } },
    "next-1": { items: [3], page: { nextCursor: null, hasMore: false } },
  };
  const cursors = [];
  const client = createOpenMeshTakClient({
    baseUrl: "https://example.test",
    fetch: async (request) => {
      const cursor = new URL(request.url).searchParams.get("cursor") ?? "";
      cursors.push(cursor);
      return jsonResponse(pages[cursor]);
    },
  });

  const items = [];
  for await (const item of paginate((page) => client.listEventMembers("e1", { limit: 2, ...page }))) {
    items.push(item);
  }
  assert.deepEqual(items, [1, 2, 3]);
  assert.deepEqual(cursors, ["", "next-1"]);
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

  for (const apiKey of [() => "", () => undefined]) {
    const missingKeyClient = createOpenMeshTakClient({
      baseUrl: "https://example.test/api/v1",
      apiKey,
      fetch: async () => jsonResponse(event),
    });
    await assert.rejects(missingKeyClient.getEvent(event.id), /returned no OpenMeshTak API key/);
  }
});

test("declares the Core API compatibility range from package.json", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(SDK_VERSION, packageJson.version);
  assert.equal(SUPPORTED_API_VERSION_RANGE, packageJson.openmeshtak.apiVersionRange);
  assert.equal(OPENAPI_SOURCE_VERSION, packageJson.openmeshtak.openApiVersion);
});
