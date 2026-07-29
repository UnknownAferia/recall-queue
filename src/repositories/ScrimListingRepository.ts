import { isValidObjectId } from "mongoose";

import {
  ScrimListingModel,
  type ScrimListingDocument,
} from "../models/ScrimListingModel.js";
import type { ScrimListingSummary, ScrimRegion } from "../types/scrim.js";

function summary(listing: ScrimListingDocument): ScrimListingSummary {
  return {
    id: listing.id,
    captainDiscordId: listing.captainDiscordId,
    teamName: listing.teamName,
    region: listing.region,
    availability: listing.availability,
    notes: listing.notes ?? null,
    expiresAt: new Date(listing.expiresAt),
  };
}

export class ScrimListingRepository {
  public async hasOpenListing(guildId: string, captainDiscordId: string) {
    return (
      (await ScrimListingModel.exists({
        guildId,
        captainDiscordId,
        status: "open",
        expiresAt: { $gt: new Date() },
      })) !== null
    );
  }

  public async create(input: {
    guildId: string;
    captainDiscordId: string;
    teamName: string;
    region: ScrimRegion;
    availability: string;
    notes: string | null;
    expiresAt: Date;
  }) {
    return summary(
      await ScrimListingModel.create({
        ...input,
        status: "open",
        closedAt: null,
      }),
    );
  }

  public async findOpen(
    guildId: string,
    region: ScrimRegion | null,
    now: Date,
    limit = 10,
  ) {
    const listings = await ScrimListingModel.find({
      guildId,
      status: "open",
      expiresAt: { $gt: now },
      ...(region ? { region } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return listings.map(summary);
  }

  public async close(
    guildId: string,
    listingId: string,
    captainDiscordId: string,
    now: Date,
  ) {
    if (!isValidObjectId(listingId)) {
      return null;
    }

    const listing = await ScrimListingModel.findOneAndUpdate(
      {
        _id: listingId,
        guildId,
        captainDiscordId,
        status: "open",
      },
      { $set: { status: "closed", closedAt: now } },
      { returnDocument: "after" },
    ).exec();
    return listing ? summary(listing) : null;
  }
}
