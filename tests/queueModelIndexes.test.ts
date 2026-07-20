import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { QueueModel } from "../src/models/QueueModel.js";

describe("QueueModel indexes", () => {
  it("declares one named unique guild index", () => {
    const guildIndexes = QueueModel.schema
      .indexes()
      .filter(([fields]) => fields.guildId === 1);

    assert.equal(guildIndexes.length, 1);
    assert.equal(guildIndexes[0]?.[1].name, "unique_queue_guild");
    assert.equal(guildIndexes[0]?.[1].unique, true);
  });
});
