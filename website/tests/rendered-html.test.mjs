import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete Vora launch page", async () => {
  const [pageSource, layoutSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layoutSource, /Vora — Find Your Five/);
  assert.match(layoutSource, /https:\/\/voramlbb\.com/);
  assert.match(pageSource, /Find your five/);
  assert.match(pageSource, /Play as one/);
  assert.match(pageSource, /https:\/\/discord\.gg\/voramlbb/);
  assert.match(pageSource, /A lineup with intention/);
  assert.match(pageSource, /Real results\. Clear rules\. Human review/);
  assert.doesNotMatch(pageSource, /codex-preview|react-loading-skeleton/i);
});
