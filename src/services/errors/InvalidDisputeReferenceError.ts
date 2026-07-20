export class InvalidDisputeReferenceError extends Error {
  public constructor() {
    super("The provided squad reference is invalid or is not awaiting review.");
    this.name = "InvalidDisputeReferenceError";
  }
}
