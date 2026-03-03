const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Config } = require('../config');

module.exports.AuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new createError.Unauthorized('Token requerido');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new createError.Unauthorized('Formato de token inválido');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, Config.jwt_secret);

    req.user = decoded;

    next();

  } catch (error) {
    next(error);
  }
};