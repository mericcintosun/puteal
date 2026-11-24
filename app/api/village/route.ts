import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { codeOf, hintFor, statusFor, type ErrorCode } from "@/lib/errors";
import { villageQuerySchema } from "@/lib/schemas";
import type { ApiResponse, Village } from "@/lib/types";

// Reads ADAPTER_MODE per request, so the mode can change without a rebuild.
export const dynamic = "force-dynamic";

function fail(code: ErrorCode) {
  const body: ApiResponse<Village> = { ok: false, error: code, hint: hintFor(code) };
  return NextResponse.json(body, { status: statusFor(code) });
}

// GET /api/village answers through the selected adapter. GET /api/village?live=1 asks for the
// live OpenStreetMap layout in any mode (the planner's load button).
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = villageQuerySchema.safeParse(params);
  if (!parsed.success) return fail("invalid_input");

  const adapter = getAdapter({ live: parsed.data.live === "1" });
  try {
    const village = await adapter.getVillage();
    const body: ApiResponse<Village> = { ok: true, data: village, mode: adapter.mode };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    return fail(codeOf(e));
  }
}
