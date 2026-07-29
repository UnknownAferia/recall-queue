import { NextRequest, NextResponse } from "next/server";

import {
  authorizeDiscordOperator,
  controlSessionCookieName,
  controlSessionDurationSeconds,
  controlStateCookieName,
  createControlSessionToken,
  exchangeDiscordCode,
  getControlAuthConfig,
} from "../../../lib/controlAuth";

export const dynamic = "force-dynamic";

function controlRedirect(request: NextRequest, status?: string): NextResponse {
  const destination = new URL("/control", request.url);
  if (status) {
    destination.searchParams.set("auth", status);
  }

  const response = NextResponse.redirect(destination);
  response.cookies.set(controlStateCookieName, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/control/auth",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = getControlAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(controlStateCookieName)?.value;

  if (!config || !code || !state || !expectedState || state !== expectedState) {
    return controlRedirect(request, "invalid");
  }

  try {
    const accessToken = await exchangeDiscordCode(config, code);
    const session = await authorizeDiscordOperator(config, accessToken);
    if (!session) {
      return controlRedirect(request, "forbidden");
    }

    const response = controlRedirect(request);
    response.cookies.set(
      controlSessionCookieName,
      createControlSessionToken(session, config.sessionSecret),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/control",
        maxAge: controlSessionDurationSeconds,
      },
    );
    return response;
  } catch {
    return controlRedirect(request, "failed");
  }
}
