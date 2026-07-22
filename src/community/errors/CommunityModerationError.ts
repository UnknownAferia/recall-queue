export class CommunityModerationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommunityModerationError";
  }
}
