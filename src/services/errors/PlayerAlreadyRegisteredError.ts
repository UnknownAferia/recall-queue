export class PlayerAlreadyRegisteredError extends Error {
  public constructor() {
    super("This Discord account is already registered.");
    this.name = "PlayerAlreadyRegisteredError";
  }
}