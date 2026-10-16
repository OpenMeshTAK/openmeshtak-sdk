import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";
import { API_KEY, event, SESSION_COOKIE, startFakeCore, ZIP_BYTES } from "./support/fake-core.mjs";

// Loads the built ES modules into a real browser page and calls the fake Core from there. The test
// uses an installed Chrome (`OPENMESHTAK_TEST_BROWSER` picks another Playwright channel such as
// `msedge`), so no browser download is needed locally or on the CI runner.

let core;
let browser;
let page;

before(async () => {
  core = await startFakeCore();
  browser = await chromium.launch({ channel: process.env.OPENMESHTAK_TEST_BROWSER ?? "chrome" });
  const context = await browser.newContext();
  const [name, value] = SESSION_COOKIE.split("=");
  await context.addCookies([{ name, value, url: core.origin, httpOnly: true, sameSite: "Lax" }]);
  page = await context.newPage();
  await page.goto(core.origin);
});

after(async () => {
  await browser?.close();
  await core?.close();
});

test("uses the session cookie and never sends an Authorization header by default", async () => {
  const principal = await page.evaluate(async () => {
    const { createOpenMeshTakClient } = await import("/sdk/index.js");
    return createOpenMeshTakClient({ baseUrl: location.origin }).getPrincipal();
  });

  assert.deepEqual(principal, { type: "apiClient", id: "client-1" });
  const request = core.requests.at(-1);
  assert.equal(request.url, "/api/v1/principal");
  assert.equal(request.headers.authorization, undefined);
  assert.match(request.headers.cookie, /better-auth\.session_token=contract-session/);
});

test("sends the API key and Idempotency-Key from the browser", async () => {
  const created = await page.evaluate(
    async ({ apiKey, body }) => {
      const { createOpenMeshTakClient } = await import("/sdk/index.js");
      const client = createOpenMeshTakClient({ baseUrl: `${location.origin}/api/v1`, apiKey, credentials: "omit" });
      return client.createEvent(body, { idempotencyKey: "browser-key-1" });
    },
    { apiKey: API_KEY, body: { name: event.name, slug: event.slug, timeZone: event.timeZone } },
  );

  assert.equal(created.id, event.id);
  const request = core.requests.at(-1);
  assert.equal(request.headers.authorization, `Bearer ${API_KEY}`);
  assert.equal(request.headers["idempotency-key"], "browser-key-1");
  assert.equal(request.headers.cookie, undefined);
});

test("rejects problem responses with OpenMeshTakApiError in the browser", async () => {
  const failure = await page.evaluate(async () => {
    const { createOpenMeshTakClient, OpenMeshTakApiError } = await import("/sdk/index.js");
    try {
      await createOpenMeshTakClient({ baseUrl: location.origin }).createEvent({}, { idempotencyKey: "busy" });
      return null;
    } catch (error) {
      return {
        isApiError: error instanceof OpenMeshTakApiError,
        status: error.status,
        code: error.code,
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
  });

  assert.deepEqual(failure, {
    isApiError: true,
    status: 409,
    code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
    retryAfterSeconds: 1,
  });
});

test("downloads a Data Package ZIP as a Blob in the browser", async () => {
  const result = await page.evaluate(async (eventId) => {
    const { createOpenMeshTakClient } = await import("/sdk/index.js");
    const archive = await createOpenMeshTakClient({ baseUrl: location.origin }).downloadDataPackageRevision(
      eventId,
      "package-1",
      1,
    );
    return { isBlob: archive instanceof Blob, bytes: [...new Uint8Array(await archive.arrayBuffer())] };
  }, event.id);

  assert.deepEqual(result, { isBlob: true, bytes: [...ZIP_BYTES] });
});
