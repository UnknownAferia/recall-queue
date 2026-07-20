import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ChannelType,
  Collection,
  type Attachment,
  type Guild,
} from "discord.js";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import {
  CustomIds,
  parseSquadResultEvidenceCustomId,
} from "../src/constants/customIds.js";
import { ResultEvidenceConfig } from "../src/constants/resultEvidence.js";
import { ResultEvidenceService } from "../src/services/ResultEvidenceService.js";
import { ResultEvidenceError } from "../src/services/errors/ResultEvidenceError.js";
import { createResultEvidenceModal } from "../src/ui/createResultEvidenceModal.js";

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "source-attachment",
    name: "result.png",
    contentType: "image/png",
    size: 2_048,
    width: 1_920,
    height: 1_080,
    url: "https://cdn.discordapp.com/result.png",
    ...overrides,
  } as Attachment;
}

function createGuildArchive() {
  const moderationChannel = GuildBlueprint.channels.find(
    (channel) => channel.key === "moderationLog",
  )!;
  const staffCategory = GuildBlueprint.categories.find(
    (category) => category.key === moderationChannel.categoryKey,
  )!;
  let deleted = false;

  const archivedAttachment = createAttachment({
    id: "archived-attachment",
  });
  const archiveMessage = {
    id: "archive-message",
    attachments: new Collection([[archivedAttachment.id, archivedAttachment]]),
    delete: async () => {
      deleted = true;
    },
  };
  const archiveChannel = {
    id: "archive-channel",
    type: ChannelType.GuildText,
    name: moderationChannel.name,
    parent: { name: staffCategory.name },
    send: async () => archiveMessage,
    messages: {
      fetch: async () => archiveMessage,
    },
  };
  const channels = new Collection([[archiveChannel.id, archiveChannel]]);
  const guild = {
    channels: {
      cache: channels,
      fetch: async (channelId?: string) =>
        channelId ? (channels.get(channelId) ?? null) : channels,
    },
  } as unknown as Guild;

  return { guild, wasDeleted: () => deleted };
}

describe("Result evidence", () => {
  it("creates and parses a match-specific upload modal", () => {
    const squadId = "507f1f77bcf86cd799439011";
    const customId = CustomIds.modals.squadResultEvidence.submit(
      squadId,
      "win",
    );

    assert.deepEqual(parseSquadResultEvidenceCustomId(customId), {
      outcome: "win",
      squadId,
    });
    assert.equal(parseSquadResultEvidenceCustomId("invalid"), null);
    assert.doesNotThrow(() =>
      createResultEvidenceModal(squadId, "win").toJSON(),
    );
  });

  it("accepts supported screenshots and rejects unsafe uploads", () => {
    const service = new ResultEvidenceService();

    assert.equal(service.validate(createAttachment()), "image/png");
    assert.throws(
      () => service.validate(createAttachment({ contentType: "text/plain" })),
      ResultEvidenceError,
    );
    assert.throws(
      () =>
        service.validate(
          createAttachment({
            size: ResultEvidenceConfig.maximumFileSizeBytes + 1,
          }),
        ),
      ResultEvidenceError,
    );
  });

  it("archives one screenshot and can remove an unused archive", async () => {
    const service = new ResultEvidenceService();
    const archive = createGuildArchive();

    const evidence = await service.archive(
      archive.guild,
      "507f1f77bcf86cd799439011",
      "captain-id",
      "win",
      createAttachment(),
    );

    assert.equal(evidence.archiveChannelId, "archive-channel");
    assert.equal(evidence.archiveMessageId, "archive-message");
    assert.equal(evidence.archiveAttachmentId, "archived-attachment");
    assert.equal(evidence.submittedByDiscordId, "captain-id");

    await service.discard(archive.guild, evidence);
    assert.equal(archive.wasDeleted(), true);
  });
});
