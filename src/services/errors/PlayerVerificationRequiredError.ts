import type { PlayerVerificationStatus } from "../../constants/playerVerification.js";

export class PlayerVerificationRequiredError extends Error {
  public constructor(status: PlayerVerificationStatus) {
    super(
      status === "pending"
        ? "Your Mobile Legends account verification is still pending."
        : status === "rejected"
          ? "Your Mobile Legends account verification was rejected. Submit a new screenshot with `/verify-account`."
          : "Verify your Mobile Legends account with `/verify-account` before joining matchmaking.",
    );
    this.name = "PlayerVerificationRequiredError";
  }
}
