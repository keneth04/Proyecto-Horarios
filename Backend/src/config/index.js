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

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM
});

const Config = {
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

const validateCriticalConfig = () => {
  const missing = [];

  if (!isNonEmptyString(Config.port)) {
    missing.push('PORT');
  }

  if (!isNonEmptyString(Config.mongoUri)) {
    missing.push('MONGO_URI');
  }

  if (!isNonEmptyString(Config.mongoDbname)) {
    missing.push('MONGO_DBNAME');
  }

  if (!isNonEmptyString(Config.jwt_secret)) {
    missing.push('JWT_SECRET');
  }

  const smtpConfig = getSmtpConfig();
  const smtpFields = ['host', 'port', 'user', 'pass', 'from'];
  const smtpProvidedFields = smtpFields.filter((field) => isNonEmptyString(smtpConfig[field]));

  if (smtpProvidedFields.length > 0 && smtpProvidedFields.length < smtpFields.length) {
    const missingSmtpFields = smtpFields
      .filter((field) => !isNonEmptyString(smtpConfig[field]))
      .map((field) => `SMTP_${field.toUpperCase()}`);

    missing.push(...missingSmtpFields);
  }

  if (missing.length > 0) {
    throw new Error(
      `Configuración inválida. Faltan variables críticas: ${missing.join(', ')}`
    );
  }
};

module.exports.Config = Config;
module.exports.validateCriticalConfig = validateCriticalConfig;