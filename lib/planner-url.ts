// Planner state in the URL of /play. Pure, safe on server and client.
//   /play?limit=10&cap=1&add=1255,185;900,300
// parsePlannerQuery and toPlannerQuery are inverses for any state the planner can produce.
// A bad URL never throws: each bad field falls back to its default and the result carries
// the existing invalid_input code so the planner can say the link was partly ignored.

import { THRESHOLDS, proposeDeepWell } from "./data/seed";
import type { ErrorCode } from "./errors";
import { plannerQuerySchema } from "./schemas";
import type { Well } from "./types";

export interface PlannerState {
  /** Arsenic limit in µg/L: 10 (WHO) or 50 (Bangladesh). */
  threshold: number;
  capacitated: boolean;
  /** The reader's deep wells, rebuilt with proposeDeepWell(p, i). */
  added: Well[];
}

export interface ParsedPlannerQuery {
  state: PlannerState;
  /** invalid_input when any field was ignored, else null. */
  error: ErrorCode | null;
  hint: string | null;
}

export const DEFAULT_PLANNER_STATE: PlannerState = {
  threshold: THRESHOLDS.bangladesh,
  capacitated: true,
  added: [],
};

export type QueryInput = Record<string, string | string[] | undefined> | URLSearchParams;

function first(params: QueryInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

const LINK_HINT = "Part of this planner link was not valid, so the default was used for it.";

export function parsePlannerQuery(params: QueryInput): ParsedPlannerQuery {
  const shape = plannerQuerySchema.shape;
  let bad = false;

  const rawLimit = first(params, "limit");
  let threshold = DEFAULT_PLANNER_STATE.threshold;
  if (rawLimit !== undefined) {
    const r = shape.limit.safeParse(rawLimit);
    if (r.success) threshold = Number(r.data);
    else bad = true;
  }

  const rawCap = first(params, "cap");
  let capacitated = DEFAULT_PLANNER_STATE.capacitated;
  if (rawCap !== undefined) {
    const r = shape.cap.safeParse(rawCap);
    if (r.success) capacitated = r.data === "1";
    else bad = true;
  }

  const rawAdd = first(params, "add");
  let added: Well[] = [];
  if (rawAdd !== undefined && rawAdd !== "") {
    const r = shape.add.safeParse(rawAdd);
    if (r.success && r.data) {
      added = r.data.split(";").map((pair, i) => {
        const [x, y] = pair.split(",").map(Number);
        return proposeDeepWell({ x, y }, i);
      });
    } else {
      bad = true;
    }
  }

  return {
    state: { threshold, capacitated, added },
    error: bad ? "invalid_input" : null,
    hint: bad ? LINK_HINT : null,
  };
}

/** The query fields for a planner state. `add` is left out when there are no deep wells. */
export function toPlannerQuery(state: PlannerState): Record<string, string> {
  const q: Record<string, string> = {
    limit: state.threshold === THRESHOLDS.who ? "10" : "50",
    cap: state.capacitated ? "1" : "0",
  };
  const pairs = state.added.slice(0, 20).map((w) => `${Math.round(w.pos.x)},${Math.round(w.pos.y)}`);
  if (pairs.length) q.add = pairs.join(";");
  return q;
}

/** "?limit=..&cap=..&add=.." with the ";" and "," kept readable. */
export function plannerSearch(state: PlannerState): string {
  const q = toPlannerQuery(state);
  const parts = Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ",").replace(/%3B/g, ";")}`);
  return `?${parts.join("&")}`;
}
