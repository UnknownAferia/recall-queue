import { logger } from "../config/logger.js";
import { CommunityConfig } from "../constants/community.js";
import {
  OperationalAuditRepository,
  type CreateOperationalAuditInput,
} from "../repositories/OperationalAuditRepository.js";
import { formatError } from "../utils/formatError.js";

export class OperationalAuditService {
  public constructor(
    private readonly repository = new OperationalAuditRepository(),
    private readonly timeoutMs = CommunityConfig.operationalAuditTimeoutMs,
  ) {}

  public async record(input: CreateOperationalAuditInput): Promise<void> {
    let timeout: NodeJS.Timeout | null = null;

    try {
      await Promise.race([
        this.repository.create(input),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            reject(
              new Error(
                `Operational audit write exceeded ${this.timeoutMs}ms.`,
              ),
            );
          }, this.timeoutMs);
          timeout.unref();
        }),
      ]);
    } catch (error: unknown) {
      logger.error(
        `Operational audit write failed for ${input.eventType}:\n${formatError(error)}`,
      );
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
