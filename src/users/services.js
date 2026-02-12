const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'users';
const SALT_ROUNDS = 10;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}, { projection: { password: 0 } }).toArray();
};

const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  const user = await collection.findOne(
    { _id: new ObjectId(id) },
    { projection: { password: 0 } }
  );

  if (!user) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return user;
};

const getByEmail = async (email) => {
  const collection = await Database(COLLECTION);
  return collection.findOne({ email });
};

const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, email, password, role: bodyRole } = body;

  if (!name || !email || !password) {
    throw new createError.BadRequest('Datos incompletos');
  }

  if (!emailRegex.test(email)) {
    throw new createError.BadRequest('Email inválido');
  }

  const userExists = await getByEmail(email);
  if (userExists) {
    throw new createError.Conflict('El usuario ya existe');
  }

  const totalUsers = await collection.countDocuments();

  let finalRole = bodyRole || 'agente';

  if (totalUsers === 0) {
    finalRole = 'admin';
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = {
    name,
    email,
    password: hashedPassword,
    role: finalRole,
    status: 'active',
    createdAt: new Date()
  };

  const result = await collection.insertOne(newUser);

  return result.insertedId;
};

module.exports.UsersService = {
  getAll,
  getById,
  getByEmail,
  create
};
