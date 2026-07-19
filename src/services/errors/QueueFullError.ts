export class QueueFullError extends Error {
  public constructor() {
    super("The matchmaking queue is currently full.");
    this.name = "QueueFullError";
  }
}