export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }

  static notFound(resource = "Resource") {
    return new HttpError(404, `${resource} not found`);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new HttpError(400, message, details);
  }

  static conflict(message = "Conflict") {
    return new HttpError(409, message);
  }
}
