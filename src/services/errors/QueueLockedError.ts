export class QueueLockedError extends Error {
  public constructor() {
    super("The matchmaking queue is currently locked.");
    this.name = "QueueLockedError";
  }
}