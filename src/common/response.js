const createError = require('http-errors');

module.exports.Response = {
    success: (res, status = 200, message = 'Ok', body = {}) => {
        return res.status(status).json({
            message,
            body
        });
    },

    error: (res, error = null) => {
        const defaultError = new createError.InternalServerError();

        const statusCode = error?.statusCode || defaultError.statusCode;
        const message = error?.message || defaultError.message;

        return res.status(statusCode).json({
            message
        });
    }
};
