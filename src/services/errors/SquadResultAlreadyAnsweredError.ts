export class SquadResultAlreadyAnsweredError extends Error {
  public constructor() {
    super("You have already responded to this result report.");
    this.name = "SquadResultAlreadyAnsweredError";
  }
}
