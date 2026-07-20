import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionFlagsBits } from "discord.js";

import {
  combinePermissions,
  permissionOverwriteMatches,
} from "../src/domain/guildSetup/permissionPolicy.js";

describe("Guild permission policy", () => {
  it("combines and matches exact allow and deny bitfields", () => {
    const expected = {
      id: "role-id",
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
      ],
      deny: [PermissionFlagsBits.ManageMessages],
    };

    assert.equal(
      permissionOverwriteMatches(
        {
          allow: combinePermissions(expected.allow),
          deny: combinePermissions(expected.deny),
        },
        expected,
      ),
      true,
    );
  });

  it("detects missing and modified permission overwrites", () => {
    const expected = {
      id: "role-id",
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages],
    };

    assert.equal(permissionOverwriteMatches(undefined, expected), false);
    assert.equal(
      permissionOverwriteMatches(
        {
          allow: PermissionFlagsBits.ViewChannel,
          deny: 0n,
        },
        expected,
      ),
      false,
    );
  });
});
