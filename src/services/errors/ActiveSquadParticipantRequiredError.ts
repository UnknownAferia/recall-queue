export class ActiveSquadParticipantRequiredError extends Error {
  public constructor() {
    super("Only members of this squad can manage its session.");
    this.name = "ActiveSquadParticipantRequiredError";
  }
}
