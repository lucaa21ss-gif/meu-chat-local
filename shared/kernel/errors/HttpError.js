export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.statusCode = status;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = "Nao autorizado") {
    return new HttpError(401, message);
  }

  static forbidden(message = "Acesso negado") {
    return new HttpError(403, message);
  }

  static notFound(message = "Recurso nao encontrado") {
    return new HttpError(404, message);
  }

  static internal(message = "Erro interno no servidor") {
    return new HttpError(500, message);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}
