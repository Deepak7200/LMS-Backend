// AppError (in utils) 👉 Used to CREATE errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor); // to get address of error
  }
}

export default AppError;
