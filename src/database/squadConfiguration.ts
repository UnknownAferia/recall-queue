import { logger } from "../config/logger.js";
import { SquadModel } from "../models/SquadModel.js";

export async function synchronizeSquadConfiguration(): Promise<void> {
  const captainResult = await SquadModel.updateMany(
    {
      $or: [
        { captainDiscordId: { $exists: false } },
        { captainDiscordId: null },
        { captainDiscordId: "" },
      ],
      "participants.0": { $exists: true },
    },
    [
      {
        $set: {
          captainDiscordId: {
            $arrayElemAt: ["$participants.discordId", 0],
          },
        },
      },
    ],
    {
      updatePipeline: true,
    },
  ).exec();

  const activationResult = await SquadModel.updateMany(
    {
      status: "active",
      activatedAt: null,
    },
    [
      {
        $set: {
          activatedAt: "$updatedAt",
        },
      },
    ],
    {
      updatePipeline: true,
    },
  ).exec();

  const closureResult = await SquadModel.updateMany(
    {
      status: {
        $in: ["completed", "cancelled", "disputed"],
      },
      closedAt: null,
    },
    [
      {
        $set: {
          closedAt: "$updatedAt",
        },
      },
    ],
    {
      updatePipeline: true,
    },
  ).exec();

  const modifiedCount =
    captainResult.modifiedCount +
    activationResult.modifiedCount +
    closureResult.modifiedCount;

  if (modifiedCount > 0) {
    logger.info(`Updated ${modifiedCount} squad lifecycle field(s).`);
  }
}
