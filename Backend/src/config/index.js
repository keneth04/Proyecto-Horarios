require('dotenv').config(); //nos va a ayudar a consumir las variables del .env

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports.Config = {
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URI,
  mongoDbname: process.env.MONGO_DBNAME,
  jwt_secret: process.env.JWT_SECRET,
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