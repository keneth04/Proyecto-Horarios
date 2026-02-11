/**
 * AUTH SERVICE
 * -------------
 * Aquí va TODA la lógica de autenticación.
 * NO responde HTTP.
 * SOLO hace lógica de negocio.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const { Database } = require('../database');
const { Config } = require('../config');

const COLLECTION = 'users';
const SALT_ROUNDS = 10;

// 🔑 Clave secreta del JWT (debe venir de .env)
const JWT_SECRET = Config.jwt_secret;
const JWT_EXPIRES = '8h';

/**
 * LOGIN
 */
const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new createError.BadRequest('Credenciales incompletas');
  }

  const collection = await Database(COLLECTION);

  // 🔍 Buscar usuario
  const user = await collection.findOne({ email });
  if (!user) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  // 🔐 Comparar password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  // 🪙 Crear payload del token
  const payload = {
    id: user._id,
    rol: user.rol,
    email: user.email
  };

  // 🎟️ Generar token
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES
  });

  return {
    token,
    user: {
      id: user._id,
      nombres: user.nombres,
      email: user.email,
      rol: user.rol
    }
  };
};

module.exports.AuthService = {

  login
};
