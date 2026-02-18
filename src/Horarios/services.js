const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';
const USERS_COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';

/* 🔒 CONSTANTES DE NEGOCIO */
const DAY_START = 8 * 60;   // 08:00
const DAY_END = 21 * 60;    // 21:00
const MIN_BLOCK_DURATION = 30; // minutos
const WEEKLY_REQUIRED_HOURS = 42;
const WEEKLY_REQUIRED_MINUTES = WEEKLY_REQUIRED_HOURS * 60;

/* 🔒 HELPERS */

// HH:mm estricto
const isValidTimeFormat = (time) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Lunes → Domingo
// Semana SÁBADO → VIERNES
const getWeekRange = (dateString) => {

  const d = new Date(dateString + 'T00:00:00.000Z');
  const day = d.getUTCDay(); // 👈 usar UTC

  const diffToSaturday = (day === 6)
    ? 0
    : day + 1;

  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - diffToSaturday);
  weekStart.setUTCHours(0,0,0,0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23,59,59,999);

  return { weekStart, weekEnd };
};


const validateBlocksStructure = (blocks) => {

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new createError.BadRequest('Debe existir al menos un bloque');
  }

  const processed = blocks.map(b => {

    if (!b.start || !b.end || !b.skillId) {
      throw new createError.BadRequest('Bloque inválido: datos incompletos');
    }

    if (!isValidTimeFormat(b.start) || !isValidTimeFormat(b.end)) {
      throw new createError.BadRequest(
        `Formato inválido en bloque ${b.start} - ${b.end}`
      );
    }

    const startMin = timeToMinutes(b.start);
    const endMin = timeToMinutes(b.end);

    if (startMin >= endMin) {
      throw new createError.BadRequest(
        `La hora inicio debe ser menor que fin (${b.start}-${b.end})`
      );
    }

    if (endMin - startMin < MIN_BLOCK_DURATION) {
      throw new createError.BadRequest(
        `Bloque mínimo ${MIN_BLOCK_DURATION} minutos`
      );
    }

    if (startMin < DAY_START || endMin > DAY_END) {
      throw new createError.BadRequest(
        `Bloques deben estar entre 08:00 y 21:00`
      );
    }

    return { ...b, startMin, endMin };
  });

  processed.sort((a,b) => a.startMin - b.startMin);

  for (let i=1;i<processed.length;i++){
    if (processed[i].startMin < processed[i-1].endMin) {
      throw new createError.BadRequest(
        `Solapamiento entre ${processed[i-1].start} y ${processed[i].start}`
      );
    }
  }

  return processed.map(({startMin,endMin,...rest})=>rest);
};

/* 🔹 ADMIN - traer todos */
const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).sort({ date: -1 }).toArray();
};

/* 🔹 ADMIN - traer por ID */
const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id))
    throw new createError.BadRequest('ID de horario inválido');

  const horario = await collection.findOne({ _id: new ObjectId(id) });

  if (!horario)
    throw new createError.NotFound('Horario no encontrado');

  return horario;
};

/* 🔹 ADMIN / AGENTE */
const getByUserId = async (userId) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(userId))
    throw new createError.BadRequest('ID de usuario inválido');

  return collection
    .find({ userId: new ObjectId(userId) })
    .sort({ date: -1 })
    .toArray();
};

/* 🔹 AGENTE - SOLO publicados */
const getPublishedByUserId = async (userId) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  if (!ObjectId.isValid(userId))
    throw new createError.BadRequest('ID de usuario inválido');

  const horarios = await collection
    .find({ userId: new ObjectId(userId), status: 'publicado' })
    .sort({ date: -1 })
    .toArray();

  if (!horarios.length) return [];

  const skillIds = [
    ...new Set(
      horarios.flatMap(h => h.blocks.map(b => b.skillId.toString()))
    )
  ].map(id => new ObjectId(id));

  const skills = await skillsCollection
    .find({ _id: { $in: skillIds } })
    .toArray();

  const skillsMap = {};
  skills.forEach(s => {
    skillsMap[s._id.toString()] = s;
  });

  return horarios.map(h => ({
    ...h,
    blocks: h.blocks.map(b => ({
      start: b.start,
      end: b.end,
      skill: skillsMap[b.skillId.toString()] || null
    }))
  }));
};

