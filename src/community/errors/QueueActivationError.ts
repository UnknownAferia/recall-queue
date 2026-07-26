export class QueueActivationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "QueueActivationError";
  }
}
