import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ScrimService } from "../src/community/services/ScrimService.js";
import type { ScrimListingSummary } from "../src/types/scrim.js";

class MemoryScrims {
  public listing: ScrimListingSummary | null = null;

  public async hasOpenListing() {
    return this.listing !== null;
  }

  public async create(input: Omit<ScrimListingSummary, "id">) {
    this.listing = { id: "507f1f77bcf86cd799439011", ...input };
    return this.listing;
  }

  public async findOpen() {
    return this.listing ? [this.listing] : [];
  }

  public async close(
    _guildId: string,
    listingId: string,
    captainDiscordId: string,
  ) {
    if (
      !this.listing ||
      this.listing.id !== listingId ||
      this.listing.captainDiscordId !== captainDiscordId
    ) {
      return null;
    }
    const result = this.listing;
    this.listing = null;
    return result;
  }
}

describe("ScrimService", () => {
  it("creates a normalized seven-day listing and prevents duplicates", async () => {
    const repository = new MemoryScrims();
    const service = new ScrimService(repository);
    const now = new Date("2026-07-29T10:00:00.000Z");
    const listing = await service.create(
      {
        guildId: "guild",
        captainDiscordId: "captain",
        teamName: "  Vora Five  ",
        region: "eu",
        availability: "  Friday 20:00 CET  ",
        notes: "  Mythic+  ",
      },
      now,
    );

    assert.equal(listing.teamName, "Vora Five");
    assert.equal(listing.availability, "Friday 20:00 CET");
    assert.equal(listing.notes, "Mythic+");
    assert.equal(
      listing.expiresAt.getTime() - now.getTime(),
      7 * 24 * 60 * 60 * 1_000,
    );

    await assert.rejects(
      () =>
        service.create({
          guildId: "guild",
          captainDiscordId: "captain",
          teamName: "Duplicate",
          region: "eu",
          availability: "Tomorrow",
        }),
      /already have an open scrim listing/i,
    );
  });

  it("only lets the listing captain close the listing", async () => {
    const repository = new MemoryScrims();
    const service = new ScrimService(repository);
    const listing = await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      teamName: "Vora Five",
      region: "eu",
      availability: "Friday",
    });

    await assert.rejects(
      () => service.close("guild", listing.id, "outsider"),
      /could not be found/i,
    );
    assert.equal(
      (await service.close("guild", listing.id, "captain")).id,
      listing.id,
    );
  });
});
