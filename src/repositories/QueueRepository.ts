import {
  QueueModel,
  type QueueDocument,
} from "../models/QueueModel.js";

export class QueueRepository {
  public async getOrCreate(
    guildId: string,
  ): Promise<QueueDocument> {
    const queue = await QueueModel.findOneAndUpdate(
      {
        guildId,
      },
      {
        $setOnInsert: {
          guildId,
          status: "open",
          entries: [],
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!queue) {
      throw new Error(
        `Unable to create or retrieve queue for guild ${guildId}.`,
      );
    }

    return queue;
  }

  public async addPlayer(
    guildId: string,
    discordId: string,
  ): Promise<QueueDocument | null> {
    return QueueModel.findOneAndUpdate(
      {
        guildId,
        status: "open",
        "entries.discordId": {
          $ne: discordId,
        },
        $expr: {
          $lt: [
            {
              $size: "$entries",
            },
            "$maximumPlayers",
          ],
        },
      },
      {
        $push: {
          entries: {
            discordId,
            joinedAt: new Date(),
          },
        },
      },
      {
        returnDocument: "after",
      },
    ).exec();
  }

  public async removePlayer(
    guildId: string,
    discordId: string,
  ): Promise<QueueDocument | null> {
    return QueueModel.findOneAndUpdate(
      {
        guildId,
        "entries.discordId": discordId,
      },
      {
        $pull: {
          entries: {
            discordId,
          },
        },
      },
      {
        returnDocument: "after",
      },
    ).exec();
  }
}