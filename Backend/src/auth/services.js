/**
 * AUTH SERVICE
 * -------------
 * Lógica de autenticación.
 * No maneja HTTP.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { Database } = require('../database');
const { Config } = require('../config');
const { sendPasswordResetEmail } = require('./mailer');

const COLLECTION = 'users';
const JWT_SECRET = Config.jwt_secret;
const JWT_EXPIRES = '8h';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 10 * 60 * 1000;

/**
 * 🔎 Valida credenciales básicas
 */
const validateCredentialsInput = ({ email, password }) => {
  if (!email || !password) {
    throw new createError.BadRequest('Credenciales incompletas');
  }
};

/**
 * 🔎 Busca usuario por email
 */
const findUserByEmail = async (email) => {
  const collection = await Database(COLLECTION);
  return collection.findOne({ email });
};

/**
 * 🔎 Verifica si usuario está activo
 */
const validateUserStatus = (user) => {
  if (user.status === 'inactive') {
    throw new createError.Forbidden('Usuario inactivo');
  }
};

const isUserLocked = (user) => {
  if (!user.lockUntil) return false;
  return new Date(user.lockUntil).getTime() > Date.now();
};

const getRemainingLockMinutes = (user) => {
  if (!user.lockUntil) return 0;
  const diffMs = new Date(user.lockUntil).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000);
};

const registerFailedLoginAttempt = async (user) => {
  const collection = await Database(COLLECTION);
  const nextAttempts = Number(user.loginAttempts || 0) + 1;

  const updateData = {
    loginAttempts: nextAttempts,
    updatedAt: new Date()
  };

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    updateData.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    { $set: updateData }
  );

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    throw new createError.Forbidden('Cuenta bloqueada, intenta nuevamente en 10 minutos');
  }

  throw new createError.Unauthorized('Credenciales inválidas');
};

const clearLoginLockData = async (user) => {
  const collection = await Database(COLLECTION);

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    {
      $set: {
        loginAttempts: 0,
        updatedAt: new Date()
      },
      $unset: {
        lockUntil: ''
      }
    }
  );
};

const ensureStrongPassword = (password) => {
  if (!password) {
    throw new createError.BadRequest('La nueva contraseña es obligatoria');
  }

  if (typeof password !== 'string' || password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new createError.BadRequest(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
};

/**
 * 🔐 Genera token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES
  });
};

const forgotPassword = async ({ email }) => {
  if (!email) {
    throw new createError.BadRequest('El correo es obligatorio');
  }

  const collection = await Database(COLLECTION);
  const user = await collection.findOne({ email });

  if (!user) {
    return { ok: true };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    {
      $set: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    }
  );

  const resetBaseUrl = process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password';
  const resetUrl = `${resetBaseUrl}?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: email,
    resetUrl
  });

  return { ok: true };
};

const resetPassword = async ({ token, newPassword }) => {
  if (!token) {
    throw new createError.BadRequest('El token de recuperación es obligatorio');
  }

  ensureStrongPassword(newPassword);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const collection = await Database(COLLECTION);

  const user = await collection.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new createError.BadRequest('El token es inválido o expiró. Solicita una nueva recuperación');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await collection.updateOne(
    { _id: new ObjectId(user._id) },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date()
      },
      $unset: {
        resetPasswordTokenHash: '',
        resetPasswordExpiresAt: ''
      }
    }
  );

  return { updated: true };
};

/**
 * 🚀 LOGIN PRINCIPAL
 */
const login = async (credentials) => {
  validateCredentialsInput(credentials);

  const user = await findUserByEmail(credentials.email);

  if (!user) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  validateUserStatus(user);

  if (isUserLocked(user)) {
    const minutes = getRemainingLockMinutes(user);
    throw new createError.Forbidden(`Cuenta bloqueada, intenta nuevamente en ${minutes} minutos`);
  }

  const isValidPassword = await bcrypt.compare(credentials.password, user.password);

  if (!isValidPassword) {
    await registerFailedLoginAttempt(user);
  }

  if ((user.loginAttempts || 0) > 0 || user.lockUntil) {
    await clearLoginLockData(user);
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

module.exports.AuthService = {
  login,
  forgotPassword,
  resetPassword
};
