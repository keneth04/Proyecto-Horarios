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

const updateUser = async (id, body) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  if (body.email && !emailRegex.test(body.email)) {
    throw new createError.BadRequest('Email inválido');
  }

  if (body.password) {
    body.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: body }
  );

  if (result.matchedCount === 0) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return { modifiedCount: result.modifiedCount };
};

const deleteUser = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  const result = await collection.deleteOne({
    _id: new ObjectId(id)
  });

  if (result.deletedCount === 0) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return { deleted: true};
};

module.exports.UsersService = {
  getAll,
  getById,
  getByEmail,
  deleteUser,
  create,
  updateUser
};
