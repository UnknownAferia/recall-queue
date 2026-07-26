export class OnboardingAudienceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OnboardingAudienceError";
  }
}
