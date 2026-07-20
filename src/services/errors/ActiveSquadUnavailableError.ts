export class ActiveSquadUnavailableError extends Error {
  public constructor() {
    super("This squad session is no longer active.");
    this.name = "ActiveSquadUnavailableError";
  }
}
