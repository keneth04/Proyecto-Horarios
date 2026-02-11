const { ObjectId } = require('mongodb');
const { Database } = require('../database');

const COLLECTION = 'horarios';

const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).toArray();
};

const getById = async (id) => {
  const collection = await Database(COLLECTION);
  return collection.findOne({ _id: new ObjectId(id) });
};

const create = async (horario) => {
  const collection = await Database(COLLECTION);

  horario.createdAt = new Date();
  horario.status = horario.status || 'borrador';

  const result = await collection.insertOne(horario);
  return result.insertedId;
};

const update = async (id, body) => {
  const collection = await Database(COLLECTION);
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: body }
  );
};

const remove = async (id) => {
  const collection = await Database(COLLECTION);
  return collection.deleteOne({ _id: new ObjectId(id) });
};

module.exports.HorariosService = {
  getAll,
  getById,
  create,
  update,
  remove
};
