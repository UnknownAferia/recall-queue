import { NextResponse } from "next/server";

import {
  isTrackedPagePath,
  recordPageView,
} from "../../../lib/websiteAnalytics";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_024) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return NextResponse.json({ error: "Cross-site request denied." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("page" in payload) ||
    typeof payload.page !== "string" ||
    !isTrackedPagePath(payload.page)
  ) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  await recordPageView(payload.page);
  return new Response(null, { status: 204 });
}
