export class SquadResultUnavailableError extends Error {
  public constructor() {
    super("This squad result report is no longer available.");
    this.name = "SquadResultUnavailableError";
  }
}
