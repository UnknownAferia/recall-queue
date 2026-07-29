import type { ScrimListingRepository } from "../../repositories/ScrimListingRepository.js";
import type { ScrimRegion } from "../../types/scrim.js";

export class ScrimService {
  public constructor(
    private readonly repository: Pick<
      ScrimListingRepository,
      "hasOpenListing" | "create" | "findOpen" | "close"
    >,
    private readonly lifetimeMs = 7 * 24 * 60 * 60 * 1_000,
  ) {}

  public async create(
    input: {
      guildId: string;
      captainDiscordId: string;
      teamName: string;
      region: ScrimRegion;
      availability: string;
      notes?: string | null;
    },
    now = new Date(),
  ) {
    if (
      await this.repository.hasOpenListing(
        input.guildId,
        input.captainDiscordId,
      )
    ) {
      throw new Error(
        "You already have an open scrim listing. Close it before creating another.",
      );
    }

    return this.repository.create({
      ...input,
      teamName: input.teamName.trim(),
      availability: input.availability.trim(),
      notes: input.notes?.trim() || null,
      expiresAt: new Date(now.getTime() + this.lifetimeMs),
    });
  }

  public browse(guildId: string, region: ScrimRegion | null, now = new Date()) {
    return this.repository.findOpen(guildId, region, now);
  }

  public async close(
    guildId: string,
    listingId: string,
    captainDiscordId: string,
    now = new Date(),
  ) {
    const listing = await this.repository.close(
      guildId,
      listingId,
      captainDiscordId,
      now,
    );
    if (!listing) {
      throw new Error("That open scrim listing could not be found.");
    }
    return listing;
  }
}
