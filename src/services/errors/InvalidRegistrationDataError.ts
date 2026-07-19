export class InvalidRegistrationDataError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidRegistrationDataError";
  }
}