/* 🔹 ADMIN - crear */
const create = async (horario) => {

  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const { userId, date, blocks, createdBy } = horario;

  if (!userId || !date || !blocks)
    throw new createError.BadRequest('Datos incompletos');

  if (!ObjectId.isValid(userId) || !ObjectId.isValid(createdBy))
    throw new createError.BadRequest('ID inválido');

  const scheduleDate = new Date(date);

  // 🔥 Unicidad por día
  const startOfDay = new Date(scheduleDate);
  startOfDay.setHours(0,0,0,0);

  const endOfDay = new Date(scheduleDate);
  endOfDay.setHours(23,59,59,999);

  const exists = await collection.findOne({
    userId: new ObjectId(userId),
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (exists)
    throw new createError.Conflict(
      'Ya existe un horario para ese usuario en esa fecha'
    );

  const user = await usersCollection.findOne({
    _id: new ObjectId(userId),
    status: 'active'
  });

  if (!user)
    throw new createError.NotFound('Usuario no existe o inactivo');

  const validatedBlocks = validateBlocksStructure(blocks);

  const allowed = (user.allowedSkills || []).map(id=>id.toString());

  for (const block of validatedBlocks) {

    if (!ObjectId.isValid(block.skillId))
      throw new createError.BadRequest('SkillId inválido');

    const skill = await skillsCollection.findOne({
      _id: new ObjectId(block.skillId),
      status: 'active'
    });

    if (!skill)
      throw new createError.BadRequest('Skill no existe');

    if (skill.type !== 'break' &&
        !allowed.includes(skill._id.toString())) {
      throw new createError.BadRequest(
        'Skill no permitida para el agente'
      );
    }

    block.skillId = new ObjectId(block.skillId);
  }

  const result = await collection.insertOne({
    userId: new ObjectId(userId),
    date: scheduleDate,
    blocks: validatedBlocks,
    createdBy: new ObjectId(createdBy),
    createdAt: new Date(),
    status: 'borrador'
  });

  return result.insertedId;
};

/* 🔹 ADMIN - actualizar (BLINDADO) */
/* 🔹 ADMIN - actualizar (ULTRA BLINDADO) */
const update = async (id, body) => {

  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  if (!ObjectId.isValid(id))
    throw new createError.BadRequest('ID inválido');

  const existing = await collection.findOne({
    _id: new ObjectId(id)
  });

  if (!existing)
    throw new createError.NotFound('Horario no encontrado');

  if (existing.status === 'archivado')
    throw new createError.BadRequest('No editable');

  if (body.userId || body.createdBy || body.status)
    throw new createError.BadRequest(
      'No se permite modificar userId, createdBy o status'
    );

  const updateData = {};

  if (body.date)
    updateData.date = new Date(body.date + 'T00:00:00.000Z');

  if (body.blocks) {

    const validatedBlocks = validateBlocksStructure(body.blocks);

    // 🔥 Validar que las skills existan y estén activas
    for (const block of validatedBlocks) {

      if (!ObjectId.isValid(block.skillId))
        throw new createError.BadRequest('SkillId inválido');

      const skill = await skillsCollection.findOne({
        _id: new ObjectId(block.skillId),
        status: 'active'
      });

      if (!skill)
        throw new createError.BadRequest('Skill no existe o está inactiva');

      block.skillId = new ObjectId(block.skillId);
    }

    // 🔥 SI YA ESTÁ PUBLICADO → VALIDAR REGLAS SEMANALES
    if (existing.status === 'publicado') {

      const targetDate = updateData.date || existing.date;
      const { weekStart, weekEnd } = getWeekRange(
        targetDate.toISOString().split('T')[0]
      );

      const weeklyPublished = await collection.find({
        userId: existing.userId,
        status: 'publicado',
        date: { $gte: weekStart, $lte: weekEnd }
      }).toArray();

      let totalMinutes = 0;

      for (const schedule of weeklyPublished) {

        const blocksToUse =
          schedule._id.toString() === id
            ? validatedBlocks
            : schedule.blocks;

        for (const b of blocksToUse) {

          const skill = await skillsCollection.findOne({
            _id: new ObjectId(b.skillId)
          });

          if (skill && skill.type !== 'break') {
            totalMinutes +=
              timeToMinutes(b.end) -
              timeToMinutes(b.start);
          }
        }
      }

      if (totalMinutes !== WEEKLY_REQUIRED_MINUTES) {
        throw new createError.BadRequest(
          `No se puede modificar. La semana publicada debe mantener exactamente ${WEEKLY_REQUIRED_HOURS} horas operativas`
        );
      }
    }

    updateData.blocks = validatedBlocks;
  }

  updateData.updatedAt = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  return { updated: true };
};

/* 🔹 ADMIN - publicar semana completa (TODOS LOS AGENTES) */
const publishByDate = async (date) => {

  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  if (!date)
    throw new createError.BadRequest('Fecha obligatoria');

  const { weekStart, weekEnd } = getWeekRange(date);

  // 🔎 Traer todos los borradores de la semana (SÁBADO → VIERNES)
  const weeklyDrafts = await collection.find({
    status: 'borrador',
    date: { $gte: weekStart, $lte: weekEnd }
  }).toArray();

  if (!weeklyDrafts.length)
    throw new createError.BadRequest(
      'No existen horarios en borrador para esa semana'
    );

  // 🔥 Agrupar por usuario
  const groupedByUser = {};

  for (const schedule of weeklyDrafts) {
    const uid = schedule.userId.toString();
    if (!groupedByUser[uid]) groupedByUser[uid] = [];
    groupedByUser[uid].push(schedule);
  }

  // 🔥 Obtener todas las skills involucradas
  const skillIds = [
    ...new Set(
      weeklyDrafts.flatMap(h =>
        h.blocks.map(b => b.skillId.toString())
      )
    )
  ].map(id => new ObjectId(id));

  const skills = await skillsCollection
    .find({ _id: { $in: skillIds } })
    .toArray();

  const skillsMap = {};
  skills.forEach(s => {
    skillsMap[s._id.toString()] = s;
  });

  // 🔎 VALIDAR CADA USUARIO
  for (const userId in groupedByUser) {

    let totalMinutes = 0;
    const schedules = groupedByUser[userId];

    // 🛡 Blindaje: evitar doble documento mismo día
    const uniqueDays = new Set();

    for (const h of schedules) {

      const dayKey = new Date(h.date).toISOString().split('T')[0];

      if (uniqueDays.has(dayKey)) {
        throw new createError.BadRequest(
          `El usuario ${userId} tiene múltiples horarios el día ${dayKey}`
        );
      }

      uniqueDays.add(dayKey);

      for (const b of h.blocks) {
        const skill = skillsMap[b.skillId.toString()];
        if (skill && skill.type !== 'break') {
          totalMinutes +=
            timeToMinutes(b.end) -
            timeToMinutes(b.start);
        }
      }
    }

    if (totalMinutes !== WEEKLY_REQUIRED_MINUTES) {

      const user = await usersCollection.findOne({
        _id: new ObjectId(userId)
      });

      throw new createError.BadRequest(
        `El usuario ${user?.name || userId} tiene ${totalMinutes / 60} horas. Debe tener exactamente ${WEEKLY_REQUIRED_HOURS} horas operativas`
      );
    }
  }

  // ✅ SI TODOS CUMPLEN → PUBLICAR

  // Archivar todos los publicados actuales
  await collection.updateMany(
    { status: 'publicado' },
    {
      $set: {
        status: 'archivado',
        archivedAt: new Date()
      }
    }
  );

  // Publicar todos los borradores de la semana
  const result = await collection.updateMany(
    {
      status: 'borrador',
      date: { $gte: weekStart, $lte: weekEnd }
    },
    {
      $set: {
        status: 'publicado',
        publishedAt: new Date()
      }
    }
  );

  return {
    week: { from: weekStart, to: weekEnd },
    totalUsersValidated: Object.keys(groupedByUser).length,
    totalDocumentsPublished: result.modifiedCount
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
