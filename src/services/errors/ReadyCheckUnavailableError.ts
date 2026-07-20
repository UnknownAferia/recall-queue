export class ReadyCheckUnavailableError extends Error {
  public constructor() {
    super("This ready check is no longer available.");
    this.name = "ReadyCheckUnavailableError";
  }
}
