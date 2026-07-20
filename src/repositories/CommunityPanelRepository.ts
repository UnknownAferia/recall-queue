import type { CommunityPanelKind } from "../constants/community.js";
import {
  CommunityPanelModel,
  type CommunityPanelDocument,
} from "../models/CommunityPanelModel.js";

export class CommunityPanelRepository {
  public async find(
    guildId: string,
    kind: CommunityPanelKind,
  ): Promise<CommunityPanelDocument | null> {
    return CommunityPanelModel.findOne({ guildId, kind }).exec();
  }

  public async upsert(
    guildId: string,
    kind: CommunityPanelKind,
    channelId: string,
    messageId: string,
  ): Promise<CommunityPanelDocument> {
    const panel = await CommunityPanelModel.findOneAndUpdate(
      { guildId, kind },
      {
        $set: { channelId, messageId },
        $setOnInsert: { guildId, kind },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!panel) {
      throw new Error(`Unable to persist ${kind} panel for guild ${guildId}.`);
    }

    return panel;
  }
}
