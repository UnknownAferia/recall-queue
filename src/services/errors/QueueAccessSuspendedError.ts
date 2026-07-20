export class QueueAccessSuspendedError extends Error {
  public constructor(
    public readonly bannedUntil: Date,
  ) {
    super("Your matchmaking access is temporarily suspended.");
    this.name = "QueueAccessSuspendedError";
  }
}