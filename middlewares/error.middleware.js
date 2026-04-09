// Error Middleware: 👉 Used to HANDLE errors
const errorMiddleware = (err, req, res,  next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Something went wrong";

    return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack // give location of error but not in production. Only developing environment
    })
};

export default errorMiddleware;
