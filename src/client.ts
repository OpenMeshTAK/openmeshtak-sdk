import createClient, { type Client, type ClientOptions } from "openapi-fetch";
import type { paths } from "./generated/schema.js";
import { OpenMeshTakApiError } from "./errors.js";
import type {
  BatchPackageObjectsRequest,
  BatchPackageObjectsResult,
  ConfigurationRevision,
  ConfigurationRevisionPage,
  CreateDataPackageCopyRequest,
  CreateDataPackageRequest,
  CreateEventGroupRequest,
  CreateEventMemberAccountRequest,
  CreateEventMemberRequest,
  CreateEventRequest,
  CreateEventRoleRequest,
  CreateMeshtasticChannelRequest,
  CreatePackageLayerRequest,
  CreatePackageObjectRequest,
  CreatedEventMemberAccount,
  CreatedMemberClaim,
  DataPackage,
  DataPackagePage,
  DownloadDataPackageOptions,
  Event,
  EventGroup,
  EventGroupPage,
  EventMember,
  EventMemberPage,
  EventPage,
  EventRole,
  EventRolePage,
  EventTransitionRequest,
  ExternalMemberSyncRequest,
  ExternalMemberSyncResult,
  ExternalProvider,
  ListDataPackagesOptions,
  ListEventsOptions,
  ListPackageObjectsOptions,
  ListSyncIssuesOptions,
  MemberClaim,
  MeshtasticChannel,
  MeshtasticChannelPage,
  PackageLayer,
  PackageLayerPage,
  PackageObject,
  PackageObjectPage,
  PackageRevision,
  PackageRevisionPage,
  PageOptions,
  Principal,
  PublishConfigurationResult,
  PublishDataPackageResult,
  ReleaseMeshtasticChannelRequest,
  ResolvedProfile,
  RetrySyncIssueRequest,
  RotateMeshtasticChannelPskRequest,
  SyncIssuePage,
  UpdateDataPackageAudienceRequest,
  UpdateDataPackageRequest,
  UpdateEventGroupRequest,
  UpdateEventMemberRequest,
  UpdateEventRequest,
  UpdateEventRoleRequest,
  UpdateMeshtasticChannelRequest,
  UpdatePackageLayerRequest,
  UpdatePackageObjectRequest,
} from "./types.js";

export type ApiKeyProvider = string | (() => string | Promise<string>);

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

/** Options for POST operations that Core makes safe to retry. */
export interface IdempotentRequestOptions {
  /**
   * Opaque key of 1 to 255 visible ASCII characters, for example `crypto.randomUUID()`. Send the
   * same key with the same request when retrying after a network error or timeout: Core then
   * returns the original response instead of doing the work twice. Core keeps the result for
   * 24 hours. The SDK never generates or retries on its own.
   */
  idempotencyKey?: string;
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

function idempotencyHeader(options: IdempotentRequestOptions): { "Idempotency-Key"?: string } {
  return options.idempotencyKey === undefined ? {} : { "Idempotency-Key": options.idempotencyKey };
}

async function unwrap<T>(call: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok || error !== undefined) {
    throw new OpenMeshTakApiError(response, error);
  }
  return data as T;
}

async function unwrapEmpty(call: Promise<ApiResult<unknown>>): Promise<void> {
  await unwrap(call);
}

