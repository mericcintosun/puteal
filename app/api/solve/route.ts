import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { codeOf, hintFor, statusFor, type ErrorCode } from "@/lib/errors";
import { solveRequestSchema } from "@/lib/schemas";
import type { ApiResponse, Solution } from "@/lib/types";

export const dynamic = "force-dynamic";

function fail(code: ErrorCode) {
  const body: ApiResponse<Solution> = { ok: false, error: code, hint: hintFor(code) };
  return NextResponse.json(body, { status: statusFor(code) });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail("invalid_input");
  }
  const parsed = solveRequestSchema.safeParse(json);
  if (!parsed.success) return fail("invalid_input");

  const adapter = getAdapter();
  try {
    const solution = await adapter.solve(parsed.data);
    const body: ApiResponse<Solution> = { ok: true, data: solution, mode: adapter.mode };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    return fail(codeOf(e));
  }
}
