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

  const normalizeDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
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
    throw new createError.BadRequest(
      'El identificador del horario no es válido'
);

  const scheduleDate = new Date(date);

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

  let hasRest = false;
  let consecutiveWorkMinutes = 0;

  for (let i = 0; i < validatedBlocks.length; i++) {

    const block = validatedBlocks[i];

    if (!ObjectId.isValid(block.skillId))
      throw new createError.BadRequest('SkillId inválido');

    const skill = await skillsCollection.findOne({
      _id: new ObjectId(block.skillId),
      status: 'active'
    });

    if (!skill)
      throw new createError.BadRequest('Skill no existe');

    const duration =
      timeToMinutes(block.end) -
      timeToMinutes(block.start);

    // 🔥 VALIDACIÓN REST
    if (skill.type === 'rest') {

      if (hasRest)
        throw new createError.BadRequest(
          'Solo puede existir un bloque de descanso por día'
        );

      if (validatedBlocks.length !== 1)
        throw new createError.BadRequest(
          'El descanso no puede mezclarse con otros bloques'
        );

      if (block.start !== '08:00' || block.end !== '21:00')
        throw new createError.BadRequest(
          'El descanso debe cubrir la jornada completa (08:00 - 21:00)'
        );

      hasRest = true;
      consecutiveWorkMinutes = 0;
    }

    // 🔥 VALIDACIÓN 4H CONSECUTIVAS
    if (skill.type === 'operative') {

      if (!allowed.includes(skill._id.toString()))
        throw new createError.BadRequest(
          'Skill no permitida para el agente'
        );

      consecutiveWorkMinutes += duration;

      if (consecutiveWorkMinutes > 240)
        throw new createError.BadRequest(
          'No se puede trabajar más de 4 horas consecutivas sin break'
        );

    }

    if (skill.type === 'break') {
      consecutiveWorkMinutes = 0;
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

    let hasRest = false;
    let consecutiveWorkMinutes = 0;

    for (let i = 0; i < validatedBlocks.length; i++) {

      const block = validatedBlocks[i];

      if (!ObjectId.isValid(block.skillId))
        throw new createError.BadRequest('SkillId inválido');

      const skill = await skillsCollection.findOne({
        _id: new ObjectId(block.skillId),
        status: 'active'
      });

      if (!skill)
        throw new createError.BadRequest('Skill no existe o está inactiva');

      const duration =
        timeToMinutes(block.end) -
        timeToMinutes(block.start);

      if (skill.type === 'rest') {

        if (hasRest)
          throw new createError.BadRequest(
            'Solo puede existir un bloque de descanso por día'
          );

        if (validatedBlocks.length !== 1)
          throw new createError.BadRequest(
            'El descanso no puede mezclarse con otros bloques'
          );

        if (block.start !== '08:00' || block.end !== '21:00')
          throw new createError.BadRequest(
            'El descanso debe cubrir la jornada completa (08:00 - 21:00)'
          );

        hasRest = true;
        consecutiveWorkMinutes = 0;
      }

      if (skill.type === 'operative') {

        consecutiveWorkMinutes += duration;

        if (consecutiveWorkMinutes > 240)
          throw new createError.BadRequest(
            'No se puede trabajar más de 4 horas consecutivas sin break'
          );

      }

      if (skill.type === 'break') {
        consecutiveWorkMinutes = 0;
      }

      block.skillId = new ObjectId(block.skillId);
    }

    // 🔥 VALIDACIÓN 42H SI ESTÁ PUBLICADO
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

          if (skill &&
              skill.type !== 'break' &&
              skill.type !== 'rest') {
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

  const weeklyDrafts = await collection.find({
    status: 'borrador',
    date: { $gte: weekStart, $lte: weekEnd }
  }).toArray();

  if (!weeklyDrafts.length)
    throw new createError.BadRequest(
      'No existen horarios en borrador para esa semana'
    );

  // 🔹 Agrupar por agente
  const groupedByUser = {};

  for (const schedule of weeklyDrafts) {
    const uid = schedule.userId.toString();
    if (!groupedByUser[uid]) groupedByUser[uid] = [];
    groupedByUser[uid].push(schedule);
  }

  // 🔹 Cargar todas las skills una sola vez
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

  // 🔥 VALIDACIONES POR AGENTE
  for (const userId in groupedByUser) {

    const user = await usersCollection.findOne({
      _id: new ObjectId(userId)
    });

    const userName = user?.name || 'Usuario desconocido';
    const schedules = groupedByUser[userId];

    // 🔒 Deben existir exactamente 7 días
    if (schedules.length !== 7)
      throw new createError.BadRequest(
        `El usuario ${userName} debe tener exactamente 7 días en borrador`
      );

    let totalMinutes = 0;
    let restDayDate = null;
    const uniqueDays = new Set();

    for (const h of schedules) {

      const dayKey = new Date(h.date).toISOString().split('T')[0];

      if (uniqueDays.has(dayKey)) {
        throw new createError.BadRequest(
          `El usuario ${userName} tiene múltiples horarios el día ${dayKey}`
        );
      }

      uniqueDays.add(dayKey);

      let hasRest = false;

      for (const b of h.blocks) {

        const skill = skillsMap[b.skillId.toString()];
        if (!skill)
          throw new createError.BadRequest(
            `Skill inválida detectada en horario del usuario ${userName}`
          );

        if (skill.type === 'rest') {

          if (hasRest)
            throw new createError.BadRequest(
              `El usuario ${userName} tiene múltiples bloques de descanso el día ${dayKey}`
            );

          if (h.blocks.length !== 1)
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe ser un único bloque el día ${dayKey}`
            );

          if (b.start !== '08:00' || b.end !== '21:00')
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe cubrir 08:00 - 21:00`
            );

          hasRest = true;
          restDayDate = new Date(h.date);
        }

        else if (skill.type !== 'break') {
          totalMinutes += timeToMinutes(b.end) - timeToMinutes(b.start);
        }
      }
    }

    if (!restDayDate)
      throw new createError.BadRequest(
        `El usuario ${userName} no tiene su día de descanso semanal obligatorio`
      );

    if (totalMinutes !== WEEKLY_REQUIRED_MINUTES)
      throw new createError.BadRequest(
        `El usuario ${userName} tiene ${totalMinutes / 60} horas. Debe tener exactamente ${WEEKLY_REQUIRED_HOURS} horas operativas`
      );

    // 🔥 VALIDACIÓN 3–9 DÍAS ENTRE DESCANSOS
    const previousSchedules = await collection.find({
      userId: new ObjectId(userId),
      status: { $in: ['publicado', 'archivado'] },
      date: { $lt: restDayDate }
    }).sort({ date: -1 }).toArray();

    let lastRestDate = null;

    for (const schedule of previousSchedules) {

      for (const b of schedule.blocks) {

        const skill = skillsMap[b.skillId.toString()];

        if (skill && skill.type === 'rest') {
          lastRestDate = new Date(schedule.date);
          break;
        }
      }

      if (lastRestDate) break;
    }

    if (lastRestDate) {

      const diffDays = Math.floor(
        (restDayDate - lastRestDate) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 3 || diffDays > 9) {
        throw new createError.BadRequest(
          `El descanso del usuario ${userName} incumple la regla de 3 a 9 días entre descansos`
        );
      }
    }

    // 🔥 ARCHIVAR SOLO SEMANA PUBLICADA DE ESTE AGENTE
    await collection.updateMany(
      {
        userId: new ObjectId(userId),
        status: 'publicado'
      },
      {
        $set: {
          status: 'archivado',
          archivedAt: new Date()
        }
      }
    );
  }

  // 🔥 PUBLICAR NUEVA SEMANA
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

/* 🔥 ADMIN - EDITAR SEMANA YA PUBLICADA (SIN ARCHIVAR) */
const editPublishedWeek = async ({ userId, date, schedules, editedBy }) => {

  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  if (!ObjectId.isValid(userId))
    throw new createError.BadRequest('UserId inválido');

  if (!date || !Array.isArray(schedules) || schedules.length !== 7)
    throw new createError.BadRequest(
      'Debe enviar exactamente los 7 días de la semana'
    );

  const { weekStart, weekEnd } = getWeekRange(date);

  const existingPublished = await collection.find({
    userId: new ObjectId(userId),
    status: 'publicado',
    date: { $gte: weekStart, $lte: weekEnd }
  }).toArray();

  if (existingPublished.length !== 7)
    throw new createError.BadRequest(
      'La semana publicada está incompleta o no existe'
    );

  // 🔥 VALIDACIÓN ENTERPRISE ID ↔ FECHA (FIX DEFINITIVO)

  const existingMap = {};
  existingPublished.forEach(doc => {
    existingMap[doc._id.toString()] = normalizeDate(doc.date);
  });

  for (const day of schedules) {

    if (!ObjectId.isValid(day.id)) {
      throw new createError.BadRequest(
        `El identificador ${day.id} no es válido`
      );
    }

    if (!existingMap[day.id]) {
      throw new createError.BadRequest(
        `El identificador ${day.id} no pertenece a la semana publicada del agente o no existe`
      );
    }

    const originalDate = existingMap[day.id];
    const newDate = normalizeDate(day.date);

    if (originalDate !== newDate) {
      throw new createError.BadRequest(
        `El identificador ${day.id} corresponde a la fecha ${originalDate} y no puede ser reasignado a ${newDate}`
      );
    }
  }

  // 🔥 VALIDACIONES COMPLETAS (MISMO NIVEL QUE publishByDate)

  let totalMinutes = 0;
  let restDayDate = null;
  const uniqueDays = new Set();

  for (const day of schedules) {

    const scheduleDate = new Date(day.date);
    const dayKey = scheduleDate.toISOString().split('T')[0];

    if (uniqueDays.has(dayKey))
      throw new createError.BadRequest(
        `Día duplicado en la semana: ${dayKey}`
      );

    uniqueDays.add(dayKey);

    const validatedBlocks = validateBlocksStructure(day.blocks);

    let hasRest = false;
    let consecutiveWorkMinutes = 0;

    for (const block of validatedBlocks) {

      const skill = await skillsCollection.findOne({
        _id: new ObjectId(block.skillId),
        status: 'active'
      });

      if (!skill)
        throw new createError.BadRequest(
          'Una de las habilidades asignadas no existe o está inactiva'
        );

      const duration =
        timeToMinutes(block.end) - timeToMinutes(block.start);

      if (skill.type === 'rest') {

        if (hasRest)
          throw new createError.BadRequest(
            'Solo puede existir un descanso por día'
          );

        if (validatedBlocks.length !== 1)
          throw new createError.BadRequest(
            'El descanso no puede mezclarse con otros bloques'
          );

        if (block.start !== '08:00' || block.end !== '21:00')
          throw new createError.BadRequest(
            'El descanso debe cubrir la jornada completa'
          );

        hasRest = true;
        restDayDate = scheduleDate;
        consecutiveWorkMinutes = 0;
      }

      if (skill.type === 'operative') {

        consecutiveWorkMinutes += duration;

        if (consecutiveWorkMinutes > 240)
          throw new createError.BadRequest(
            'No se puede trabajar más de 4 horas consecutivas sin break'
          );

        totalMinutes += duration;
      }

      if (skill.type === 'break')
        consecutiveWorkMinutes = 0;
    }
  }

  const userCollection = await Database(USERS_COLLECTION);
  const userData = await userCollection.findOne({
    _id: new ObjectId(userId)
  });

  const userName = userData?.name || 'Usuario desconocido';

  if (!restDayDate)
    throw new createError.BadRequest(
      `El usuario ${userName} no tiene su día de descanso semanal obligatorio`
    );

  if (totalMinutes !== WEEKLY_REQUIRED_MINUTES)
    throw new createError.BadRequest(
      `La semana del agente ${userName} tiene ${totalMinutes / 60} horas operativas. Debe tener exactamente ${WEEKLY_REQUIRED_HOURS} horas`
    );

  // 🔥 VALIDACIÓN 3-9 DÍAS ENTRE DESCANSOS
  const previousRest = await collection.find({
    userId: new ObjectId(userId),
    status: { $in: ['publicado', 'archivado'] },
    date: { $lt: restDayDate }
  }).sort({ date: -1 }).toArray();

  let lastRestDate = null;

  for (const schedule of previousRest) {
    for (const b of schedule.blocks) {
      const skill = await skillsCollection.findOne({
        _id: new ObjectId(b.skillId)
      });
      if (skill && skill.type === 'rest') {
        lastRestDate = new Date(schedule.date);
        break;
      }
    }
    if (lastRestDate) break;
  }

  if (lastRestDate) {

    const diffDays = Math.floor(
      (restDayDate - lastRestDate) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 3 || diffDays > 9)
      throw new createError.BadRequest(
        `El descanso del agente ${userName} incumple la regla de 3 a 9 días entre descansos`
      );
  }

  // 🔥 TODO OK → ACTUALIZAR LOS MISMOS DOCUMENTOS

  for (const day of schedules) {

    await collection.updateOne(
      { _id: new ObjectId(day.id), status: 'publicado' },
      {
        $set: {
          date: new Date(day.date),
          blocks: day.blocks.map(b => ({
            start: b.start,
            end: b.end,
            skillId: new ObjectId(b.skillId)
          })),
          editedAt: new Date(),
          editedBy: new ObjectId(editedBy)
        }
      }
    );
  }

  return { edited: true };
};
  

module.exports.HorariosService = {
  getAll,
  getById,
  getByUserId,
  getPublishedByUserId,
  create,
  update,
  publishByDate,
  editPublishedWeek,
};