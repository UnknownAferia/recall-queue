export class CommunitySquadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommunitySquadError";
  }
}
