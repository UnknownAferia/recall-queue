export class ResultEvidenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResultEvidenceError";
  }
}
