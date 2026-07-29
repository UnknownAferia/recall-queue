import { NextResponse } from "next/server";

import {
  buildDiscordAuthorizationUrl,
  controlStateCookieName,
  controlStateDurationSeconds,
  createControlState,
  getControlAuthConfig,
} from "../../../lib/controlAuth";

export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
  const config = getControlAuthConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/control?auth=unavailable", request.url),
    );
  }

  const state = createControlState();
  const response = NextResponse.redirect(
    buildDiscordAuthorizationUrl(config, state),
  );
  response.cookies.set(controlStateCookieName, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/control/auth",
    maxAge: controlStateDurationSeconds,
  });
  return response;
}
