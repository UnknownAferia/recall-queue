export class PlayerAdministrationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PlayerAdministrationError";
  }
}
