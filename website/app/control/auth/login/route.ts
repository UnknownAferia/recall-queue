import { NextResponse } from "next/server";

import {
  buildControlUrl,
  buildDiscordAuthorizationUrl,
  controlStateCookieName,
  controlStateDurationSeconds,
  createControlState,
  getControlAuthConfig,
} from "../../../lib/controlAuth";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const config = getControlAuthConfig();
  if (!config) {
    return NextResponse.redirect(buildControlUrl(null, "unavailable"));
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
