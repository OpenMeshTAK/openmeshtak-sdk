export {
  createOpenMeshTakClient,
  OpenMeshTakClient,
  type ApiKeyProvider,
  type CreateEventGroupRequest,
  type CreateEventRequest,
  type ExternalMemberSyncRequest,
  type ExternalMemberSyncResult,
  type ExternalProvider,
  type Event,
  type EventGroup,
  type EventPage,
  type ListEventsOptions,
  type OpenMeshTakClientOptions,
  type ResolvedProfile,
} from "./client.js";
export { OpenMeshTakApiError, type ProblemDetails } from "./errors.js";
export { OPENAPI_SOURCE_VERSION, SDK_VERSION, SUPPORTED_API_VERSION_RANGE } from "./version.js";
