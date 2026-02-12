const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';
const USERS_COLLECTION = 'users';

/* 🔹 ADMIN - traer todos */
const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).sort({ date: -1 }).toArray();
};

/* 🔹 ADMIN - traer por ID */
const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID de horario inválido');
  }

  const horario = await collection.findOne({ _id: new ObjectId(id) });

  if (!horario) {
    throw new createError.NotFound('Horario no encontrado');
  }

  return horario;
};

/* 🔹 ADMIN / AGENTE - traer por userId */
const getByUserId = async (userId) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(userId)) {
    throw new createError.BadRequest('ID de usuario inválido');
  }

  const horarios = await collection
    .find({ userId: new ObjectId(userId) })
    .sort({ date: -1 })
    .toArray();

  return horarios;
};

/* 🔹 ADMIN - crear */
const create = async (horario) => {
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  const { userId, date, blocks, createdBy } = horario;

  if (!userId || !date || !blocks) {
    throw new createError.BadRequest('Datos incompletos');
  }

  if (!ObjectId.isValid(userId) || !ObjectId.isValid(createdBy)) {
    throw new createError.BadRequest('ID inválido');
  }

  // 🔥 Validar que el usuario exista
  const userExists = await usersCollection.findOne({
    _id: new ObjectId(userId)
  });

  if (!userExists) {
    throw new createError.NotFound('El usuario no existe');
  }

  const newHorario = {
    userId: new ObjectId(userId),
    date: new Date(date),
    blocks,
    createdBy: new ObjectId(createdBy),
    createdAt: new Date(),
    status: horario.status || 'borrador'
  };

  const result = await collection.insertOne(newHorario);

  return result.insertedId;
};

/* 🔹 ADMIN - actualizar */
const update = async (id, body) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID de horario inválido');
  }

  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const existingHorario = await collection.findOne({
    _id: new ObjectId(id)
  });

  if (!existingHorario) {
    throw new createError.NotFound('Horario no encontrado');
  }

  // 🔥 Solo actualiza lo que venga
  const updateData = { ...body };

  if (body.date) {
    updateData.date = new Date(body.date);
  }

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return { updated: true };
};

/* 🔹 ADMIN - eliminar */
const remove = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID de horario inválido');
  }

  const result = await collection.deleteOne({
    _id: new ObjectId(id)
  });

  if (result.deletedCount === 0) {
    throw new createError.NotFound('Horario no encontrado');
  }

  return { deleted: true };
};

module.exports.HorariosService = {
  getAll,
  getById,
  getByUserId,
  create,
  update,
  remove
};
