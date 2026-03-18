require('dotenv').config(); //nos va a ayudar a consumir las variables del .env

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toOrigins = (value, fallback) => {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

module.exports.Config = {
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URI,
  mongoDbname: process.env.MONGO_DBNAME,
  jwt_secret: process.env.JWT_SECRET,
  http: {
    jsonLimit: process.env.HTTP_JSON_LIMIT || '100kb',
    corsAllowedOrigins: toOrigins(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:5173'])
  },
  rateLimit: {
    auth: {
      windowMs: toPositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
      max: toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 8)
    },
    reports: {
      windowMs: toPositiveInt(process.env.RATE_LIMIT_REPORTS_WINDOW_MS, 60 * 1000),
      max: toPositiveInt(process.env.RATE_LIMIT_REPORTS_MAX, 30)
    }
  }
};