import { NextResponse } from "next/server";

import {
  createPublicHealthReport,
  publicHealthHttpStatus,
} from "../../lib/publicHealth";
import { readPublicCompetitionState } from "../../lib/publicCompetition";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const state = await readPublicCompetitionState();
  const report = createPublicHealthReport(state);
  const status = publicHealthHttpStatus(report);

  return NextResponse.json(report, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...(status === 503 ? { "Retry-After": "60" } : {}),
    },
  });
}
