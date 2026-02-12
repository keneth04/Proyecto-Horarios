const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';

// 🔹 ADMIN - traer todos
const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).sort({ date: -1 }).toArray();
};

// 🔹 ADMIN - traer por _id
const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  return collection.findOne({ _id: new ObjectId(id) });
};

// 🔹 ADMIN / AGENTE - traer por userId
const getByUserId = async (userId) => {
  const collection = await Database(COLLECTION);

  // 🔥 Normalizar id (viene del token como objeto/string)
  const normalizedId = userId.toString();

  if (!ObjectId.isValid(normalizedId)) {
    throw new createError.BadRequest('ID de usuario inválido');
  }

  const horarios = await collection
    .find({ userId: new ObjectId(normalizedId) })
    .sort({ date: -1 })
    .toArray();

  return horarios;
};

// 🔹 ADMIN - crear
const create = async (horario) => {
  const collection = await Database(COLLECTION);

  const { userId, date, blocks, createdBy } = horario;

  if (!userId || !date || !blocks) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const normalizedUserId = userId.toString();
  const normalizedCreatedBy = createdBy.toString();

  if (!ObjectId.isValid(normalizedUserId) || !ObjectId.isValid(normalizedCreatedBy)) {
    throw new createError.BadRequest('ID inválido');
  }

  const newHorario = {
    userId: new ObjectId(normalizedUserId),
    date: new Date(date),
    blocks,
    createdBy: new ObjectId(normalizedCreatedBy),
    createdAt: new Date(),
    status: horario.status || 'borrador'
  };

  const result = await collection.insertOne(newHorario);

  return result.insertedId;
};

// 🔹 ADMIN - actualizar
const update = async (id, body) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: body }
  );
};

// 🔹 ADMIN - eliminar
const remove = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  return collection.deleteOne({ _id: new ObjectId(id) });
};

module.exports.HorariosService = {
  getAll,
  getById,
  getByUserId,
  create,
  update,
  remove
};
