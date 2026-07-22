export class InvalidSeasonDataError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidSeasonDataError";
  }
}
