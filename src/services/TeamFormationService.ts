import { normalizePlayerRole } from "../constants/playerRoles.js";
import { QueueConfig } from "../constants/queue.js";
import { ResultEvidenceConfig } from "../constants/resultEvidence.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadDto } from "../dto/SquadDto.js";
import type { SquadResultEvidence } from "../types/squad.js";
import {
  TeamFormationEngine,
  type QueuedMatchmakingCandidate,
} from "../domain/matchmaking/TeamFormationEngine.js";
import { MatchmakingCandidateMapper } from "../mappers/MatchmakingCandidateMapper.js";
import { SquadMapper } from "../mappers/SquadMapper.js";
import type { QueueRepository } from "../repositories/QueueRepository.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";
import type { PlayerService } from "./PlayerService.js";
import type { VerifiedResultProcessor } from "./VerifiedResultProcessor.js";
import type { QueueDisciplineService } from "./QueueDisciplineService.js";
import { ActiveSquadParticipantRequiredError } from "./errors/ActiveSquadParticipantRequiredError.js";
import { ActiveSquadUnavailableError } from "./errors/ActiveSquadUnavailableError.js";
import { ReadyCheckAlreadyAnsweredError } from "./errors/ReadyCheckAlreadyAnsweredError.js";
import { ReadyCheckParticipantRequiredError } from "./errors/ReadyCheckParticipantRequiredError.js";
import { ReadyCheckUnavailableError } from "./errors/ReadyCheckUnavailableError.js";
import { SquadCaptainRequiredError } from "./errors/SquadCaptainRequiredError.js";
import { SquadResultAlreadyAnsweredError } from "./errors/SquadResultAlreadyAnsweredError.js";
import { SquadResultUnavailableError } from "./errors/SquadResultUnavailableError.js";
import { ResultEvidenceError } from "./errors/ResultEvidenceError.js";

export type ReadyCheckResponse = "accepted" | "declined";
export type SquadClosure = "completed" | "cancelled";
export type SquadResultResponse = "confirmed" | "disputed";

export interface ReadyCheckExpirationResult {
  readonly cancelledReadyChecks: number;
  readonly penalizedPlayers: number;
}

export class TeamFormationService {
  public constructor(
    private readonly queueRepository: QueueRepository,
    private readonly squadRepository: SquadRepository,
    private readonly playerService: PlayerService,
    private readonly teamFormationEngine: TeamFormationEngine,
    private readonly verifiedResultProcessor: VerifiedResultProcessor,
    private readonly queueDisciplineService: QueueDisciplineService,
  ) {}

  public async tryCreateSquadFromQueue(
    guildId: string,
  ): Promise<SquadDto | null> {
    const queue = await this.queueRepository.getOrCreate(guildId);

    if (
      queue.status !== "open" ||
      queue.entries.length < QueueConfig.teamSize
    ) {
      return null;
    }

    const queuedDiscordIds = queue.entries.map((entry) => entry.discordId);

    const players = await this.playerService.getByDiscordIds(queuedDiscordIds);

    const playersByDiscordId = new Map(
      players.map((player) => [player.discord.id, player]),
    );

    const unavailableDiscordIds: string[] = [];
    const candidates: QueuedMatchmakingCandidate[] = [];

    for (const entry of queue.entries) {
      const player = playersByDiscordId.get(entry.discordId);

      if (!player) {
        unavailableDiscordIds.push(entry.discordId);
        continue;
      }

      const primaryRole = normalizePlayerRole(player.preferences.roles.primary);

      const secondaryRole = normalizePlayerRole(
        player.preferences.roles.secondary,
      );

      const avoidedRole = normalizePlayerRole(player.preferences.roles.avoided);

      if (
        !primaryRole ||
        !secondaryRole ||
        primaryRole === secondaryRole ||
        avoidedRole === primaryRole ||
        avoidedRole === secondaryRole
      ) {
        unavailableDiscordIds.push(entry.discordId);
        continue;
      }

      candidates.push({
        candidate: MatchmakingCandidateMapper.fromPlayer(player),
        joinedAt: new Date(entry.joinedAt),
      });
    }

    await this.queueRepository.removePlayers(guildId, unavailableDiscordIds);

    const formation = this.teamFormationEngine.form(candidates);

    if (!formation) {
      return null;
    }

    const squad = await this.squadRepository.createFromQueue(queue, formation);

    return squad ? SquadMapper.toDto(squad) : null;
  }

