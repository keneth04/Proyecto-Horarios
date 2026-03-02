/**
 * AUTH SERVICE
 * -------------
 * Lógica de autenticación.
 * No maneja HTTP.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Database } = require('../database');
const { Config } = require('../config');

const COLLECTION = 'users';
const JWT_SECRET = Config.jwt_secret;
const JWT_EXPIRES = '8h';

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
  const user = await collection.findOne({ email });

  if (!user) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  return user;
};

/**
 * 🔎 Verifica si usuario está activo
 */
const validateUserStatus = (user) => {
  if (user.status === 'inactive') {
    throw new createError.Forbidden('Usuario inactivo');
  }
};

/**
 * 🔎 Verifica contraseña
 */
const validatePassword = async (password, hashedPassword) => {
  const isValid = await bcrypt.compare(password, hashedPassword);

  if (!isValid) {
    throw new createError.Unauthorized('Credenciales inválidas');
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

/**
 * 🚀 LOGIN PRINCIPAL
 */
const login = async (credentials) => {

  validateCredentialsInput(credentials);

  const user = await findUserByEmail(credentials.email);

  validateUserStatus(user);

  await validatePassword(credentials.password, user.password);

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
  login
};