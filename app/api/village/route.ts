import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Village } from "@/lib/types";

// Reads ADAPTER_MODE per request, so the mode can change without a rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  const adapter = getAdapter();
  try {
    const village = await adapter.getVillage();
    const body: ApiResponse<Village> = { ok: true, data: village, mode: adapter.mode };
    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: ApiResponse<Village> = {
      ok: false,
      error: { code: "adapter_error", message: "The village could not be loaded." },
    };
    return NextResponse.json(body, { status: 500 });
  }
}
