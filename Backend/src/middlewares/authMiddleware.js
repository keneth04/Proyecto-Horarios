const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Config } = require('../config');
const { getAuthTokenFromCookies } = require('../common/cookies');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return getAuthTokenFromCookies(req);
};

module.exports.AuthMiddleware = (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new createError.Unauthorized('Token requerido');
    }

    const decoded = jwt.verify(token, Config.jwt_secret);

    req.user = decoded;

    next();

  } catch (error) {
    next(error);
  }
};