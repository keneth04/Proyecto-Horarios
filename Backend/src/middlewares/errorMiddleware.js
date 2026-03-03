const createError = require('http-errors');

module.exports.ErrorMiddleware = (err, req, res, next) => {

  if (!err) {
    err = new createError.InternalServerError();
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: true,
    status: statusCode,
    message
  });
};
