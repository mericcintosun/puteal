import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Solution, SolveRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  const body: ApiResponse<Solution> = { ok: false, error: { code: "bad_request", message } };
  return NextResponse.json(body, { status: 400 });
}

// Minimal shape check only; the full validation taxonomy lands in Phase 2.
function asSolveRequest(x: unknown): SolveRequest | null {
  if (typeof x !== "object" || x === null) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.threshold !== "number" || !Number.isFinite(r.threshold)) return null;
  if (typeof r.capacityOn !== "boolean") return null;
  const extra = r.extraWells ?? [];
  if (!Array.isArray(extra)) return null;
  return { threshold: r.threshold, capacityOn: r.capacityOn, extraWells: extra as SolveRequest["extraWells"] };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("The request body is not valid JSON.");
  }
  const req = asSolveRequest(json);
  if (!req) return badRequest("Send { threshold: number, capacityOn: boolean, extraWells: Well[] }.");

  const adapter = getAdapter();
  try {
    const solution = await adapter.solve(req);
    const body: ApiResponse<Solution> = { ok: true, data: solution, mode: adapter.mode };
    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: ApiResponse<Solution> = {
      ok: false,
      error: { code: "adapter_error", message: "The plan could not be solved." },
    };
    return NextResponse.json(body, { status: 500 });
  }
}
