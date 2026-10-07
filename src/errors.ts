import type { components } from "./generated/schema.js";

export type ProblemDetails = components["schemas"]["ProblemDetails"];

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.code === "string"
  );
}

/** A safe RFC 9457 problem returned by OpenMeshTak Core. */
export class OpenMeshTakApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;
  readonly type: string | undefined;
  readonly code: string | undefined;
  readonly traceId: string | undefined;

  constructor(response: Response, body: unknown) {
    const problem = isProblemDetails(body) ? body : undefined;
    super(problem?.detail ?? problem?.title ?? `OpenMeshTak API request failed with status ${response.status}.`);
    this.name = "OpenMeshTakApiError";
    this.status = response.status;
    this.problem = problem;
    this.type = problem?.type;
    this.code = problem?.code;
    this.traceId = problem?.traceId;
  }
}
