const createError = require('http-errors');
const helmet = require('helmet');
const cors = require('cors');

const isValidOrigin = (origin, allowedOrigins) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

module.exports.SecurityMiddlewares = ({ allowedOrigins, jsonLimit }) => {
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (isValidOrigin(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(createError.Forbidden('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400
  });

  return {
    helmet: helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    }),
    cors: corsMiddleware,
    jsonParser: require('express').json({ limit: jsonLimit })
  };
};