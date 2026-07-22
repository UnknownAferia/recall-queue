export class CommunityReportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommunityReportError";
  }
}
