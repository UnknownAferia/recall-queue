import { NextResponse } from "next/server";

import {
  buildControlUrl,
  controlSessionCookieName,
  controlStateCookieName,
  getControlAuthConfig,
} from "../../../lib/controlAuth";

export function GET(): NextResponse {
  const response = NextResponse.redirect(
    buildControlUrl(getControlAuthConfig()),
  );
  response.cookies.set(controlSessionCookieName, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/control",
    maxAge: 0,
  });
  response.cookies.set(controlStateCookieName, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/control/auth",
    maxAge: 0,
  });
  return response;
}
