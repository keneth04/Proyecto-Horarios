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

/* 🔹 ADMIN / AGENTE */
const getByUserId = async (userId) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(userId)) {
    throw new createError.BadRequest('ID de usuario inválido');
  }

  return collection
    .find({ userId: new ObjectId(userId) })
    .sort({ date: -1 })
    .toArray();
};

/* 🔹 AGENTE - SOLO publicados */
const getPublishedByUserId = async (userId) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(userId)) {
    throw new createError.BadRequest('ID de usuario inválido');
  }

  return collection
    .find({
      userId: new ObjectId(userId),
      status: 'publicado'
    })
    .sort({ date: -1 })
    .toArray();
};

/* 🔹 ADMIN - crear (SIEMPRE borrador) */
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

  const userExists = await usersCollection.findOne({
    _id: new ObjectId(userId),
    status: 'active'
  });

  if (!userExists) {
    throw new createError.NotFound('El usuario no existe o está inactivo');
  }

  const newHorario = {
    userId: new ObjectId(userId),
    date: new Date(date),
    blocks,
    createdBy: new ObjectId(createdBy),
    createdAt: new Date(),
    status: 'borrador'
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

  const existingHorario = await collection.findOne({
    _id: new ObjectId(id)
  });

  if (!existingHorario) {
    throw new createError.NotFound('Horario no encontrado');
  }

  if (existingHorario.status === 'archivado') {
    throw new createError.BadRequest('No se puede editar un horario archivado');
  }

  const updateData = { ...body };

  if (body.date) {
    updateData.date = new Date(body.date);
  }

  updateData.updatedAt = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return { updated: true };
};

/* 🔹 ADMIN - publicar por fecha */
const publishByDate = async (date) => {
  const collection = await Database(COLLECTION);

  if (!date) {
    throw new createError.BadRequest('La fecha es obligatoria');
  }

  const publishDate = new Date(date);

  const startOfDay = new Date(publishDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(publishDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 🔎 1️⃣ Validar que existan borradores para esa fecha
  const borradoresCount = await collection.countDocuments({
    status: 'borrador',
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (borradoresCount === 0) {
    throw new createError.NotFound(
      'No existen horarios en borrador para la fecha indicada'
    );
  }

  // 📦 2️⃣ Archivar los actualmente publicados
  await collection.updateMany(
    { status: 'publicado' },
    { $set: { status: 'archivado', archivedAt: new Date() } }
  );

  // 🚀 3️⃣ Publicar borradores de la fecha
  const result = await collection.updateMany(
    {
      status: 'borrador',
      date: { $gte: startOfDay, $lte: endOfDay }
    },
    {
      $set: {
        status: 'publicado',
        publishedAt: new Date()
      }
    }
  );

  return {
    publishedCount: result.modifiedCount
  };
};

module.exports.HorariosService = {
  getAll,
  getById,
  getByUserId,
  getPublishedByUserId,
  create,
  update,
  publishByDate
};
