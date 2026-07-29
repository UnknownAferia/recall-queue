import { NextResponse } from "next/server";

import {
  controlSessionCookieName,
  controlStateCookieName,
} from "../../../lib/controlAuth";

export function GET(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL("/control", request.url));
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
