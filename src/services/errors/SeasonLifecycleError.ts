export class SeasonLifecycleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SeasonLifecycleError";
  }
}
