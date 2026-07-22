import { spawnSync } from "node:child_process";

const REDACTED_URI = "[REDACTED_MONGODB_URI]";
const REDACTED_SECRET = "[REDACTED]";

export function sanitizeMongoToolOutput(output, uri) {
  let sanitized = String(output ?? "");
  const secrets = new Set([uri]);

  try {
    const parsed = new URL(uri);

    if (parsed.password) {
      secrets.add(parsed.password);

      try {
        secrets.add(decodeURIComponent(parsed.password));
      } catch {
        // The encoded password is still redacted below.
      }
    }
  } catch {
    // A malformed URI is handled by the calling MongoDB tool.
  }

  for (const secret of secrets) {
    if (secret) {
      sanitized = sanitized.replaceAll(secret, REDACTED_SECRET);
    }
  }

  return sanitized.replace(
    /mongodb(?:\+srv)?:\/\/[^\s]+/giu,
    REDACTED_URI,
  );
}

export function runMongoTool(command, args, uri) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  const stdout = sanitizeMongoToolOutput(result.stdout, uri);
  const stderr = sanitizeMongoToolOutput(result.stderr, uri);

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return result;
}
