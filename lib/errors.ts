// Error taxonomy shared by the API routes, the real adapter and the planner UI.
// The UI switches on the code and shows the hint; it never reads provider text.
// Pure module: safe to import from client components.

export type ErrorCode = "invalid_input" | "upstream_timeout" | "upstream_error" | "parse_failure" | "not_configured";

export interface ApiError {
  error: ErrorCode;
  hint: string;
}

const HINTS: Record<ErrorCode, string> = {
  invalid_input: "The request did not match the expected shape: threshold 10 or 50, capacityOn true or false, at most 20 extra wells.",
  upstream_timeout: "OpenStreetMap's Overpass server took too long to answer. Try again in a minute.",
  upstream_error: "OpenStreetMap's Overpass server could not answer right now. Try again in a minute.",
  parse_failure: "The map data came back in a shape Puteal could not use, or too few buildings are mapped here.",
  not_configured: "This part of Puteal is switched off on this deployment.",
};

const STATUS: Record<ErrorCode, number> = {
  invalid_input: 400,
  upstream_timeout: 504,
  upstream_error: 502,
  parse_failure: 502,
  not_configured: 503,
};

export function hintFor(code: ErrorCode): string {
  return HINTS[code];
}

export function statusFor(code: ErrorCode): number {
  return STATUS[code];
}

/** An error that carries one of the codes above. `detail` is for server logs only. */
export class PutealError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "PutealError";
    this.code = code;
  }
}

/** Maps anything thrown to a code; unknown failures count as upstream errors. */
export function codeOf(e: unknown): ErrorCode {
  return e instanceof PutealError ? e.code : "upstream_error";
}
