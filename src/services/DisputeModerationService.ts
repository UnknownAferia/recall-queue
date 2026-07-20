import type { SquadDto } from "../dto/SquadDto.js";
import {
  IntegritySanctionActions,
  type IntegritySanctionAction,
} from "../constants/integrity.js";
import { SquadMapper } from "../mappers/SquadMapper.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";
import { InvalidDisputeReferenceError } from "./errors/InvalidDisputeReferenceError.js";
import type { VerifiedResultProcessor } from "./VerifiedResultProcessor.js";

const DisputeInboxLimit = 10;
const ObjectIdPattern = /^[a-f\d]{24}$/i;

export const DisputeResolutionActions = [
  "uphold",
  "victory",
  "defeat",
  "void",
] as const;

export type DisputeResolutionAction =
  (typeof DisputeResolutionActions)[number];

export class DisputeModerationService {
  public constructor(
    private readonly squadRepository: SquadRepository,
    private readonly verifiedResultProcessor: VerifiedResultProcessor,
  ) {}

  public async getInbox(
    guildId: string,
    squadId?: string,
  ): Promise<SquadDto[]> {
    if (!squadId) {
      const squads = await this.squadRepository.findDisputedByGuild(
        guildId,
        DisputeInboxLimit,
      );

      return squads.map((squad) => SquadMapper.toDto(squad));
    }

    const normalizedSquadId = squadId.trim();

    if (!ObjectIdPattern.test(normalizedSquadId)) {
      throw new InvalidDisputeReferenceError();
    }

    const squad = await this.squadRepository.findDisputedById(
      guildId,
      normalizedSquadId,
    );

    if (!squad) {
      throw new InvalidDisputeReferenceError();
    }

    return [SquadMapper.toDto(squad)];
  }

  public async resolve(
    guildId: string,
    squadId: string,
    moderatorDiscordId: string,
    action: DisputeResolutionAction,
    sanctionAction: IntegritySanctionAction,
  ): Promise<SquadDto> {
    const normalizedSquadId = squadId.trim();

    if (
      !ObjectIdPattern.test(normalizedSquadId) ||
      !DisputeResolutionActions.includes(action) ||
      !IntegritySanctionActions.includes(sanctionAction)
    ) {
      throw new InvalidDisputeReferenceError();
    }

    const disputedSquad = await this.squadRepository.findDisputedById(
      guildId,
      normalizedSquadId,
    );

    if (!disputedSquad?.result) {
      throw new InvalidDisputeReferenceError();
    }

    const originalOutcome = disputedSquad.result.outcome;
    const reportedByDiscordId =
      disputedSquad.result.reportedByDiscordId;

    if (action === "void") {
      const voidedSquad =
        await this.verifiedResultProcessor.processModeratedVoid(
        normalizedSquadId,
        guildId,
        moderatorDiscordId,
        originalOutcome,
        reportedByDiscordId,
        sanctionAction,
      );

      if (!voidedSquad) {
        throw new InvalidDisputeReferenceError();
      }

      return SquadMapper.toDto(voidedSquad);
    }

    const finalOutcome =
      action === "uphold"
        ? originalOutcome
        : action === "victory"
          ? "win"
          : "loss";

    const completedSquad =
      await this.verifiedResultProcessor.processModerated(
        normalizedSquadId,
        guildId,
        moderatorDiscordId,
        originalOutcome,
        finalOutcome,
        reportedByDiscordId,
        sanctionAction,
      );

    if (!completedSquad) {
      throw new InvalidDisputeReferenceError();
    }

    return SquadMapper.toDto(completedSquad);
  }
}
