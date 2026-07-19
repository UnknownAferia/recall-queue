export class PlayerRegistrationRequiredError extends Error {
  public constructor() {
    super(
      "You must register your Mobile Legends account before joining the queue.",
    );

    this.name = "PlayerRegistrationRequiredError";
  }
}