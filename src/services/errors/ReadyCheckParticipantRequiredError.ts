export class ReadyCheckParticipantRequiredError extends Error {
  public constructor() {
    super("Only players in this squad can answer its ready check.");
    this.name = "ReadyCheckParticipantRequiredError";
  }
}
