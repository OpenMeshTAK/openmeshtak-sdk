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

// Core sends delay-seconds; an HTTP date or anything else is ignored rather than guessed.
function parseRetryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  return value !== null && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** A safe RFC 9457 problem returned by OpenMeshTak Core. */
export class OpenMeshTakApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;
  readonly type: string | undefined;
  readonly code: string | undefined;
  readonly traceId: string | undefined;
  /** Seconds to wait before retrying, when Core sent `Retry-After` (for example `429`). */
  readonly retryAfterSeconds: number | undefined;

  constructor(response: Response, body: unknown) {
    const problem = isProblemDetails(body) ? body : undefined;
    super(problem?.detail ?? problem?.title ?? `OpenMeshTak API request failed with status ${response.status}.`);
    this.name = "OpenMeshTakApiError";
    this.status = response.status;
    this.problem = problem;
    this.type = problem?.type;
    this.code = problem?.code;
    this.traceId = problem?.traceId;
    this.retryAfterSeconds = parseRetryAfter(response);
  }
}
