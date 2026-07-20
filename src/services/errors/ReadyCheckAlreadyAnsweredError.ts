export class ReadyCheckAlreadyAnsweredError extends Error {
  public constructor() {
    super("You have already answered this ready check.");
    this.name = "ReadyCheckAlreadyAnsweredError";
  }
}