  public async respondToReadyCheck(
    squadId: string,
    guildId: string,
    discordId: string,
    response: ReadyCheckResponse,
  ): Promise<SquadDto> {
    const currentSquad = await this.squadRepository.findById(squadId);

    if (
      !currentSquad ||
      currentSquad.guildId !== guildId ||
      currentSquad.status !== "ready_check"
    ) {
      throw new ReadyCheckUnavailableError();
    }

    if (currentSquad.readyCheckExpiresAt.getTime() <= Date.now()) {
      const cancelledSquad =
        await this.squadRepository.cancelReadySquad(squadId);

      if (cancelledSquad) {
        await this.queueDisciplineService.applyTimeoutPenalties(
          SquadMapper.toDto(cancelledSquad),
        );
      }

      throw new ReadyCheckUnavailableError();
    }

    const participant = currentSquad.participants.find(
      (candidate) => candidate.discordId === discordId,
    );

    if (!participant) {
      throw new ReadyCheckParticipantRequiredError();
    }

    if (participant.readyStatus !== "pending") {
      throw new ReadyCheckAlreadyAnsweredError();
    }

    let updatedSquad = await this.squadRepository.setParticipantReadyStatus(
      squadId,
      guildId,
      discordId,
      response,
    );

    if (!updatedSquad) {
      throw new ReadyCheckUnavailableError();
    }

    if (response === "declined") {
      updatedSquad =
        (await this.squadRepository.cancelReadySquad(squadId, discordId)) ??
        updatedSquad;
      await this.queueDisciplineService.applyPenalty(discordId, "decline");
    } else {
      await this.queueDisciplineService.recordAcceptance(discordId);

      const everyoneAccepted = updatedSquad.participants.every(
        (candidate) => candidate.readyStatus === "accepted",
      );

      if (everyoneAccepted) {
        updatedSquad =
          (await this.squadRepository.activateReadySquad(squadId)) ??
          updatedSquad;
      }
    }

    return SquadMapper.toDto(updatedSquad);
  }

  public async getActiveSquadForPlayer(
    guildId: string,
    discordId: string,
  ): Promise<SquadDto | null> {
    const squad = await this.squadRepository.findActiveByDiscordId(
      guildId,
      discordId,
    );

    return squad ? SquadMapper.toDto(squad) : null;
  }

  public async getVerifiedHistory(
    guildId: string,
    discordId: string,
  ): Promise<SquadDto[]> {
    const squads = await this.squadRepository.findRecentVerifiedByDiscordId(
      guildId,
      discordId,
      SquadConfig.historyLimit,
    );

    return squads.map((squad) => SquadMapper.toDto(squad));
  }

  public async closeActiveSquad(
    squadId: string,
    guildId: string,
    discordId: string,
    closure: SquadClosure,
  ): Promise<SquadDto> {
    const currentSquad = await this.squadRepository.findById(squadId);

    if (
      !currentSquad ||
      currentSquad.guildId !== guildId ||
      currentSquad.status !== "active" ||
      (currentSquad.resultReportExpiresAt !== null &&
        currentSquad.resultReportExpiresAt !== undefined &&
        currentSquad.resultReportExpiresAt.getTime() <= Date.now())
    ) {
      throw new ActiveSquadUnavailableError();
    }

    const participantExists = currentSquad.participants.some(
      (participant) => participant.discordId === discordId,
    );

    if (!participantExists) {
      throw new ActiveSquadParticipantRequiredError();
    }

    if (
      closure === "completed" &&
      currentSquad.captainDiscordId !== discordId
    ) {
      throw new SquadCaptainRequiredError();
    }

    const updatedSquad = await this.squadRepository.closeActiveSquad(
      squadId,
      guildId,
      closure,
      discordId,
    );

    if (!updatedSquad) {
      throw new ActiveSquadUnavailableError();
    }

    return SquadMapper.toDto(updatedSquad);
  }

  public async reportSquadResult(
    squadId: string,
    guildId: string,
    discordId: string,
    outcome: "win" | "loss",
    evidence: SquadResultEvidence,
  ): Promise<SquadDto> {
    await this.assertCanReportSquadResult(squadId, guildId, discordId);
    this.assertValidResultEvidence(evidence, discordId);

    const updatedSquad = await this.squadRepository.submitResultReport(
      squadId,
      guildId,
      discordId,
      outcome,
      evidence,
    );

    if (!updatedSquad) {
      throw new SquadResultUnavailableError();
    }

    return SquadMapper.toDto(updatedSquad);
  }

  public async assertCanReportSquadResult(
    squadId: string,
    guildId: string,
    discordId: string,
  ): Promise<void> {
    const currentSquad = await this.squadRepository.findById(squadId);

    if (
      !currentSquad ||
      currentSquad.guildId !== guildId ||
      currentSquad.status !== "active" ||
      (currentSquad.resultReportExpiresAt !== null &&
        currentSquad.resultReportExpiresAt !== undefined &&
        currentSquad.resultReportExpiresAt.getTime() <= Date.now())
    ) {
      throw new SquadResultUnavailableError();
    }

    const participantExists = currentSquad.participants.some(
      (participant) => participant.discordId === discordId,
    );

    if (!participantExists) {
      throw new ActiveSquadParticipantRequiredError();
    }

    if (currentSquad.captainDiscordId !== discordId) {
      throw new SquadCaptainRequiredError();
    }
  }

