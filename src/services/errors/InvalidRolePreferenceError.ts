export class InvalidRolePreferenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidRolePreferenceError";
  }
}