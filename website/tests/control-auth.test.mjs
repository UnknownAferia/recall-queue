import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("protects Vora Control with Discord staff identity", async () => {
  const [auth, login, callback, logout, page] = await Promise.all([
    readFile(new URL("../app/lib/controlAuth.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/control/auth/login/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/control/auth/callback/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/control/auth/logout/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/control/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(auth, /identify guilds guilds\.members\.read/);
  assert.match(auth, /\/users\/@me\/guilds\/\$\{config\.guildId\}\/member/);
  assert.match(auth, /guild\.owner === true/);
  assert.match(auth, /administratorPermission/);
  assert.match(auth, /config\.allowedRoleIds\.has/);
  assert.match(auth, /createHmac\("sha256"/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /randomBytes\(32\)/);
  assert.match(auth, /controlSessionDurationSeconds = 8 \* 60 \* 60/);
  assert.match(auth, /new URL\(config\.redirectUri\)\.origin/);
  assert.match(auth, /new URL\("\/control", origin\)/);
  assert.match(login, /httpOnly:\s*true/);
  assert.match(login, /secure:\s*true/);
  assert.match(login, /sameSite:\s*"lax"/);
  assert.match(callback, /exchangeDiscordCode/);
  assert.match(callback, /authorizeDiscordOperator/);
  assert.match(callback, /createControlSessionToken/);
  assert.match(callback, /path:\s*"\/control"/);
  assert.match(callback, /Discord authorization failed/);
  assert.doesNotMatch(callback, /request\.url/);
  assert.doesNotMatch(login, /request\.url/);
  assert.doesNotMatch(logout, /request\.url/);
  assert.match(logout, /maxAge:\s*0/);
  assert.match(page, /Continue with Discord/);
  assert.match(page, /getControlSession/);
  assert.ok(
    page.indexOf("getControlSession()") < page.indexOf("readControlSnapshot()"),
    "private operational data must be read only after authentication",
  );
});
