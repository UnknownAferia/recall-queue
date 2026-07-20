export class SquadCaptainRequiredError extends Error {
  public constructor() {
    super("Only the squad captain can perform this action.");
    this.name = "SquadCaptainRequiredError";
  }
}
