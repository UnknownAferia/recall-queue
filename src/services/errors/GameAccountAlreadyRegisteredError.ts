export class GameAccountAlreadyRegisteredError extends Error {
  public constructor() {
    super("This Mobile Legends account is already registered.");
    this.name = "GameAccountAlreadyRegisteredError";
  }
}