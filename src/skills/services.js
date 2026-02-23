const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'skills';

/* 🔹 Obtener todas */
const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).sort({ createdAt: -1 }).toArray();
};

/* 🔹 Obtener por ID */
const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  const skill = await collection.findOne({ _id: new ObjectId(id) });

  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

  return skill;
};

/* 🔥 Crear skill blindada */
const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, color, descripcion } = body;

  if (!name || !color) {
    throw new createError.BadRequest('Datos incompletos');
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new createError.BadRequest('El nombre no puede estar vacío');
  }

  if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    throw new createError.BadRequest(
      'Color inválido, debe ser formato HEX (#FFFFFF)'
    );
  }

  const existingSkill = await collection.findOne({
    name: { $regex: `^${normalizedName}$`, $options: 'i' }
  });

  if (existingSkill) {
    throw new createError.Conflict('Ya existe una skill con ese nombre');
  }

  const upperName = normalizedName.toUpperCase();

  let type = 'operative';

  if (upperName === 'BREAK') {
    type = 'break';
  }

  if (upperName === 'REST' || upperName === 'DESCANSO') {
    type = 'rest';
  }

  // 🔒 Solo puede existir 1 BREAK activa
  if (type === 'break') {
    const existingBreak = await collection.findOne({
      type: 'break',
      status: 'active'
    });

    if (existingBreak) {
      throw new createError.Conflict(
        'Ya existe una skill BREAK activa'
      );
    }
  }

  // 🔒 Solo puede existir 1 REST activa
  if (type === 'rest') {
    const existingRest = await collection.findOne({
      type: 'rest',
      status: 'active'
    });

    if (existingRest) {
      throw new createError.Conflict(
        'Ya existe una skill REST activa'
      );
    }
  }

  const newSkill = {
    name: normalizedName,
    color,
    descripcion: descripcion || '',
    type,
    status: 'active',
    createdAt: new Date()
  };

  const result = await collection.insertOne(newSkill);

  return result.insertedId;
};


/* 🔥 Actualizar skill blindada */
/* 🔥 Actualizar skill blindada */
const updateSkill = async (id, body) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  const skill = await collection.findOne({
    _id: new ObjectId(id)
  });

  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

  // ❌ No permitir modificar type jamás
  if (body.type) {
    throw new createError.BadRequest(
      'No se puede modificar el tipo de skill'
    );
  }

  // ❌ Si es BREAK o REST no permitir cambiar nombre
  if ((skill.type === 'break' || skill.type === 'rest') && body.name) {
    throw new createError.BadRequest(
      'No se puede modificar el nombre de una skill BREAK o REST'
    );
  }

  const updateData = {};

  if (body.name) {
    const newName = body.name.trim();

    if (!newName) {
      throw new createError.BadRequest(
        'El nombre no puede estar vacío'
      );
    }

    const duplicate = await collection.findOne({
      name: { $regex: `^${newName}$`, $options: 'i' },
      _id: { $ne: new ObjectId(id) }
    });

    if (duplicate) {
      throw new createError.Conflict(
        'Ya existe una skill con ese nombre'
      );
    }

    updateData.name = newName;
  }

  if (body.color) {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(body.color)) {
      throw new createError.BadRequest(
        'Color inválido, debe ser formato HEX (#FFFFFF)'
      );
    }
    updateData.color = body.color;
  }

  if (body.descripcion !== undefined) {
    updateData.descripcion = body.descripcion;
  }

  updateData.updatedAt = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return { updated: true };
};


/* 🔹 Cambiar estado */
const changeStatus = async (id, status) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  if (!['active', 'inactive'].includes(status)) {
    throw new createError.BadRequest('Estado inválido');
  }

  const skill = await collection.findOne({ _id: new ObjectId(id) });

  if (!skill) {
    throw new createError.NotFound('Skill no encontrada');
  }

 // 🔒 No permitir desactivar BREAK ni REST
if (
  (skill.type === 'break' || skill.type === 'rest') &&
  status === 'inactive'
) {
  throw new createError.BadRequest(
    'No se puede desactivar una skill BREAK o REST'
  );
}

  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  );

  return { status };
};

module.exports.SkillsService = {
  getAll,
  getById,
  create,
  updateSkill,
  changeStatus
};
