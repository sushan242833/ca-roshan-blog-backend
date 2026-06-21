export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(404, message, "NOT_FOUND", details);
  }
}

export class UnsupportedMediaTypeError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(415, message, "UNSUPPORTED_MEDIA_TYPE", details);
  }
}

export class PayloadTooLargeError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(413, message, "PAYLOAD_TOO_LARGE", details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(500, message, "INTERNAL_SERVER_ERROR", details);
  }
}
