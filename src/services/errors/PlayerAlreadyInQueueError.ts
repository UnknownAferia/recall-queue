export class PlayerAlreadyInQueueError extends Error {
  public constructor() {
    super("You are already in the matchmaking queue.");
    this.name = "PlayerAlreadyInQueueError";
  }
}