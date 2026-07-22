import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeMongoToolOutput } from "../scripts/mongodb-tool-process.mjs";

describe("MongoDB tool output security", () => {
  it("redacts the configured URI and encoded or decoded passwords", () => {
    const uri =
      "mongodb+srv://vora-user:p%40ssword@cluster.example.net/?appName=Vora";
    const output = [
      `Unable to connect to ${uri}`,
      "encoded=p%40ssword",
      "decoded=p@ssword",
    ].join("\n");

    const sanitized = sanitizeMongoToolOutput(output, uri);

    assert.doesNotMatch(sanitized, /vora-user/);
    assert.doesNotMatch(sanitized, /p%40ssword/);
    assert.doesNotMatch(sanitized, /p@ssword/);
    assert.match(sanitized, /\[REDACTED/);
  });

  it("redacts unexpected MongoDB connection strings", () => {
    const sanitized = sanitizeMongoToolOutput(
      "connection failed for mongodb://other-user:other-secret@localhost:27017/db",
      "mongodb+srv://configured:secret@cluster.example.net/db",
    );

    assert.equal(sanitized, "connection failed for [REDACTED_MONGODB_URI]");
  });
});
