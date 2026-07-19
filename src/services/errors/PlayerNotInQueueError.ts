export class PlayerNotInQueueError extends Error {
  public constructor() {
    super("You are not currently in the matchmaking queue.");
    this.name = "PlayerNotInQueueError";
  }
}