/**
 * Typed convenience client for common integration tasks. Every method maps to one OpenAPI
 * operation; the generated types in `@openmeshtak/sdk/generated` describe all others.
 */
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

  /** The caller behind the configured credentials, for example to check an API key. */
  getPrincipal(): Promise<Principal> {
    return unwrap(this.#api.GET("/principal"));
  }

  // Events

  listEvents(options: ListEventsOptions = {}): Promise<EventPage> {
    return unwrap(this.#api.GET("/events", { params: { query: options } }));
  }

  createEvent(body: CreateEventRequest, options: IdempotentRequestOptions = {}): Promise<Event> {
    return unwrap(this.#api.POST("/events", { params: { header: idempotencyHeader(options) }, body }));
  }

  getEvent(eventId: string): Promise<Event> {
    return unwrap(this.#api.GET("/events/{eventId}", { params: { path: { eventId } } }));
  }

  /** Replaces the editable settings; `body.version` must be the version last read. */
  updateEvent(eventId: string, body: UpdateEventRequest): Promise<Event> {
    return unwrap(this.#api.PUT("/events/{eventId}", { params: { path: { eventId } }, body }));
  }

  activateEvent(eventId: string, body: EventTransitionRequest): Promise<Event> {
    return unwrap(this.#api.POST("/events/{eventId}/activate", { params: { path: { eventId } }, body }));
  }

  archiveEvent(eventId: string, body: EventTransitionRequest): Promise<Event> {
    return unwrap(this.#api.POST("/events/{eventId}/archive", { params: { path: { eventId } }, body }));
  }

  reactivateEvent(eventId: string, body: EventTransitionRequest): Promise<Event> {
    return unwrap(this.#api.POST("/events/{eventId}/reactivate", { params: { path: { eventId } }, body }));
  }

  // Event roles

  listEventRoles(eventId: string, options: PageOptions = {}): Promise<EventRolePage> {
    return unwrap(this.#api.GET("/events/{eventId}/roles", { params: { path: { eventId }, query: options } }));
  }

  createEventRole(
    eventId: string,
    body: CreateEventRoleRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<EventRole> {
    return unwrap(
      this.#api.POST("/events/{eventId}/roles", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  getEventRole(eventId: string, roleId: string): Promise<EventRole> {
    return unwrap(this.#api.GET("/events/{eventId}/roles/{roleId}", { params: { path: { eventId, roleId } } }));
  }

  updateEventRole(eventId: string, roleId: string, body: UpdateEventRoleRequest): Promise<EventRole> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/roles/{roleId}", { params: { path: { eventId, roleId } }, body }),
    );
  }

  deleteEventRole(eventId: string, roleId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/roles/{roleId}", { params: { path: { eventId, roleId } } }),
    );
  }

  // Event groups

  listEventGroups(eventId: string, options: PageOptions = {}): Promise<EventGroupPage> {
    return unwrap(this.#api.GET("/events/{eventId}/groups", { params: { path: { eventId }, query: options } }));
  }

  createEventGroup(
    eventId: string,
    body: CreateEventGroupRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<EventGroup> {
    return unwrap(
      this.#api.POST("/events/{eventId}/groups", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  getEventGroup(eventId: string, groupId: string): Promise<EventGroup> {
    return unwrap(
      this.#api.GET("/events/{eventId}/groups/{groupId}", { params: { path: { eventId, groupId } } }),
    );
  }

  updateEventGroup(eventId: string, groupId: string, body: UpdateEventGroupRequest): Promise<EventGroup> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/groups/{groupId}", { params: { path: { eventId, groupId } }, body }),
    );
  }

  deleteEventGroup(eventId: string, groupId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/groups/{groupId}", { params: { path: { eventId, groupId } } }),
    );
  }

  // Event members

  listEventMembers(eventId: string, options: PageOptions = {}): Promise<EventMemberPage> {
    return unwrap(this.#api.GET("/events/{eventId}/members", { params: { path: { eventId }, query: options } }));
  }

  /** Adds an existing OpenMeshTak user. Members from external systems use `upsertExternalMember`. */
  createEventMember(
    eventId: string,
    body: CreateEventMemberRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<EventMember> {
    return unwrap(
      this.#api.POST("/events/{eventId}/members", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  /**
   * Creates a new person and adds them to the event. The result contains a single-use setup link;
   * hand it only to that person and never log it.
   */
  createEventMemberAccount(
    eventId: string,
    body: CreateEventMemberAccountRequest,
  ): Promise<CreatedEventMemberAccount> {
    return unwrap(
      this.#api.POST("/events/{eventId}/members/accounts", { params: { path: { eventId } }, body }),
    );
  }

  getEventMember(eventId: string, memberId: string): Promise<EventMember> {
    return unwrap(
      this.#api.GET("/events/{eventId}/members/{memberId}", { params: { path: { eventId, memberId } } }),
    );
  }

  updateEventMember(eventId: string, memberId: string, body: UpdateEventMemberRequest): Promise<EventMember> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/members/{memberId}", { params: { path: { eventId, memberId } }, body }),
    );
  }

  deleteEventMember(eventId: string, memberId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/members/{memberId}", { params: { path: { eventId, memberId } } }),
    );
  }

  /** Creates or updates the member an external system knows by `provider` plus `externalId`. */
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

  // Sync issues

  listSyncIssues(eventId: string, options: ListSyncIssuesOptions = {}): Promise<SyncIssuePage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/sync-issues", { params: { path: { eventId }, query: options } }),
    );
  }

  retrySyncIssue(
    eventId: string,
    syncIssueId: string,
    body: RetrySyncIssueRequest = {},
  ): Promise<ExternalMemberSyncResult> {
    return unwrap(
      this.#api.POST("/events/{eventId}/sync-issues/{syncIssueId}/retry", {
        params: { path: { eventId, syncIssueId } },
        body,
      }),
    );
  }

  // Member claims

  listMemberClaims(eventId: string, memberId: string): Promise<MemberClaim[]> {
    return unwrap(
      this.#api.GET("/events/{eventId}/members/{memberId}/claims", { params: { path: { eventId, memberId } } }),
    );
  }

  /**
   * Creates a single-use claim link for a member. Token and link are returned only here; send them
   * only to that member and never log them.
   */
  createMemberClaim(eventId: string, memberId: string): Promise<CreatedMemberClaim> {
    return unwrap(
      this.#api.POST("/events/{eventId}/members/{memberId}/claims", { params: { path: { eventId, memberId } } }),
    );
  }

  revokeMemberClaim(eventId: string, memberId: string, claimId: string): Promise<MemberClaim> {
    return unwrap(
      this.#api.POST("/events/{eventId}/members/{memberId}/claims/{claimId}/revoke", {
        params: { path: { eventId, memberId, claimId } },
      }),
    );
  }

  // Configuration revisions

  listConfigurationRevisions(eventId: string, options: PageOptions = {}): Promise<ConfigurationRevisionPage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/configuration-revisions", { params: { path: { eventId }, query: options } }),
    );
  }

  /** Publishes the current configuration of an active event; `created` is false when unchanged. */
  publishConfiguration(eventId: string, options: IdempotentRequestOptions = {}): Promise<PublishConfigurationResult> {
    return unwrap(
      this.#api.POST("/events/{eventId}/configuration-revisions", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
      }),
    );
  }

  getConfigurationRevision(eventId: string, revisionId: string): Promise<ConfigurationRevision> {
    return unwrap(
      this.#api.GET("/events/{eventId}/configuration-revisions/{revisionId}", {
        params: { path: { eventId, revisionId } },
      }),
    );
  }

  // Data Packages and missions

  listDataPackages(eventId: string, options: ListDataPackagesOptions = {}): Promise<DataPackagePage> {
    return unwrap(this.#api.GET("/events/{eventId}/data-packages", { params: { path: { eventId }, query: options } }));
  }

  createDataPackage(
    eventId: string,
    body: CreateDataPackageRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<DataPackage> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-packages", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  /** Creates a new package from published revisions (or drafts) of existing packages. */
  copyDataPackages(
    eventId: string,
    body: CreateDataPackageCopyRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<DataPackage> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-package-copies", {
        params: { path: { eventId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  getDataPackage(eventId: string, packageId: string): Promise<DataPackage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}", { params: { path: { eventId, packageId } } }),
    );
  }

  /** Renames or describes the package; `body.version` must be the version last read. */
  updateDataPackage(eventId: string, packageId: string, body: UpdateDataPackageRequest): Promise<DataPackage> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/data-packages/{packageId}", { params: { path: { eventId, packageId } }, body }),
    );
  }

  updateDataPackageAudience(
    eventId: string,
    packageId: string,
    body: UpdateDataPackageAudienceRequest,
  ): Promise<DataPackage> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/data-packages/{packageId}/audience", {
        params: { path: { eventId, packageId } },
        body,
      }),
    );
  }

  deleteDataPackage(eventId: string, packageId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/data-packages/{packageId}", { params: { path: { eventId, packageId } } }),
    );
  }

  /** Publishes the draft as a new revision; `created` is false when the draft is unchanged. */
  publishDataPackage(
    eventId: string,
    packageId: string,
    options: IdempotentRequestOptions = {},
  ): Promise<PublishDataPackageResult> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-packages/{packageId}/revisions", {
        params: { path: { eventId, packageId }, header: idempotencyHeader(options) },
      }),
    );
  }

  listDataPackageRevisions(eventId: string, packageId: string, options: PageOptions = {}): Promise<PackageRevisionPage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/revisions", {
        params: { path: { eventId, packageId }, query: options },
      }),
    );
  }

  getDataPackageRevision(eventId: string, packageId: string, revision: number): Promise<PackageRevision> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/revisions/{number}", {
        params: { path: { eventId, packageId, number: revision } },
      }),
    );
  }

  /** Downloads a published revision as an ATAK Data Package ZIP; `layerId` limits it to one layer. */
  async downloadDataPackageRevision(
    eventId: string,
    packageId: string,
    revision: number,
    options: DownloadDataPackageOptions = {},
  ): Promise<Blob> {
    // The contract describes the ZIP as a string; read the binary body as a Blob instead.
    const archive: unknown = await unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/revisions/{number}/atak", {
        params: { path: { eventId, packageId, number: revision }, query: options },
        parseAs: "blob",
      }),
    );
    return archive as Blob;
  }

  // Data Package layers

  listPackageLayers(eventId: string, packageId: string, options: PageOptions = {}): Promise<PackageLayerPage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/layers", {
        params: { path: { eventId, packageId }, query: options },
      }),
    );
  }

  createPackageLayer(
    eventId: string,
    packageId: string,
    body: CreatePackageLayerRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<PackageLayer> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-packages/{packageId}/layers", {
        params: { path: { eventId, packageId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  updatePackageLayer(
    eventId: string,
    packageId: string,
    layerId: string,
    body: UpdatePackageLayerRequest,
  ): Promise<PackageLayer> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/data-packages/{packageId}/layers/{layerId}", {
        params: { path: { eventId, packageId, layerId } },
        body,
      }),
    );
  }

  deletePackageLayer(eventId: string, packageId: string, layerId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/data-packages/{packageId}/layers/{layerId}", {
        params: { path: { eventId, packageId, layerId } },
      }),
    );
  }

  // Data Package objects

  listPackageObjects(
    eventId: string,
    packageId: string,
    options: ListPackageObjectsOptions = {},
  ): Promise<PackageObjectPage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/objects", {
        params: { path: { eventId, packageId }, query: options },
      }),
    );
  }

  createPackageObject(
    eventId: string,
    packageId: string,
    body: CreatePackageObjectRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<PackageObject> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-packages/{packageId}/objects", {
        params: { path: { eventId, packageId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  /** Creates, updates and deletes several objects in one request. */
  batchPackageObjects(
    eventId: string,
    packageId: string,
    body: BatchPackageObjectsRequest,
    options: IdempotentRequestOptions = {},
  ): Promise<BatchPackageObjectsResult> {
    return unwrap(
      this.#api.POST("/events/{eventId}/data-packages/{packageId}/objects/batch", {
        params: { path: { eventId, packageId }, header: idempotencyHeader(options) },
        body,
      }),
    );
  }

  getPackageObject(eventId: string, packageId: string, objectId: string): Promise<PackageObject> {
    return unwrap(
      this.#api.GET("/events/{eventId}/data-packages/{packageId}/objects/{objectId}", {
        params: { path: { eventId, packageId, objectId } },
      }),
    );
  }

  updatePackageObject(
    eventId: string,
    packageId: string,
    objectId: string,
    body: UpdatePackageObjectRequest,
  ): Promise<PackageObject> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/data-packages/{packageId}/objects/{objectId}", {
        params: { path: { eventId, packageId, objectId } },
        body,
      }),
    );
  }

  deletePackageObject(eventId: string, packageId: string, objectId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/data-packages/{packageId}/objects/{objectId}", {
        params: { path: { eventId, packageId, objectId } },
      }),
    );
  }

  // Meshtastic channels. Channel reads describe the key without revealing it; revealing a PSK
  // stays out of this convenience layer.

  listMeshtasticChannels(eventId: string, options: PageOptions = {}): Promise<MeshtasticChannelPage> {
    return unwrap(
      this.#api.GET("/events/{eventId}/meshtastic/channels", { params: { path: { eventId }, query: options } }),
    );
  }

  /** Omit `body.psk` to let Core generate a random key. */
  createMeshtasticChannel(eventId: string, body: CreateMeshtasticChannelRequest): Promise<MeshtasticChannel> {
    return unwrap(this.#api.POST("/events/{eventId}/meshtastic/channels", { params: { path: { eventId } }, body }));
  }

  getMeshtasticChannel(eventId: string, channelId: string): Promise<MeshtasticChannel> {
    return unwrap(
      this.#api.GET("/events/{eventId}/meshtastic/channels/{channelId}", { params: { path: { eventId, channelId } } }),
    );
  }

  updateMeshtasticChannel(
    eventId: string,
    channelId: string,
    body: UpdateMeshtasticChannelRequest,
  ): Promise<MeshtasticChannel> {
    return unwrap(
      this.#api.PUT("/events/{eventId}/meshtastic/channels/{channelId}", {
        params: { path: { eventId, channelId } },
        body,
      }),
    );
  }

  deleteMeshtasticChannel(eventId: string, channelId: string): Promise<void> {
    return unwrapEmpty(
      this.#api.DELETE("/events/{eventId}/meshtastic/channels/{channelId}", { params: { path: { eventId, channelId } } }),
    );
  }

  /** Replaces the channel key; omit `body.psk` for a random key. The result never contains the key. */
  rotateMeshtasticChannelPsk(
    eventId: string,
    channelId: string,
    body: RotateMeshtasticChannelPskRequest,
  ): Promise<MeshtasticChannel> {
    return unwrap(
      this.#api.POST("/events/{eventId}/meshtastic/channels/{channelId}/psk/rotate", {
        params: { path: { eventId, channelId } },
        body,
      }),
    );
  }

  /** Releases a withheld secret channel to its whole audience. */
  releaseMeshtasticChannel(
    eventId: string,
    channelId: string,
    body: ReleaseMeshtasticChannelRequest,
  ): Promise<MeshtasticChannel> {
    return unwrap(
      this.#api.POST("/events/{eventId}/meshtastic/channels/{channelId}/release", {
        params: { path: { eventId, channelId } },
        body,
      }),
    );
  }
}

export function createOpenMeshTakClient(options: OpenMeshTakClientOptions): OpenMeshTakClient {
  return new OpenMeshTakClient(options);
}
