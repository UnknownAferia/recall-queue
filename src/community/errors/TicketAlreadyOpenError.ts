export class TicketAlreadyOpenError extends Error {
  public constructor(public readonly channelId: string) {
    super(`You already have an open ticket: <#${channelId}>`);
    this.name = "TicketAlreadyOpenError";
  }
}
