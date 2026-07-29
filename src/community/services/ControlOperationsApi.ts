import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";

import { PermissionFlagsBits } from "discord.js";

import { logger } from "../../config/logger.js";
import { PlayerVerificationModel } from "../../models/PlayerVerificationModel.js";
import { OperationalAuditService } from "../../services/OperationalAuditService.js";
import { OperationalControlService } from "../../services/OperationalControlService.js";
import type { MaintenanceScope } from "../../types/operations.js";
import type { CommunityClient } from "../CommunityClient.js";

const MaximumBodyBytes = 64 * 1024;
const MaximumRequestAgeMs = 30_000;

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createControlOperationsSignature(
  secret: string,
  timestamp: string,
  actorDiscordId: string,
  guildId: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${actorDiscordId}.${guildId}.${body}`)
    .digest("hex");
}

export function verifyControlOperationsSignature(input: {
  readonly secret: string;
  readonly timestamp: string;
  readonly signature: string;
  readonly actorDiscordId: string;
  readonly guildId: string;
  readonly body: string;
  readonly now?: Date;
}) {
  const time = Number(input.timestamp);
  const now = input.now?.getTime() ?? Date.now();
  if (
    input.secret.length < 32 ||
    !Number.isSafeInteger(time) ||
    Math.abs(now - time) > MaximumRequestAgeMs ||
    !/^\d{17,20}$/.test(input.actorDiscordId) ||
    !/^\d{17,20}$/.test(input.guildId)
  ) {
    return false;
  }

  return secureEqual(
    input.signature,
    createControlOperationsSignature(
      input.secret,
      input.timestamp,
      input.actorDiscordId,
      input.guildId,
      input.body,
    ),
  );
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MaximumBodyBytes) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function json(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store",
  });
  response.end(JSON.stringify(body));
}

export class ControlOperationsApi {
  private server: Server | null = null;
  private readonly secret = process.env.VORA_CONTROL_API_SECRET?.trim() ?? "";
  private readonly port = Number(process.env.VORA_CONTROL_API_PORT ?? 3100);
  private readonly operational = new OperationalControlService();
  private readonly audit = new OperationalAuditService();

  public constructor(private readonly client: CommunityClient) {}

  public start() {
    if (this.server || this.secret.length < 32) {
      if (this.secret.length < 32) {
        logger.warn(
          "Vora Control operations API disabled: VORA_CONTROL_API_SECRET is not configured.",
        );
      }
      return;
    }

    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server.listen(this.port, "0.0.0.0", () => {
      logger.info(
        `Vora Control operations API listening on port ${this.port}.`,
      );
    });
  }

  public stop() {
    this.server?.close();
    this.server = null;
  }

  private async handle(
    request: IncomingMessage,
    response: import("node:http").ServerResponse,
  ) {
    try {
      if (request.url !== "/v1/operations") {
        json(response, 404, { error: "Not found" });
        return;
      }

      const raw = request.method === "POST" ? await readBody(request) : "";
      if (!this.authorized(request, raw)) {
        json(response, 401, { error: "Unauthorized" });
        return;
      }

      const actorDiscordId = String(request.headers["x-vora-actor"] ?? "");
      const guildId = String(request.headers["x-vora-guild"] ?? "");
      const guild = this.client.guilds.cache.get(guildId);
      const actor = guild
        ? await guild.members.fetch(actorDiscordId).catch(() => null)
        : null;
      if (
        !guild ||
        !actor ||
        (!actor.permissions.has(PermissionFlagsBits.ModerateMembers) &&
          actor.id !== guild.ownerId)
      ) {
        json(response, 403, { error: "Operations permission required." });
        return;
      }

      if (request.method === "GET") {
        const [state, verificationRequests, reports, sessions] =
          await Promise.all([
            this.operational.getState(),
            PlayerVerificationModel.find({
              guildId,
              status: "pending",
            })
              .sort({ submittedAt: 1 })
              .limit(25)
              .lean()
              .exec(),
            this.client.reports.getInbox(guildId),
            this.client.activation.getUpcomingSessions(guildId),
          ]);
        json(response, 200, {
          state,
          verificationRequests: verificationRequests.map((entry) => ({
            id: String(entry._id),
            playerDiscordId: entry.playerDiscordId,
            ign: entry.game.ign,
            playerId: entry.game.playerId,
            serverId: entry.game.serverId,
            submittedAt: entry.submittedAt,
            evidenceUrl: `https://discord.com/channels/${guildId}/${entry.evidence.archiveChannelId}/${entry.evidence.archiveMessageId}`,
          })),
          reports: reports.map((report) => ({
            number: report.reportNumber,
            type: report.type,
            reporterDiscordId: report.reporterDiscordId,
            targetDiscordId: report.targetDiscordId,
            description: report.description,
            createdAt: report.createdAt,
          })),
          sessions,
        });
        return;
      }

      if (request.method !== "POST") {
        json(response, 405, { error: "Method not allowed" });
        return;
      }

      const input = JSON.parse(raw) as Record<string, unknown>;
      const action = String(input.action ?? "");
      let result: unknown;

      if (action === "maintenance.set") {
        const scope = String(input.scope) as MaintenanceScope;
        if (!["all", "registration", "matchmaking"].includes(scope)) {
          throw new Error("Invalid maintenance scope.");
        }
        result = await this.operational.setAccess(
          scope,
          Boolean(input.open),
          actor.id,
          String(input.reason ?? ""),
        );
        await this.client.panels.synchronizeMatchmakingStatus(guild);
      } else if (action === "session.schedule") {
        result = await this.client.activation.scheduleSession({
          guildId,
          title: String(input.title ?? ""),
          startsInMinutes: Number(input.startsInMinutes),
          durationMinutes: Number(input.durationMinutes),
          createdByDiscordId: actor.id,
        });
        await this.client.panels.synchronizeMatchmakingStatus(guild);
      } else if (action === "session.cancel") {
        result = await this.client.activation.cancelSession(
          guildId,
          String(input.sessionId ?? ""),
          actor.id,
        );
        await this.client.panels.synchronizeMatchmakingStatus(guild);
      } else if (action === "verification.review") {
        const decision = input.decision === "approve" ? "approve" : "reject";
        result = await this.client.playerVerification.review(
          String(input.requestId ?? ""),
          guildId,
          actor.id,
          decision,
          String(input.reason ?? ""),
        );
        const playerDiscordId = (result as { playerDiscordId: string })
          .playerDiscordId;
        const member = await guild.members
          .fetch(playerDiscordId)
          .catch(() => null);
        if (member) {
          await this.client.guildAccess.synchronizeVerifiedPlayerRole(
            member,
            decision === "approve" ? "verified" : "rejected",
          );
        }
      } else if (action === "report.dismiss") {
        result = await this.client.reports.dismiss(
          guild,
          actor,
          Number(input.reportNumber),
          String(input.reason ?? ""),
        );
      } else {
        throw new Error("Unsupported Control action.");
      }

      await this.audit.record({
        eventType: "control_action",
        guildId,
        actorDiscordId: actor.id,
        subjectType: "system",
        subjectId: action,
        details: {
          action,
          reason: String(input.reason ?? "") || null,
        },
      });
      json(response, 200, { ok: true, result });
    } catch (error: unknown) {
      logger.warn(
        `Vora Control operation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      json(response, 400, {
        error: error instanceof Error ? error.message : "Operation failed.",
      });
    }
  }

  private authorized(request: IncomingMessage, body: string) {
    const timestamp = String(request.headers["x-vora-timestamp"] ?? "");
    const signature = String(request.headers["x-vora-signature"] ?? "");
    const actor = String(request.headers["x-vora-actor"] ?? "");
    const guild = String(request.headers["x-vora-guild"] ?? "");
    return verifyControlOperationsSignature({
      secret: this.secret,
      timestamp,
      signature,
      actorDiscordId: actor,
      guildId: guild,
      body,
    });
  }
}
