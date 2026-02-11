const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Config } = require('../config');

module.exports.AuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new createError.Unauthorized('Token requerido');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new createError.Unauthorized('Token inválido');
        }

        const decoded = jwt.verify(token, Config.jwt_secret);

        // Guardamos el usuario decodificado en la request
        req.user = decoded;

        next();
    } catch (error) {
        next(new createError.Unauthorized('Token inválido o expirado'));
    }
};
