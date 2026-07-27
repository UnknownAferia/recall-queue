import { NextResponse } from "next/server";

import {
  isDiscordCtaSource,
  recordDiscordClick,
} from "../../lib/websiteAnalytics";

export const runtime = "nodejs";

const discordInvite = "https://discord.gg/voramlbb";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get("source");
  const fetchSite = request.headers.get("sec-fetch-site");
  const referrer = request.headers.get("referer");
  const hasSameOriginReferrer = (() => {
    if (!referrer) {
      return false;
    }

    try {
      return new URL(referrer).origin === requestUrl.origin;
    } catch {
      return false;
    }
  })();

  if (
    source &&
    isDiscordCtaSource(source) &&
    (fetchSite === "same-origin" || hasSameOriginReferrer)
  ) {
    try {
      await recordDiscordClick(source);
    } catch (error: unknown) {
      console.warn("Unable to record an anonymous Discord CTA click.", error);
    }
  }

  return NextResponse.redirect(discordInvite, 307);
}
