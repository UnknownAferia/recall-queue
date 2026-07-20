export class DevelopmentSimulationUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DevelopmentSimulationUnavailableError";
  }
}
