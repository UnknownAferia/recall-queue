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
    assert.match(dockerfile, /USER node/);
  });

  it("isolates both long-running services without publishing ports", () => {
    const compose = readProjectFile("compose.production.example.yml");

    assert.match(compose, /vora-core:/);
    assert.match(compose, /vora-community:/);
    assert.match(compose, /read_only: true/);
    assert.match(compose, /no-new-privileges:true/);
    assert.match(compose, /cap_drop:/);
    assert.doesNotMatch(compose, /^\s+ports:/m);
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
    assert.match(backupTimer, /Persistent=true/);
    assert.match(healthTimer, /OnUnitActiveSec=2min/);
  });
});
