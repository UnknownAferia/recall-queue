export class PlayerProfileNotFoundError extends Error {
  public constructor() {
    super(
      "You must register your Mobile Legends account before configuring role preferences.",
    );

    this.name = "PlayerProfileNotFoundError";
  }
}