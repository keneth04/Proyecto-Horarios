const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';
const USERS_COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';

/* 🔒 CONSTANTES DE NEGOCIO */
const DAY_START = 10 * 60; // 10:00
const DAY_END = 20 * 60;   // 20:00
const MIN_BLOCK_DURATION = 30; // 30 minutos

/* 🔒 HELPERS PRIVADOS */

// Validar formato HH:mm estricto
const isValidTimeFormat = (time) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

// Convertir HH:mm a minutos
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Validación estructural completa de bloques
const validateBlocksStructure = (blocks) => {

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new createError.BadRequest('Debe existir al menos un bloque');
  }

  const processedBlocks = blocks.map(block => {

    if (!block.start || !block.end) {
      throw new createError.BadRequest('Bloque inválido: start y end son obligatorios');
    }

    if (!isValidTimeFormat(block.start) || !isValidTimeFormat(block.end)) {
      throw new createError.BadRequest(
        `Formato de hora inválido en bloque ${block.start} - ${block.end}`
      );
    }

    const startMinutes = timeToMinutes(block.start);
    const endMinutes = timeToMinutes(block.end);

    if (startMinutes >= endMinutes) {
      throw new createError.BadRequest(
        `La hora de inicio debe ser menor que la de fin (${block.start} - ${block.end})`
      );
    }

    if (endMinutes - startMinutes < MIN_BLOCK_DURATION) {
      throw new createError.BadRequest(
        `El bloque ${block.start} - ${block.end} debe durar mínimo 30 minutos`
      );
    }

    if (startMinutes < DAY_START || endMinutes > DAY_END) {
      throw new createError.BadRequest(
        `Los bloques deben estar entre 10:00 y 20:00 (${block.start} - ${block.end})`
      );
    }

    return {
      ...block,
      startMinutes,
      endMinutes
    };
  });

  // Ordenar internamente por hora de inicio
  processedBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Validar solapamiento matemáticamente
  for (let i = 1; i < processedBlocks.length; i++) {
    const previous = processedBlocks[i - 1];
    const current = processedBlocks[i];

    if (current.startMinutes < previous.endMinutes) {
      throw new createError.BadRequest(
        `Existe solapamiento entre ${previous.start} - ${previous.end} y ${current.start} - ${current.end}`
      );
    }
  }

  // Limpiar propiedades internas antes de guardar
  return processedBlocks.map(({ startMinutes, endMinutes, ...block }) => block);
};

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
  const skillsCollection = await Database(SKILLS_COLLECTION);

  if (!ObjectId.isValid(userId)) {
    throw new createError.BadRequest('ID de usuario inválido');
  }

  const horarios = await collection
    .find({
      userId: new ObjectId(userId),
      status: 'publicado'
    })
    .sort({ date: -1 })
    .toArray();

  if (horarios.length === 0) return [];

  const skillIdsSet = new Set();

  horarios.forEach(horario => {
    (horario.blocks || []).forEach(block => {
      if (block.skillId) {
        skillIdsSet.add(block.skillId.toString());
      }
    });
  });

  const skillIds = Array.from(skillIdsSet).map(id => new ObjectId(id));

  const skills = await skillsCollection
    .find({ _id: { $in: skillIds } })
    .toArray();

  const skillsMap = {};
  skills.forEach(skill => {
    skillsMap[skill._id.toString()] = {
      _id: skill._id,
      name: skill.name,
      color: skill.color,
      descripcion: skill.descripcion
    };
  });

  const enrichedHorarios = horarios.map(horario => {
    const enrichedBlocks = (horario.blocks || []).map(block => ({
      start: block.start,
      end: block.end,
      skill: skillsMap[block.skillId.toString()] || null
    }));

    return {
      ...horario,
      blocks: enrichedBlocks
    };
  });

  return enrichedHorarios;
};

/* 🔹 ADMIN - crear */
const create = async (horario) => {
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

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

  // 🔥 VALIDACIÓN ESTRUCTURAL
  const validatedBlocks = validateBlocksStructure(blocks);

  const agentSkillIds = (userExists.allowedSkills || []).map(id =>
    id.toString()
  );

  for (const block of validatedBlocks) {

    if (!block.skillId || !ObjectId.isValid(block.skillId)) {
      throw new createError.BadRequest(`SkillId inválido en bloque`);
    }

    const skillObjectId = new ObjectId(block.skillId);

    const skillExists = await skillsCollection.findOne({
      _id: skillObjectId,
      status: 'active'
    });

    if (!skillExists) {
      throw new createError.BadRequest(
        `La skill con id ${block.skillId} no existe o está inactiva`
      );
    }

    if (
      skillExists.type !== 'break' &&
      !agentSkillIds.includes(skillObjectId.toString())
    ) {
      throw new createError.BadRequest(
        `El agente no tiene permitida la skill con id ${block.skillId}`
      );
    }

    block.skillId = skillObjectId;
  }

  const newHorario = {
    userId: new ObjectId(userId),
    date: new Date(date),
    blocks: validatedBlocks,
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

  if (body.blocks) {
    updateData.blocks = validateBlocksStructure(body.blocks);
  }

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

  const borradoresCount = await collection.countDocuments({
    status: 'borrador',
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (borradoresCount === 0) {
    throw new createError.NotFound(
      'No existen horarios en borrador para la fecha indicada'
    );
  }

  await collection.updateMany(
    { status: 'publicado' },
    { $set: { status: 'archivado', archivedAt: new Date() } }
  );

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
