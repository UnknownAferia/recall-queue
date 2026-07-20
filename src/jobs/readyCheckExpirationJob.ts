import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import { SquadConfig } from "../constants/squad.js";
import { formatError } from "../utils/formatError.js";

export function startReadyCheckExpirationJob(client: VoraClient): void {
  let sweepInProgress = false;

  const sweep = async (): Promise<void> => {
    if (sweepInProgress) {
      return;
    }

    sweepInProgress = true;

    try {
      const result =
        await client.services.teamFormation.cancelExpiredReadyChecks();

      if (result.cancelledReadyChecks > 0) {
        logger.info(
          `Cancelled ${result.cancelledReadyChecks} expired ready check(s) and penalized ${result.penalizedPlayers} unavailable player(s).`,
        );
      }
    } catch (error: unknown) {
      logger.error(
        `Ready-check expiration sweep failed:\n${formatError(error)}`,
      );
    } finally {
      sweepInProgress = false;
    }
  };

  void sweep();

  const timer = setInterval(
    () => void sweep(),
    SquadConfig.expirationSweepIntervalMs,
  );

  timer.unref();
}
