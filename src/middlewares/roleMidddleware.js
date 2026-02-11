const createError = require('http-errors');

module.exports.RoleMiddleware = (allowedRoles = []) => {
    return (req, res, next) => {
        const { role } = req.user;

        if (!allowedRoles.includes(role)) {
            return next(new createError.Forbidden('No tienes permisos para realizar esta acción'));
        }

        next();
    };
};

