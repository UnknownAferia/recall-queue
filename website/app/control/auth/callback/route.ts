import { NextRequest, NextResponse } from "next/server";

import {
  authorizeDiscordOperator,
  buildControlUrl,
  type ControlAuthConfig,
  controlSessionCookieName,
  controlSessionDurationSeconds,
  controlStateCookieName,
  createControlSessionToken,
  exchangeDiscordCode,
  getControlAuthConfig,
} from "../../../lib/controlAuth";

export const dynamic = "force-dynamic";

function controlRedirect(
  config: ControlAuthConfig | null,
  status?: string,
): NextResponse {
  const response = NextResponse.redirect(buildControlUrl(config, status));
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
    return controlRedirect(config, "invalid");
  }

  try {
    const accessToken = await exchangeDiscordCode(config, code);
    const session = await authorizeDiscordOperator(config, accessToken);
    if (!session) {
      return controlRedirect(config, "forbidden");
    }

    const response = controlRedirect(config);
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
  } catch (error: unknown) {
    console.error("Vora Control Discord authorization failed.", error);
    return controlRedirect(config, "failed");
  }
}
