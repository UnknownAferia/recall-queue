import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete Vora launch page", async () => {
  const [
    pageSource,
    layoutSource,
    globalStyles,
    howItWorksSource,
    ratingSource,
    seasonsSource,
    faqSource,
    supportSource,
    privacySource,
    termsSource,
    sitemapSource,
    robotsSource,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/how-it-works/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rating/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/seasons/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/faq/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/terms/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layoutSource, /Vora — Find Your Five/);
  assert.match(layoutSource, /https:\/\/voramlbb\.com/);
  assert.match(
    globalStyles,
    /\.site-nav-static\s*\{[^}]*margin-inline:\s*auto;/s,
  );
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
  assert.match(howItWorksSource, /Nine steps\. No separate app/);
  assert.match(howItWorksSource, /Three squad confirmations/);
  assert.match(ratingSource, /1,750\+/);
  assert.match(ratingSource, /2,000\+/);
  assert.match(ratingSource, /KDA, MVP labels and damage numbers/);
  assert.match(seasonsSource, /Lifetime skill and seasonal form/);
  assert.match(seasonsSource, /Season Champion/);
  assert.match(faqSource, /Does Vora create internal 5v5 matches/);
  assert.match(faqSource, /How do Squad Alerts work/);
  assert.match(supportSource, /The right help/);
  assert.match(privacySource, /Closed ticket channels may remain available/);
  assert.match(privacySource, /OVHcloud/);
  assert.match(termsSource, /Competitive integrity/);
  assert.match(termsSource, /not affiliated with or endorsed by Moonton/);
  assert.match(sitemapSource, /\/privacy/);
  assert.match(robotsSource, /sitemap\.xml/);
  assert.doesNotMatch(pageSource, /codex-preview|react-loading-skeleton/i);
});
