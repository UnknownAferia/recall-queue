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
    liveSource,
    liveDataSource,
    getStartedSource,
    analyticsSource,
    pageTrackerSource,
    discordRedirectSource,
    updatesSource,
    manifestSource,
    structuredDataSource,
    healthRouteSource,
    publicHealthSource,
    controlSource,
    controlDataSource,
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
    readFile(new URL("../app/live/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/lib/publicCompetition.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/get-started/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/lib/websiteAnalytics.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/PageViewTracker.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/go/discord/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/updates/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/StructuredData.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/publicHealth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/control/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/controlSnapshot.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layoutSource, /Vora — Find Your Five/);
  assert.match(layoutSource, /https:\/\/voramlbb\.com/);
  assert.match(
    globalStyles,
    /\.site-nav-static\s*\{[^}]*margin-inline:\s*auto;/s,
  );
  assert.match(pageSource, /Find your five/);
  assert.match(pageSource, /Play as one/);
  assert.match(pageSource, /discordCtaHref\("home-final"\)/);
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
  assert.match(liveSource, /The state of Vora, right now/);
  assert.match(
    liveSource,
    /Discord identities and Mobile Legends account identifiers stay/,
  );
  assert.match(liveDataSource, /\/app\/public-data\/competition\.json/);
  assert.match(sitemapSource, /\/live/);
  assert.match(getStartedSource, /From new member to queue-ready/);
  assert.match(getStartedSource, /PNG, JPEG or WebP/);
  assert.match(getStartedSource, /no larger than 10 MB/);
  assert.match(getStartedSource, /No password, login code/);
  assert.match(sitemapSource, /\/get-started/);
  assert.match(layoutSource, /PageViewTracker/);
  assert.match(layoutSource, /StructuredData/);
  assert.match(layoutSource, /skip-link/);
  assert.match(layoutSource, /manifest\.webmanifest/);
  assert.match(globalStyles, /\.skip-link/);
  assert.match(globalStyles, /prefers-reduced-motion/);
  assert.match(globalStyles, /animation-duration:\s*0\.01ms/);
  assert.match(analyticsSource, /retentionDays = 90/);
  assert.match(analyticsSource, /website-conversions\.json/);
  assert.match(pageTrackerSource, /navigator\.doNotTrack === "1"/);
  assert.match(pageTrackerSource, /\/api\/analytics\/event/);
  assert.match(discordRedirectSource, /https:\/\/discord\.gg\/voramlbb/);
  assert.match(discordRedirectSource, /recordDiscordClick/);
  assert.match(privacySource, /does not create visitor profiles/);
  assert.match(privacySource, /retained\s+for up to 90 days/);
  assert.match(updatesSource, /Vora is live/);
  assert.match(updatesSource, /WHAT WE ARE IMPROVING NEXT/);
  assert.match(updatesSource, /updates-final/);
  assert.match(sitemapSource, /\/updates/);
  assert.match(analyticsSource, /"\/updates"/);
  assert.match(manifestSource, /Vora — Find Your Five/);
  assert.match(manifestSource, /start_url:\s*"\/"/);
  assert.match(structuredDataSource, /"@type": "WebSite"/);
  assert.match(structuredDataSource, /"@type": "SoftwareApplication"/);
  assert.match(structuredDataSource, /replace\(\/</);
  assert.match(healthRouteSource, /X-Robots-Tag/);
  assert.match(healthRouteSource, /Retry-After/);
  assert.match(healthRouteSource, /Cache-Control/);
  assert.match(publicHealthSource, /publicHealthMaximumAgeMs/);
  assert.match(publicHealthSource, /services:\s*\{/);
  assert.doesNotMatch(
    publicHealthSource,
    /discordId|guildId|MONGODB_URI|maintenanceReason/,
  );
  assert.match(controlSource, /Vora at a glance/);
  assert.match(controlSource, /No player identifiers/);
  assert.match(controlSource, /Overview/);
  assert.match(controlSource, /Onboarding/);
  assert.match(controlSource, /Matchmaking/);
  assert.match(controlSource, /Integrity/);
  assert.match(controlSource, /System/);
  assert.match(controlSource, /SEVEN-DAY SIGNAL/);
  assert.match(controlSource, /index:\s*false/);
  assert.match(controlDataSource, /\/app\/public-data\/control\.json/);
  assert.match(controlDataSource, /snapshot\.schemaVersion !== 2/);
  assert.match(controlDataSource, /pendingOlderThan48Hours/);
  assert.match(controlDataSource, /isTrendComparison/);
  assert.match(robotsSource, /disallow:\s*"\/control"/);
  assert.doesNotMatch(sitemapSource, /\/control/);
  for (const [source, canonical] of [
    [getStartedSource, "/get-started"],
    [liveSource, "/live"],
    [howItWorksSource, "/how-it-works"],
    [ratingSource, "/rating"],
    [seasonsSource, "/seasons"],
    [faqSource, "/faq"],
    [supportSource, "/support"],
    [privacySource, "/privacy"],
    [termsSource, "/terms"],
    [updatesSource, "/updates"],
  ]) {
    assert.match(source, new RegExp(`canonical:\\s*"${canonical}"`));
  }
  assert.doesNotMatch(pageSource, /codex-preview|react-loading-skeleton/i);
});
