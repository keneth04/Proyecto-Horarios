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

// 🔑 Clave secreta del JWT (debe venir de .env)
const JWT_SECRET = Config.jwt_secret;
const JWT_EXPIRES = '8h';

/**
 * LOGIN
 */
const login = async ({ email, password }) => {

  // 1️⃣ Validar datos
  if (!email || !password) {
    throw new createError.BadRequest('Credenciales incompletas');
  }

  const collection = await Database(COLLECTION);

  // 2️⃣ Buscar usuario
  const user = await collection.findOne({ email });

  if (!user) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  // 3️⃣ Validar si está inactivo
  if (user.status === 'inactive') {
    throw new createError.Forbidden('Usuario inactivo');
  }

  // 4️⃣ Validar contraseña
  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw new createError.Unauthorized('Credenciales inválidas');
  }

  // 5️⃣ Crear payload del token
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email
  };

  // 6️⃣ Generar token
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES
  });

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
