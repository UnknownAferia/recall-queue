import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships Vora Status, Wrapped, Draft, Scrims and Control actions", async () => {
  const files = await Promise.all(
    [
      "../app/status/page.tsx",
      "../app/lib/publicStatus.ts",
      "../app/wrapped/page.tsx",
      "../app/api/wrapped/route.ts",
      "../app/draft/DraftPlanner.tsx",
      "../app/scrims/page.tsx",
      "../app/control/ControlActions.tsx",
      "../app/api/control/operations/route.ts",
      "../app/sitemap.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  const [
    status,
    statusData,
    wrapped,
    wrappedApi,
    draft,
    scrims,
    control,
    controlApi,
    sitemap,
  ] = files;

  assert.match(status, /All systems operational/);
  assert.match(statusData, /\/app\/public-data\/status\.json/);
  assert.match(wrapped, /Your season\. One shareable card/);
  assert.match(wrappedApi, /image\/svg\+xml/);
  assert.match(draft, /Copy share link/);
  assert.match(draft, /does not\s+upload or store/s);
  assert.match(scrims, /Your five\. Their five/);
  assert.match(control, /window\.confirm/);
  assert.match(control, /verification\.review/);
  assert.match(controlApi, /getControlSession/);
  for (const route of ["/status", "/wrapped", "/draft", "/scrims"]) {
    assert.match(sitemap, new RegExp(route));
  }
});
