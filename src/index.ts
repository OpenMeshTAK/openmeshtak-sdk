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

/** OpenMeshTak Core API versions supported by this SDK release. */
export const SUPPORTED_API_VERSION_RANGE = ">=0.1.9 <0.2.0" as const;
