import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createOpenMeshTakClient, OpenMeshTakClient } from "../dist/index.js";

// Checks the convenience layer against the bundled Core OpenAPI artifact, so syncing a new Core
// contract fails here when a method points at a removed operation or misses a new idempotency key.

const document = JSON.parse(readFileSync(new URL("../openapi/openapi.json", import.meta.url), "utf8"));
const HTTP_METHODS = ["get", "put", "post", "delete", "patch"];

const operations = Object.entries(document.paths).flatMap(([template, item]) =>
  HTTP_METHODS.filter((method) => item[method] !== undefined).map((method) => {
    const operation = item[method];
    const parameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
    return {
      method: method.toUpperCase(),
      template,
      pattern: new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`),
      operationId: operation.operationId,
      idempotent: parameters.some((parameter) => parameter.in === "header" && parameter.name === "Idempotency-Key"),
    };
  }),
);

// Operations whose responses carry plaintext secrets; SDK.md keeps them out of the convenience layer.
const SECRET_OPERATIONS = new Set(["RevealMeshtasticChannelPsk"]);

const e = "e1";
const key = { idempotencyKey: "contract-key" };

/** One call per convenience method; pass `key` wherever the method accepts it. */
const calls = {
  getPrincipal: (c) => c.getPrincipal(),
  listEvents: (c) => c.listEvents(),
  createEvent: (c) => c.createEvent({}, key),
  getEvent: (c) => c.getEvent(e),
  updateEvent: (c) => c.updateEvent(e, {}),
  activateEvent: (c) => c.activateEvent(e, {}),
  archiveEvent: (c) => c.archiveEvent(e, {}),
  reactivateEvent: (c) => c.reactivateEvent(e, {}),
  listEventRoles: (c) => c.listEventRoles(e),
  createEventRole: (c) => c.createEventRole(e, {}, key),
  getEventRole: (c) => c.getEventRole(e, "r1"),
  updateEventRole: (c) => c.updateEventRole(e, "r1", {}),
  deleteEventRole: (c) => c.deleteEventRole(e, "r1"),
  listEventGroups: (c) => c.listEventGroups(e),
  createEventGroup: (c) => c.createEventGroup(e, {}, key),
  getEventGroup: (c) => c.getEventGroup(e, "g1"),
  updateEventGroup: (c) => c.updateEventGroup(e, "g1", {}),
  deleteEventGroup: (c) => c.deleteEventGroup(e, "g1"),
  listEventMembers: (c) => c.listEventMembers(e),
  createEventMember: (c) => c.createEventMember(e, {}, key),
  createEventMemberAccount: (c) => c.createEventMemberAccount(e, {}),
  getEventMember: (c) => c.getEventMember(e, "m1"),
  updateEventMember: (c) => c.updateEventMember(e, "m1", {}),
  deleteEventMember: (c) => c.deleteEventMember(e, "m1"),
  upsertExternalMember: (c) => c.upsertExternalMember(e, "discord", "x1", {}),
  getMemberProfile: (c) => c.getMemberProfile(e, "m1"),
  listSyncIssues: (c) => c.listSyncIssues(e),
  retrySyncIssue: (c) => c.retrySyncIssue(e, "s1"),
  listMemberClaims: (c) => c.listMemberClaims(e, "m1"),
  createMemberClaim: (c) => c.createMemberClaim(e, "m1"),
  revokeMemberClaim: (c) => c.revokeMemberClaim(e, "m1", "c1"),
  listConfigurationRevisions: (c) => c.listConfigurationRevisions(e),
  publishConfiguration: (c) => c.publishConfiguration(e, key),
  getConfigurationRevision: (c) => c.getConfigurationRevision(e, "v1"),
  listDataPackages: (c) => c.listDataPackages(e),
  createDataPackage: (c) => c.createDataPackage(e, {}, key),
  copyDataPackages: (c) => c.copyDataPackages(e, {}, key),
  getDataPackage: (c) => c.getDataPackage(e, "p1"),
  updateDataPackage: (c) => c.updateDataPackage(e, "p1", {}),
  updateDataPackageAudience: (c) => c.updateDataPackageAudience(e, "p1", {}),
  deleteDataPackage: (c) => c.deleteDataPackage(e, "p1"),
  publishDataPackage: (c) => c.publishDataPackage(e, "p1", key),
  listDataPackageRevisions: (c) => c.listDataPackageRevisions(e, "p1"),
  getDataPackageRevision: (c) => c.getDataPackageRevision(e, "p1", 1),
  downloadDataPackageRevision: (c) => c.downloadDataPackageRevision(e, "p1", 1),
  listPackageLayers: (c) => c.listPackageLayers(e, "p1"),
  createPackageLayer: (c) => c.createPackageLayer(e, "p1", {}, key),
  updatePackageLayer: (c) => c.updatePackageLayer(e, "p1", "l1", {}),
  deletePackageLayer: (c) => c.deletePackageLayer(e, "p1", "l1"),
  listPackageObjects: (c) => c.listPackageObjects(e, "p1"),
  createPackageObject: (c) => c.createPackageObject(e, "p1", {}, key),
  batchPackageObjects: (c) => c.batchPackageObjects(e, "p1", {}, key),
  getPackageObject: (c) => c.getPackageObject(e, "p1", "o1"),
  updatePackageObject: (c) => c.updatePackageObject(e, "p1", "o1", {}),
  deletePackageObject: (c) => c.deletePackageObject(e, "p1", "o1"),
  listMeshtasticChannels: (c) => c.listMeshtasticChannels(e),
  createMeshtasticChannel: (c) => c.createMeshtasticChannel(e, {}),
  getMeshtasticChannel: (c) => c.getMeshtasticChannel(e, "c1"),
  updateMeshtasticChannel: (c) => c.updateMeshtasticChannel(e, "c1", {}),
  deleteMeshtasticChannel: (c) => c.deleteMeshtasticChannel(e, "c1"),
  rotateMeshtasticChannelPsk: (c) => c.rotateMeshtasticChannelPsk(e, "c1", {}),
  releaseMeshtasticChannel: (c) => c.releaseMeshtasticChannel(e, "c1", {}),
};

async function recordRequest(call) {
  let recorded;
  const client = createOpenMeshTakClient({
    baseUrl: "https://core.example",
    fetch: async (request) => {
      recorded = request;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  await call(client);
  return recorded;
}

test("every convenience method has a contract case", () => {
  const methods = Object.getOwnPropertyNames(OpenMeshTakClient.prototype).filter((name) => name !== "constructor");
  assert.deepEqual(methods.toSorted(), Object.keys(calls).toSorted());
});

for (const [name, call] of Object.entries(calls)) {
  test(`${name} calls a documented operation and honors its Idempotency-Key contract`, async () => {
    const request = await recordRequest(call);
    const path = new URL(request.url).pathname.replace(/^\/api\/v1/, "");
    const matches = operations.filter(
      (operation) => operation.method === request.method && operation.pattern.test(path),
    );

    assert.equal(matches.length, 1, `${request.method} ${path} must match exactly one OpenAPI operation`);
    const [operation] = matches;
    assert.equal(SECRET_OPERATIONS.has(operation.operationId), false, `${operation.operationId} reveals secrets`);
    assert.equal(
      request.headers.get("idempotency-key"),
      operation.idempotent ? key.idempotencyKey : null,
      `${operation.operationId} ${operation.idempotent ? "accepts" : "does not accept"} Idempotency-Key`,
    );
  });
}
