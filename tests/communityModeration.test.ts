import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Collection } from "discord.js";

import {
  createCommunityCaseButtonId,
  createMessageReportModalId,
  createUserReportModalId,
  parseCommunityCaseButtonId,
  parseCommunityReportModalId,
} from "../src/community/communityModerationIds.js";
import {
  channelControlCommandData,
  moderateCommandData,
  purgeCommandData,
  reportsCommandData,
  resolveReportCommandData,
} from "../src/community/commands/moderation.js";
import {
  reportMessageCommandData,
  reportUserCommandData,
} from "../src/community/commands/reportContext.js";
import { CommunityAutomodService } from "../src/community/services/CommunityAutomodService.js";
import { createCommunityModerationCaseView } from "../src/community/ui/createCommunityModerationCaseView.js";
import { createCommunityReportsView } from "../src/community/ui/createCommunityReportsView.js";
import { CommunityModerationCaseModel } from "../src/models/CommunityModerationCaseModel.js";
import { CommunityModerationCounterModel } from "../src/models/CommunityModerationCounterModel.js";
import { CommunityReportModel } from "../src/models/CommunityReportModel.js";

const CaseId = "507f1f77bcf86cd799439011";
const ChannelId = "1528404496911302767";
const MessageId = "1528404496911302768";
const UserId = "1528404496911302769";

function indexNames(model: {
  schema: { indexes(): ReadonlyArray<[unknown, { name?: string }]> };
}): string[] {
  return model.schema.indexes().map(([, options]) => options.name ?? "");
}

function fakeMessage(content: string, mentionCount = 0) {
  const users = new Collection<string, { bot: boolean }>();
  for (let index = 0; index < mentionCount; index += 1) {
    users.set(`user-${index}`, { bot: false });
  }
  return {
    author: { id: UserId, bot: false },
    member: { permissions: { has: () => false } },
    guildId: "guild-id",
    content,
    mentions: { users },
  } as never;
}

describe("Community moderation foundation", () => {
  it("creates and parses scoped case and report interaction IDs", () => {
    assert.deepEqual(
      parseCommunityCaseButtonId(
        createCommunityCaseButtonId("confirm", CaseId),
      ),
      { action: "confirm", caseId: CaseId },
    );
    assert.deepEqual(
      parseCommunityReportModalId(
        createMessageReportModalId(ChannelId, MessageId),
      ),
      { type: "message", channelId: ChannelId, messageId: MessageId },
    );
    assert.deepEqual(
      parseCommunityReportModalId(createUserReportModalId(UserId)),
      { type: "user", targetDiscordId: UserId },
    );
  });

  it("declares isolated sequence, history, inbox and retention indexes", () => {
    assert.ok(
      indexNames(CommunityModerationCounterModel).includes(
        "unique_community_moderation_counter",
      ),
    );
    assert.ok(
      indexNames(CommunityModerationCaseModel).includes(
        "unique_community_case_number",
      ),
    );
    assert.ok(
      indexNames(CommunityModerationCaseModel).includes(
        "community_case_retention",
      ),
    );
    assert.ok(
      indexNames(CommunityReportModel).includes("community_report_inbox"),
    );
    assert.ok(
      indexNames(CommunityReportModel).includes("community_report_retention"),
    );
  });

  it("detects mass mentions, flooding and repeated messages conservatively", () => {
    const massMentions = new CommunityAutomodService();
    assert.equal(
      massMentions.inspect(fakeMessage("hello", 5), 1_000),
      "mass mentions",
    );
    const flood = new CommunityAutomodService();
    for (let index = 0; index < 5; index += 1)
      assert.equal(
        flood.inspect(fakeMessage(`message ${index}`), 2_000 + index),
        null,
      );
    assert.equal(
      flood.inspect(fakeMessage("message 6"), 2_006),
      "message flood",
    );
    const repeat = new CommunityAutomodService();
    assert.equal(repeat.inspect(fakeMessage("same message"), 3_000), null);
    assert.equal(repeat.inspect(fakeMessage("same message"), 3_001), null);
    assert.equal(
      repeat.inspect(fakeMessage("same message"), 3_002),
      "repeated message spam",
    );
  });

  it("serializes staff case and report views", () => {
    const moderationCase = new CommunityModerationCaseModel({
      schemaVersion: 1,
      guildId: "guild-id",
      caseNumber: 12,
      source: "manual",
      action: "kick",
      status: "pending",
      actorDiscordId: "actor-id",
      targetDiscordId: "target-id",
      reason: "Repeated harassment",
      pendingUntil: new Date(Date.now() + 60_000),
    });
    const report = new CommunityReportModel({
      schemaVersion: 1,
      guildId: "guild-id",
      reportNumber: 4,
      type: "message",
      status: "open",
      reporterDiscordId: "reporter-id",
      targetDiscordId: "target-id",
      description: "The reported message violates the rules.",
      evidence: {
        channelId: ChannelId,
        messageId: MessageId,
        attachmentUrls: [],
      },
      createdAt: new Date("2026-07-22T12:00:00.000Z"),
    });
    const caseJson = JSON.stringify(
      createCommunityModerationCaseView(moderationCase).toJSON(),
    );
    const reportJson = JSON.stringify(
      createCommunityReportsView([report]).toJSON(),
    );
    assert.match(caseJson, /VORA-000012/);
    assert.match(caseJson, /Confirm Action/);
    assert.match(reportJson, /REPORT-000004/);
    assert.match(reportJson, new RegExp(MessageId));
  });

  it("publishes the complete staff and member command surface", () => {
    const commandNames = [
      moderateCommandData.name,
      reportsCommandData.name,
      resolveReportCommandData.name,
      purgeCommandData.name,
      channelControlCommandData.name,
      reportMessageCommandData.name,
      reportUserCommandData.name,
    ];
    assert.equal(new Set(commandNames).size, commandNames.length);
  });

  it("places every required slash-command option before optional options", () => {
    const slashCommands = [
      moderateCommandData,
      reportsCommandData,
      resolveReportCommandData,
      purgeCommandData,
      channelControlCommandData,
    ];

    for (const command of slashCommands) {
      const options = command.toJSON().options ?? [];
      let optionalSeen = false;

      for (const option of options) {
        const required = "required" in option && option.required === true;
        if (!required) optionalSeen = true;
        assert.equal(
          required && optionalSeen,
          false,
          `${command.name} places a required option after an optional option`,
        );
      }
    }
  });
});
