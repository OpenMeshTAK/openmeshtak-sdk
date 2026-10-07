import createClient, { type Client, type ClientOptions } from "openapi-fetch";
import type { components, paths } from "./generated/schema.js";
import { OpenMeshTakApiError } from "./errors.js";

export type ApiKeyProvider = string | (() => string | Promise<string>);
export type ListEventsOptions = NonNullable<paths["/events"]["get"]["parameters"]["query"]>;
export type CreateEventRequest = paths["/events"]["post"]["requestBody"]["content"]["application/json"];
export type CreateEventGroupRequest =
  paths["/events/{eventId}/groups"]["post"]["requestBody"]["content"]["application/json"];
export type ExternalMemberSyncRequest =
  paths["/events/{eventId}/external-members/{provider}/{externalId}"]["put"]["requestBody"]["content"]["application/json"];
export type ExternalProvider =
  paths["/events/{eventId}/external-members/{provider}/{externalId}"]["put"]["parameters"]["path"]["provider"];
export type EventPage = components["schemas"]["EventPage"];
export type Event = components["schemas"]["EventDto"];
export type EventGroup = components["schemas"]["EventGroupDto"];
export type ExternalMemberSyncResult = components["schemas"]["ExternalMemberSyncResult"];
export type ResolvedProfile = components["schemas"]["ResolvedProfileDto"];

export interface OpenMeshTakClientOptions {
  /** Server origin or complete `/api/v1` base URL. */
  baseUrl: string;
  /** Machine credential. A provider is evaluated immediately before every request. */
  apiKey?: ApiKeyProvider;
  /** Browser cookie mode. Defaults to `same-origin`. */
  credentials?: RequestInit["credentials"];
  /** Fetch implementation for runtimes or tests. */
  fetch?: typeof globalThis.fetch;
}

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function normalizeBaseUrl(input: string): string {
  const url = new URL(input);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("OpenMeshTak baseUrl must use HTTP or HTTPS.");
  }
  if (url.username !== "" || url.password !== "") {
    throw new TypeError("OpenMeshTak baseUrl must not contain credentials.");
  }
  if (url.search !== "" || url.hash !== "") {
    throw new TypeError("OpenMeshTak baseUrl must not contain a query string or fragment.");
  }

  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path === "" ? "/api/v1" : path;
  return url.href;
}

async function resolveApiKey(provider: ApiKeyProvider): Promise<string> {
  // JavaScript callers can bypass the type, so check the runtime value before using it.
  const value: unknown = typeof provider === "function" ? await provider() : provider;
  if (typeof value !== "string" || value === "") {
    throw new TypeError("The API key provider returned no OpenMeshTak API key.");
  }
  if (!value.startsWith("omtk_ak_") || value.length <= "omtk_ak_".length) {
    throw new TypeError("The API key provider returned an invalid OpenMeshTak API key.");
  }
  return value;
}

async function unwrap<T>(call: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok || error !== undefined) {
    throw new OpenMeshTakApiError(response, error);
  }
  return data as T;
}

/** Typed convenience client for the stable initial OpenMeshTak SDK surface. */
export class OpenMeshTakClient {
  readonly #api: Client<paths>;

  constructor(options: OpenMeshTakClientOptions) {
    const clientOptions: ClientOptions = {
      baseUrl: normalizeBaseUrl(options.baseUrl),
      credentials: options.credentials ?? "same-origin",
    };
    if (options.fetch !== undefined) {
      clientOptions.fetch = options.fetch;
    }

    this.#api = createClient<paths>(clientOptions);
    if (options.apiKey !== undefined) {
      const provider = options.apiKey;
      this.#api.use({
        async onRequest({ request }) {
          request.headers.set("Authorization", `Bearer ${await resolveApiKey(provider)}`);
          return request;
        },
      });
    }
  }

  listEvents(options: ListEventsOptions = {}): Promise<EventPage> {
    return unwrap(this.#api.GET("/events", { params: { query: options } }));
  }

  createEvent(body: CreateEventRequest): Promise<Event> {
    return unwrap(this.#api.POST("/events", { body }));
  }

  getEvent(eventId: string): Promise<Event> {
    return unwrap(this.#api.GET("/events/{eventId}", { params: { path: { eventId } } }));
  }

  createEventGroup(eventId: string, body: CreateEventGroupRequest): Promise<EventGroup> {
    return unwrap(this.#api.POST("/events/{eventId}/groups", { params: { path: { eventId } }, body }));
  }

  upsertExternalMember(
    eventId: string,
    provider: ExternalProvider,
    externalId: string,
    body: ExternalMemberSyncRequest,
  ): Promise<ExternalMemberSyncResult> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/external-members/{provider}/{externalId}", {
        params: { path: { eventId, provider, externalId } },
        body,
      }),
    );
  }

  getMemberProfile(eventId: string, memberId: string): Promise<ResolvedProfile> {
    return unwrap(
      this.#api.GET("/events/{eventId}/members/{memberId}/profile", {
        params: { path: { eventId, memberId } },
      }),
    );
  }
}

export function createOpenMeshTakClient(options: OpenMeshTakClientOptions): OpenMeshTakClient {
  return new OpenMeshTakClient(options);
}
