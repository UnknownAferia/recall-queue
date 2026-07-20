export class RolePreferencesRequiredError extends Error {
  public constructor() {
    super(
      "Select a primary and secondary role before joining the matchmaking queue.",
    );

    this.name = "RolePreferencesRequiredError";
  }
}