  private assertValidResultEvidence(
    evidence: SquadResultEvidence,
    reporterDiscordId: string,
  ): void {
    const contentTypeIsAccepted =
      ResultEvidenceConfig.acceptedContentTypes.includes(
        evidence?.contentType as (typeof ResultEvidenceConfig.acceptedContentTypes)[number],
      );
    const submittedAtIsValid =
      evidence?.submittedAt instanceof Date &&
      !Number.isNaN(evidence.submittedAt.getTime());

    if (
      !evidence ||
      evidence.submittedByDiscordId !== reporterDiscordId ||
      !evidence.archiveChannelId ||
      !evidence.archiveMessageId ||
      !evidence.archiveAttachmentId ||
      !evidence.fileName.trim() ||
      !contentTypeIsAccepted ||
      evidence.size <= 0 ||
      evidence.size > ResultEvidenceConfig.maximumFileSizeBytes ||
      !submittedAtIsValid
    ) {
      throw new ResultEvidenceError(
        "A valid archived result screenshot from the squad captain is required.",
      );
    }
  }

  public async respondToSquadResult(
    squadId: string,
    guildId: string,
    discordId: string,
    response: SquadResultResponse,
  ): Promise<SquadDto> {
    const currentSquad = await this.squadRepository.findById(squadId);

    if (
      !currentSquad ||
      currentSquad.guildId !== guildId ||
      currentSquad.status !== "result_pending" ||
      !currentSquad.result ||
      (currentSquad.resultConfirmationExpiresAt !== null &&
        currentSquad.resultConfirmationExpiresAt !== undefined &&
        currentSquad.resultConfirmationExpiresAt.getTime() <= Date.now())
    ) {
      throw new SquadResultUnavailableError();
    }

    const participantExists = currentSquad.participants.some(
      (participant) => participant.discordId === discordId,
    );

    if (!participantExists) {
      throw new ActiveSquadParticipantRequiredError();
    }

    if (
      currentSquad.result.confirmedByDiscordIds.includes(discordId) ||
      currentSquad.result.disputedByDiscordIds.includes(discordId)
    ) {
      throw new SquadResultAlreadyAnsweredError();
    }

    let updatedSquad = await this.squadRepository.recordResultResponse(
      squadId,
      guildId,
      discordId,
      response,
    );

    if (!updatedSquad || !updatedSquad.result) {
      throw new SquadResultUnavailableError();
    }

    if (response === "disputed") {
      updatedSquad =
        (await this.squadRepository.markResultDisputed(squadId, discordId)) ??
        updatedSquad;
    } else if (
      updatedSquad.result.confirmedByDiscordIds.length >=
      SquadConfig.resultConfirmationsRequired
    ) {
      updatedSquad =
        (await this.verifiedResultProcessor.process(squadId)) ??
        (await this.squadRepository.findById(squadId)) ??
        updatedSquad;
    }

    return SquadMapper.toDto(updatedSquad);
  }

  public async cancelExpiredReadyChecks(): Promise<ReadyCheckExpirationResult> {
    const cancelledSquads =
      await this.squadRepository.cancelExpiredReadyChecks();
    const penalizedCounts = await Promise.all(
      cancelledSquads.map((squad) =>
        this.queueDisciplineService.applyTimeoutPenalties(
          SquadMapper.toDto(squad),
        ),
      ),
    );

    return {
      cancelledReadyChecks: cancelledSquads.length,
      penalizedPlayers: penalizedCounts.reduce(
        (total, count) => total + count,
        0,
      ),
    };
  }

  public async expireReadyCheck(squadId: string): Promise<SquadDto | null> {
    const currentSquad = await this.squadRepository.findById(squadId);

    if (!currentSquad) {
      return null;
    }

    if (
      currentSquad.status !== "ready_check" ||
      currentSquad.readyCheckExpiresAt.getTime() > Date.now()
    ) {
      return SquadMapper.toDto(currentSquad);
    }

    const cancelledSquad = await this.squadRepository.cancelReadySquad(squadId);

    if (cancelledSquad) {
      await this.queueDisciplineService.applyTimeoutPenalties(
        SquadMapper.toDto(cancelledSquad),
      );

      return SquadMapper.toDto(cancelledSquad);
    }

    const latestSquad = await this.squadRepository.findById(squadId);

    return latestSquad ? SquadMapper.toDto(latestSquad) : null;
  }

  public async cancelReadyCheck(
    squadId: string,
    closedByDiscordId: string | null = null,
  ): Promise<void> {
    await this.squadRepository.cancelReadySquad(squadId, closedByDiscordId);
  }
}
