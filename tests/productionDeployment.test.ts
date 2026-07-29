import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Production deployment", () => {
  it("builds a non-root runtime with release validation and MongoDB tools", () => {
    const dockerfile = readProjectFile("Dockerfile");

    assert.match(dockerfile, /FROM dependencies AS quality/);
    assert.match(dockerfile, /RUN npm run check/);
    assert.match(dockerfile, /mongodump/);
    assert.match(dockerfile, /mongorestore/);
    assert.match(dockerfile, /ca-certificates/);
    assert.match(dockerfile, /USER node/);
  });

  it("isolates long-running services and publishes only the website edge", () => {
    const compose = readProjectFile("compose.production.example.yml");

    assert.match(compose, /vora-core:/);
    assert.match(compose, /vora-community:/);
    assert.match(compose, /vora-website:/);
    assert.match(compose, /vora-web:/);
    assert.match(compose, /read_only: true/);
    assert.match(compose, /no-new-privileges:true/);
    assert.match(compose, /cap_drop:/);
    assert.match(compose, /"80:80"/);
    assert.match(compose, /"443:443"/);
    assert.match(compose, /"443:443\/udp"/);
    assert.equal((compose.match(/^\s+ports:/gm) ?? []).length, 1);
    assert.match(compose, /vora-public-data:\/app\/public-data/);
    assert.match(compose, /vora-public-data:\/app\/public-data:ro/);
    assert.match(compose, /VORA_PUBLIC_DATA_DIRECTORY/);
    assert.match(compose, /vora-website-analytics:\/app\/website-analytics:ro/);
    assert.match(compose, /vora-website-analytics:\/app\/website-analytics/);
    assert.match(compose, /VORA_WEBSITE_ANALYTICS_FILE/);
    assert.match(compose, /VORA_CONTROL_USERNAME/);
    assert.match(compose, /VORA_CONTROL_PASSWORD_HASH/);
    assert.match(compose, /VORA_CONTROL_DISCORD_CLIENT_ID/);
    assert.match(compose, /VORA_CONTROL_DISCORD_CLIENT_SECRET/);
    assert.match(compose, /VORA_CONTROL_DISCORD_GUILD_ID/);
    assert.match(compose, /VORA_CONTROL_ALLOWED_ROLE_IDS/);
    assert.match(compose, /VORA_CONTROL_SESSION_SECRET/);
    assert.match(compose, /VORA_CONTROL_API_SECRET/);
    assert.match(compose, /http:\/\/vora-community:3100\/v1\/operations/);
  });

  it("provides verified backup, rollback and recurring health operations", () => {
    const deploy = readProjectFile("deploy/ubuntu/deploy.sh");
    const backupTimer = readProjectFile(
      "deploy/ubuntu/systemd/vora-backup.timer",
    );
    const healthTimer = readProjectFile(
      "deploy/ubuntu/systemd/vora-healthcheck.timer",
    );

    assert.match(deploy, /vora-backup-verify/);
    assert.match(deploy, /Rolling back/);
    assert.match(deploy, /\/etc\/vora\/vora\.env/);
    assert.match(deploy, /--env-file "\$\{VORA_ENVIRONMENT\}"/);
    assert.match(deploy, /Missing required Vora Control setting/);
    assert.match(deploy, /VORA_CONTROL_DISCORD_CLIENT_SECRET/);
    assert.match(deploy, /VORA_CONTROL_DISCORD_GUILD_ID/);
    assert.match(deploy, /VORA_CONTROL_API_SECRET/);
    assert.match(deploy, /VORA_CONTROL_SESSION_SECRET/);
    assert.match(deploy, /replace_with_/);
    assert.match(backupTimer, /Persistent=true/);
    assert.match(healthTimer, /OnUnitActiveSec=2min/);
  });

  it("builds the shared release image exactly once before Compose starts services", () => {
    const deploy = readProjectFile("deploy/ubuntu/deploy.sh");

    assert.match(
      deploy,
      /docker build --pull --target runtime --tag "vora:\$\{release\}"/,
    );
    assert.doesNotMatch(deploy, /compose "\$\{release\}" build/);
  });

  it("builds and health-checks the public website with automatic HTTPS", () => {
    const websiteDockerfile = readProjectFile("website/Dockerfile");
    const caddyfile = readProjectFile("deploy/web/Caddyfile");
    const deploy = readProjectFile("deploy/ubuntu/deploy.sh");

    assert.match(websiteDockerfile, /output.*standalone|server\.js/s);
    assert.match(websiteDockerfile, /USER nextjs/);
    assert.match(websiteDockerfile, /\/app\/website-analytics/);
    assert.match(caddyfile, /voramlbb\.com/);
    assert.match(caddyfile, /www\.voramlbb\.com/);
    assert.match(caddyfile, /reverse_proxy vora-website:3000/);
    assert.match(caddyfile, /homewallet\.ch/);
    assert.match(caddyfile, /reverse_proxy homewallet:3000/);
    assert.match(
      caddyfile,
      /@control path \/control \/control\/\* \/api\/control\/\*/,
    );
    assert.match(caddyfile, /basic_auth @control/);
    assert.match(caddyfile, /\{\$VORA_CONTROL_USERNAME\}/);
    assert.match(caddyfile, /\{\$VORA_CONTROL_PASSWORD_HASH\}/);
    assert.match(caddyfile, /Cache-Control "private, no-store"/);
    assert.match(caddyfile, /Content-Security-Policy/);
    assert.match(caddyfile, /frame-ancestors 'none'/);
    assert.match(caddyfile, /Cross-Origin-Opener-Policy "same-origin"/);
    assert.match(caddyfile, /Cross-Origin-Resource-Policy "same-origin"/);
    assert.match(deploy, /vora-website:\$\{release\}/);
    assert.match(deploy, /https:\/\/voramlbb\.com\//);
    assert.match(deploy, /https:\/\/voramlbb\.com\/api\/health/);
    assert.match(deploy, /public_stack_ready/);
  });
});
