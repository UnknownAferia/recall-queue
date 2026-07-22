export class SystemMaintenanceError extends Error {
  public constructor(public readonly area: "registration" | "matchmaking") {
    super(
      area === "registration"
        ? "Player registration is temporarily unavailable while Vora is under maintenance."
        : "Matchmaking is temporarily unavailable while Vora is under maintenance.",
    );
    this.name = "SystemMaintenanceError";
  }
}
