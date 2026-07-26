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
  for (const assetPath of [
    "/graphics/roles/exp.webp",
    "/graphics/roles/jungle.webp",
    "/graphics/roles/mid.webp",
    "/graphics/roles/gold.webp",
    "/graphics/roles/roam.webp",
    "/graphics/steps/player-identity.webp",
    "/graphics/steps/teammate-pool.webp",
    "/graphics/steps/ready-check.webp",
    "/graphics/steps/queue-together.webp",
  ]) {
    assert.match(pageSource, new RegExp(assetPath));
  }
  assert.doesNotMatch(pageSource, /codex-preview|react-loading-skeleton/i);
});
