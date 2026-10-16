import type { components, paths } from "./generated/schema.js";

type Schemas = components["schemas"];

/** Cursor of the page to fetch; omit it for the first page. Cursors are opaque. */
export interface PageRequest {
  cursor?: string;
}

/** Page size and cursor accepted by every list operation. */
export interface PageOptions extends PageRequest {
  /** 1 to 100. */
  limit?: number;
}

export type ListEventsOptions = NonNullable<paths["/events"]["get"]["parameters"]["query"]>;
export type ListSyncIssuesOptions = NonNullable<paths["/events/{eventId}/sync-issues"]["get"]["parameters"]["query"]>;
export type ListDataPackagesOptions = NonNullable<paths["/events/{eventId}/data-packages"]["get"]["parameters"]["query"]>;
export type ListPackageObjectsOptions = NonNullable<
  paths["/events/{eventId}/data-packages/{packageId}/objects"]["get"]["parameters"]["query"]
>;
export type DownloadDataPackageOptions = NonNullable<
  paths["/events/{eventId}/data-packages/{packageId}/revisions/{number}/atak"]["get"]["parameters"]["query"]
>;
export type ExternalProvider =
  paths["/events/{eventId}/external-members/{provider}/{externalId}"]["put"]["parameters"]["path"]["provider"];

export type PageInfo = Schemas["PageInfo"];
export type Principal = Schemas["PrincipalDto"];

export type Event = Schemas["EventDto"];
export type EventPage = Schemas["EventPage"];
export type CreateEventRequest = Schemas["CreateEventRequest"];
export type UpdateEventRequest = Schemas["UpdateEventRequest"];
export type EventTransitionRequest = Schemas["EventTransitionRequest"];

export type EventRole = Schemas["EventRoleDto"];
export type EventRolePage = Schemas["EventRolePage"];
export type CreateEventRoleRequest = Schemas["CreateEventRoleRequest"];
export type UpdateEventRoleRequest = Schemas["UpdateEventRoleRequest"];

export type EventGroup = Schemas["EventGroupDto"];
export type EventGroupPage = Schemas["EventGroupPage"];
export type CreateEventGroupRequest = Schemas["CreateEventGroupRequest"];
export type UpdateEventGroupRequest = Schemas["UpdateEventGroupRequest"];

export type EventMember = Schemas["EventMemberDto"];
export type EventMemberPage = Schemas["EventMemberPage"];
export type CreateEventMemberRequest = Schemas["CreateEventMemberRequest"];
export type UpdateEventMemberRequest = Schemas["UpdateEventMemberRequest"];
export type CreateEventMemberAccountRequest = Schemas["CreateEventMemberAccountRequest"];
export type CreatedEventMemberAccount = Schemas["CreatedEventMemberAccountResponse"];

export type ExternalMemberSyncRequest = Schemas["ExternalMemberSyncRequest"];
export type ExternalMemberSyncResult = Schemas["ExternalMemberSyncResult"];
export type SyncIssue = Schemas["SyncIssueDto"];
export type SyncIssuePage = Schemas["SyncIssuePage"];
export type RetrySyncIssueRequest = Schemas["RetrySyncIssueRequest"];

export type MemberClaim = Schemas["MemberClaimDto"];
export type CreatedMemberClaim = Schemas["CreatedMemberClaimResponse"];

export type ResolvedProfile = Schemas["ResolvedProfileDto"];

export type ConfigurationRevision = Schemas["ConfigurationRevisionDto"];
export type ConfigurationRevisionPage = Schemas["ConfigurationRevisionPage"];
export type PublishConfigurationResult = Schemas["PublishConfigurationResponse"];

export type DataPackage = Schemas["DataPackageDto"];
export type DataPackagePage = Schemas["DataPackagePage"];
export type CreateDataPackageRequest = Schemas["CreateDataPackageRequest"];
export type UpdateDataPackageRequest = Schemas["UpdateDataPackageRequest"];
export type UpdateDataPackageAudienceRequest = Schemas["UpdatePackageAudienceRequest"];
export type CreateDataPackageCopyRequest = Schemas["CreateDataPackageCopyRequest"];
export type PublishDataPackageResult = Schemas["PublishDataPackageResponse"];
export type PackageRevision = Schemas["PackageRevisionDto"];
export type PackageRevisionSummary = Schemas["PackageRevisionSummaryDto"];
export type PackageRevisionPage = Schemas["PackageRevisionPage"];

export type PackageLayer = Schemas["PackageLayerDto"];
export type PackageLayerPage = Schemas["PackageLayerPage"];
export type CreatePackageLayerRequest = Schemas["CreatePackageLayerRequest"];
export type UpdatePackageLayerRequest = Schemas["UpdatePackageLayerRequest"];

export type PackageObject = Schemas["PackageObjectDto"];
export type PackageObjectPage = Schemas["PackageObjectPage"];
export type CreatePackageObjectRequest = Schemas["CreatePackageObjectRequest"];
export type UpdatePackageObjectRequest = Schemas["UpdatePackageObjectRequest"];
export type BatchPackageObjectsRequest = Schemas["BatchPackageObjectsRequest"];
export type BatchPackageObjectsResult = Schemas["BatchPackageObjectsResponse"];

export type MeshtasticChannel = Schemas["MeshtasticChannelDto"];
export type MeshtasticChannelPage = Schemas["MeshtasticChannelPage"];
export type CreateMeshtasticChannelRequest = Schemas["CreateMeshtasticChannelRequest"];
export type UpdateMeshtasticChannelRequest = Schemas["UpdateMeshtasticChannelRequest"];
export type RotateMeshtasticChannelPskRequest = Schemas["RotateChannelPskRequest"];
export type ReleaseMeshtasticChannelRequest = Schemas["ReleaseMeshtasticChannelRequest"];
