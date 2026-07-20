export class PlayerAlreadyInActiveSquadError extends Error {
  public constructor() {
    super(
      "You cannot join another queue while a ready check or active squad is in progress.",
    );
    this.name = "PlayerAlreadyInActiveSquadError";
  }
}
