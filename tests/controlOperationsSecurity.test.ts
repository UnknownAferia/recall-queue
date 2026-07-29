import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createControlOperationsSignature,
  verifyControlOperationsSignature,
} from "../src/community/services/ControlOperationsApi.js";

describe("Vora Control operations signing", () => {
  const secret = "7d1f5d42837ba139fac5935061b401c4";
  const actorDiscordId = "123456789012345678";
  const guildId = "987654321098765432";
  const now = new Date("2026-07-29T12:00:00.000Z");
  const timestamp = now.getTime().toString();
  const body = JSON.stringify({
    action: "maintenance.set",
    scope: "matchmaking",
    open: false,
  });

  it("accepts a fresh signature bound to actor, guild and body", () => {
    const signature = createControlOperationsSignature(
      secret,
      timestamp,
      actorDiscordId,
      guildId,
      body,
    );

    assert.equal(
      verifyControlOperationsSignature({
        secret,
        timestamp,
        signature,
        actorDiscordId,
        guildId,
        body,
        now,
      }),
      true,
    );
  });

  it("rejects tampered, stale and weakly configured requests", () => {
    const signature = createControlOperationsSignature(
      secret,
      timestamp,
      actorDiscordId,
      guildId,
      body,
    );
    const request = {
      secret,
      timestamp,
      signature,
      actorDiscordId,
      guildId,
      body,
      now,
    };

    assert.equal(
      verifyControlOperationsSignature({
        ...request,
        body: `${body} `,
      }),
      false,
    );
    assert.equal(
      verifyControlOperationsSignature({
        ...request,
        now: new Date(now.getTime() + 31_000),
      }),
      false,
    );
    assert.equal(
      verifyControlOperationsSignature({
        ...request,
        secret: "too-short",
      }),
      false,
    );
  });
});
