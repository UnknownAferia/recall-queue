export class TicketOperationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TicketOperationError";
  }
}
