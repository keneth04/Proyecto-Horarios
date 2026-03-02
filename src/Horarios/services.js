const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'horarios';
const USERS_COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';

/* 🔒 CONSTANTES DE NEGOCIO */
const DAY_START = 8 * 60;     // 08:00
const DAY_END = 21 * 60;      // 21:00
const MIN_BLOCK_DURATION = 30; // minutos
const WEEKLY_REQUIRED_HOURS = 42;
const WEEKLY_REQUIRED_MINUTES = WEEKLY_REQUIRED_HOURS * 60;

/* =========================
 * Helpers base
 * ========================= */

const assertValidObjectId = (id, message = 'ID inválido') => {
  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest(message);
  }
};

// HH:mm estricto
const isValidTimeFormat = (time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const parseStrictISODateOrThrow = (dateString, fieldName = 'Fecha inválida') => {
  if (typeof dateString !== 'string') {
    throw new createError.BadRequest(fieldName);
  }

  const trimmed = dateString.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    throw new createError.BadRequest(fieldName);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) {
    throw new createError.BadRequest(fieldName);
  }

  return parsedDate;
};

const normalizeDate = (date) => {
  const d = parseStrictISODateOrThrow(date, 'Fecha inválida, formato esperado YYYY-MM-DD');
  return d.toISOString().split('T')[0];
};

// Semana SÁBADO → VIERNES (UTC)
const getWeekRange = (dateString) => {
  const d = new Date(dateString + 'T00:00:00.000Z');
  const day = d.getUTCDay();

  const diffToSaturday = (day === 6) ? 0 : day + 1;

  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() - diffToSaturday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/* =========================
 * Validación estructura bloques (NO toca DB)
 * ========================= */

const validateBlocksStructure = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new createError.BadRequest('Debe existir al menos un bloque');
  }

  const processed = blocks.map((b) => {
    if (!b.start || !b.end || !b.skillId) {
      throw new createError.BadRequest('Bloque inválido: datos incompletos');
    }

    if (!isValidTimeFormat(b.start) || !isValidTimeFormat(b.end)) {
      throw new createError.BadRequest(`Formato inválido en bloque ${b.start} - ${b.end}`);
    }

    const startMin = timeToMinutes(b.start);
    const endMin = timeToMinutes(b.end);

    if (startMin >= endMin) {
      throw new createError.BadRequest(`La hora inicio debe ser menor que fin (${b.start}-${b.end})`);
    }

    if (endMin - startMin < MIN_BLOCK_DURATION) {
      throw new createError.BadRequest(`Bloque mínimo ${MIN_BLOCK_DURATION} minutos`);
    }

    if (startMin < DAY_START || endMin > DAY_END) {
      throw new createError.BadRequest('Bloques deben estar entre 08:00 y 21:00');
    }

    return { ...b, startMin, endMin };
  });

  processed.sort((a, b) => a.startMin - b.startMin);

  for (let i = 1; i < processed.length; i++) {
    if (processed[i].startMin < processed[i - 1].endMin) {
      throw new createError.BadRequest(
        `Solapamiento entre ${processed[i - 1].start} y ${processed[i].start}`
      );
    }
  }

  // devolver sin startMin/endMin
  return processed.map(({ startMin, endMin, ...rest }) => rest);
};

/* =========================
 * Helpers skills (DB)
 * ========================= */

const buildSkillsMapFromIds = async (skillsCollection, ids) => {
  const objectIds = [...new Set(ids.map(String))].map((id) => new ObjectId(id));
  const skills = await skillsCollection.find({ _id: { $in: objectIds } }).toArray();

  const map = {};
  for (const s of skills) map[s._id.toString()] = s;
  return map;
};

const getSkillFromMapOrThrow = (skillsMap, skillId, messageIfMissing = 'Skill no existe') => {
  const skill = skillsMap[String(skillId)];
  if (!skill) throw new createError.BadRequest(messageIfMissing);
  return skill;
};

/* =========================
 * Validación lógica día (REST / BREAK / 4H)
 * - Mantiene tus mismas reglas y mensajes clave
 * ========================= */

const validateDayBlocksBusinessRules = ({ blocks, skillsMap, allowedSkillsSet = null }) => {
  let hasRest = false;
  let hasAbsence = false;
  let consecutiveWorkMinutes = 0;

  for (const block of blocks) {
    assertValidObjectId(block.skillId, 'SkillId inválido');

    const skill = getSkillFromMapOrThrow(skillsMap, block.skillId, 'Skill no existe o está inactiva');

    const duration = timeToMinutes(block.end) - timeToMinutes(block.start);

    // ✅ REST (descanso semanal) - bloque completo y no se mezcla
    if (skill.type === 'rest') {
      if (hasRest) {
        throw new createError.BadRequest('Solo puede existir un bloque de descanso por día');
      }

      if (blocks.length !== 1) {
        throw new createError.BadRequest('El descanso no puede mezclarse con otros bloques');
      }

      if (block.start !== '08:00' || block.end !== '21:00') {
        throw new createError.BadRequest('El descanso debe cubrir la jornada completa (08:00 - 21:00)');
      }

      hasRest = true;
      consecutiveWorkMinutes = 0;
      continue;
    }

    // ✅ ABSENCE (VACACIONES / SANCION / CUMPLEAÑOS) - bloque completo y no se mezcla
    if (skill.type === 'absence') {
      if (hasAbsence) {
        throw new createError.BadRequest('Solo puede existir un bloque de ausencia por día');
      }

      if (blocks.length !== 1) {
        throw new createError.BadRequest('La ausencia no puede mezclarse con otros bloques');
      }

      if (block.start !== '08:00' || block.end !== '21:00') {
        throw new createError.BadRequest('La ausencia debe cubrir la jornada completa (08:00 - 21:00)');
      }

      hasAbsence = true;
      consecutiveWorkMinutes = 0;
      continue;
    }

    // 🔥 Operativas
    if (skill.type === 'operative') {
      if (allowedSkillsSet && !allowedSkillsSet.has(skill._id.toString())) {
        throw new createError.BadRequest('Skill no permitida para el agente');
      }

      consecutiveWorkMinutes += duration;

      if (consecutiveWorkMinutes > 240) {
        throw new createError.BadRequest('No se puede trabajar más de 4 horas consecutivas sin break');
      }
      continue;
    }

    // 🔥 Break resetea consecutivas
    if (skill.type === 'break') {
      consecutiveWorkMinutes = 0;
      continue;
    }

    // 🔒 Si llega un tipo desconocido, fallar (para evitar “colados”)
    throw new createError.BadRequest(`Tipo de skill no soportado: ${skill.type}`);
  }
};

/* =========================
 * Queries base
 * ========================= */

const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}).sort({ date: -1 }).toArray();
};

const getById = async (id) => {
  assertValidObjectId(id, 'ID de horario inválido');

  const collection = await Database(COLLECTION);
  const horario = await collection.findOne({ _id: new ObjectId(id) });

  if (!horario) throw new createError.NotFound('Horario no encontrado');

  return horario;
};

const getByUserId = async (userId) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  const collection = await Database(COLLECTION);
  return collection.find({ userId: new ObjectId(userId) }).sort({ date: -1 }).toArray();
};

const getPublishedByUserId = async (userId) => {
  assertValidObjectId(userId, 'ID de usuario inválido');

  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const horarios = await collection
    .find({ userId: new ObjectId(userId), status: 'publicado' })
    .sort({ date: -1 })
    .toArray();

  if (!horarios.length) return [];

  const skillIds = horarios.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  return horarios.map((h) => ({
    ...h,
    blocks: h.blocks.map((b) => ({
      start: b.start,
      end: b.end,
      skill: skillsMap[b.skillId.toString()] || null
    }))
  }));
};

/* =========================
 * Commands
 * ========================= */

const create = async (horario) => {
  const collection = await Database(COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  const { userId, date, blocks, createdBy } = horario;

  if (!userId || !date || !blocks) {
    throw new createError.BadRequest('Datos incompletos');
  }

  assertValidObjectId(userId, 'El identificador del horario no es válido');
  assertValidObjectId(createdBy, 'El identificador del horario no es válido');

  const scheduleDate = parseStrictISODateOrThrow(date, 'Fecha inválida, formato esperado YYYY-MM-DD');

  const startOfDay = new Date(scheduleDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(scheduleDate);
  endOfDay.setHours(23, 59, 59, 999);

  const exists = await collection.findOne({
    userId: new ObjectId(userId),
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (exists) {
    throw new createError.Conflict('Ya existe un horario para ese usuario en esa fecha');
  }

  const user = await usersCollection.findOne({
    _id: new ObjectId(userId),
    status: 'active'
  });

  if (!user) {
    throw new createError.NotFound('Usuario no existe o inactivo');
  }

  const validatedBlocks = validateBlocksStructure(blocks);

  // 🔥 SkillsMap: cargarlas en 1 query (más eficiente)
  const skillIds = validatedBlocks.map((b) => b.skillId.toString());
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  const allowedSet = new Set((user.allowedSkills || []).map((id) => id.toString()));

  // 🔥 Validaciones día (incluye skill permitida y 4h sin break y rest)
  validateDayBlocksBusinessRules({
    blocks: validatedBlocks,
    skillsMap,
    allowedSkillsSet: allowedSet
  });

  // Convertir skillId a ObjectId (igual que antes)
  const blocksToSave = validatedBlocks.map((b) => ({
    ...b,
    skillId: new ObjectId(b.skillId)
  }));

  const result = await collection.insertOne({
    userId: new ObjectId(userId),
    date: scheduleDate,
    blocks: blocksToSave,
    createdBy: new ObjectId(createdBy),
    createdAt: new Date(),
    status: 'borrador'
  });

  return result.insertedId;
};

const update = async (id, body) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  assertValidObjectId(id);

  const existing = await collection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw new createError.NotFound('Horario no encontrado');

  if (existing.status === 'archivado') throw new createError.BadRequest('No editable');

  if (body.userId || body.createdBy || body.status) {
    throw new createError.BadRequest('No se permite modificar userId, createdBy o status');
  }

  const updateData = {};

  if (body.date) {
    updateData.date = parseStrictISODateOrThrow(body.date, 'Fecha inválida, formato esperado YYYY-MM-DD');
  }

  if (body.blocks) {
    const validatedBlocks = validateBlocksStructure(body.blocks);

    // SkillsMap de los bloques del día (1 query)
    const skillIds = validatedBlocks.map((b) => b.skillId.toString());
    const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

    // Validación día: rest/absence/break/operative + 4h (sin allowedSkills en update)
    validateDayBlocksBusinessRules({
      blocks: validatedBlocks,
      skillsMap,
      allowedSkillsSet: null
    });

    // 🔥 VALIDACIÓN SEMANAL SI ESTÁ PUBLICADO
    if (existing.status === 'publicado') {
      const targetDate = updateData.date || existing.date;
      const { weekStart, weekEnd } = getWeekRange(targetDate.toISOString().split('T')[0]);

      const weeklyPublished = await collection
        .find({
          userId: existing.userId,
          status: 'publicado',
          date: { $gte: weekStart, $lte: weekEnd }
        })
        .toArray();

      // SkillsMap para TODA la semana (1 query)
      const weekSkillIds = weeklyPublished.flatMap((s) =>
        (s._id.toString() === id ? validatedBlocks : s.blocks).map((b) => b.skillId.toString())
      );
      const weekSkillsMap = await buildSkillsMapFromIds(skillsCollection, weekSkillIds);

      let totalOperativeMinutes = 0;
      let absenceDays = 0;

      for (const schedule of weeklyPublished) {
        const blocksToUse = schedule._id.toString() === id ? validatedBlocks : schedule.blocks;

        // contar ausencia por DÍA (regla: si existe absence, es bloque único)
        let dayHasAbsence = false;

        for (const b of blocksToUse) {
          const skill = weekSkillsMap[b.skillId.toString()];

          if (!skill) {
            throw new createError.BadRequest('Skill inválida detectada en una semana publicada');
          }

          if (skill.type === 'absence') {
            dayHasAbsence = true;
            continue;
          }

          if (skill.type === 'operative') {
            totalOperativeMinutes += timeToMinutes(b.end) - timeToMinutes(b.start);
          }
          // break/rest no suman
        }

        if (dayHasAbsence) absenceDays += 1;
      }

      // ✅ requerido variable: 42h - 7h por día absence
      const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

      if (totalOperativeMinutes !== requiredMinutes) {
        throw new createError.BadRequest(
          `No se puede modificar. La semana publicada debe mantener exactamente ${requiredMinutes / 60} horas operativas`
        );
      }
    }

    // Guardar bloques (skillId a ObjectId)
    updateData.blocks = validatedBlocks.map((b) => ({
      ...b,
      skillId: new ObjectId(b.skillId)
    }));
  }

  updateData.updatedAt = new Date();

  await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  return { updated: true };
};

const publishByDate = async (date) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);
  const usersCollection = await Database(USERS_COLLECTION);

  if (!date) throw new createError.BadRequest('Fecha obligatoria');

  parseStrictISODateOrThrow(date, 'Fecha inválida, formato esperado YYYY-MM-DD');

  const { weekStart, weekEnd } = getWeekRange(date);

  const weeklyDrafts = await collection
    .find({
      status: 'borrador',
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .toArray();

  if (!weeklyDrafts.length) {
    throw new createError.BadRequest('No existen horarios en borrador para esa semana');
  }

  // Agrupar por agente
  const groupedByUser = {};
  for (const schedule of weeklyDrafts) {
    const uid = schedule.userId.toString();
    if (!groupedByUser[uid]) groupedByUser[uid] = [];
    groupedByUser[uid].push(schedule);
  }

  // SkillsMap para toda la semana (1 query)
  const skillIds = weeklyDrafts.flatMap((h) => h.blocks.map((b) => b.skillId.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, skillIds);

  // Validaciones por agente
  for (const userId in groupedByUser) {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const userName = user?.name || 'Usuario desconocido';
    const schedules = groupedByUser[userId];

    if (schedules.length !== 7) {
      throw new createError.BadRequest(`El usuario ${userName} debe tener exactamente 7 días en borrador`);
    }

    let totalMinutes = 0;
    let restDayDate = null;
    const uniqueDays = new Set();
    let absenceDays = 0;

    for (const h of schedules) {
      const dayKey = new Date(h.date).toISOString().split('T')[0];

      if (uniqueDays.has(dayKey)) {
        throw new createError.BadRequest(`El usuario ${userName} tiene múltiples horarios el día ${dayKey}`);
      }

      uniqueDays.add(dayKey);

      let hasRest = false;
      let hasAbsence = false;

            for (const b of h.blocks) {
        const skill = skillsMap[b.skillId.toString()];

        if (!skill) {
          throw new createError.BadRequest(`Skill inválida detectada en horario del usuario ${userName}`);
        }

        // ✅ REST (solo)
        if (skill.type === 'rest') {
          if (hasRest) {
            throw new createError.BadRequest(
              `El usuario ${userName} tiene múltiples bloques de descanso el día ${dayKey}`
            );
          }

          if (h.blocks.length !== 1) {
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe ser un único bloque el día ${dayKey}`
            );
          }

          if (b.start !== '08:00' || b.end !== '21:00') {
            throw new createError.BadRequest(
              `El descanso del usuario ${userName} debe cubrir 08:00 - 21:00`
            );
          }

          hasRest = true;
          restDayDate = new Date(h.date);
          continue;
        }

        // ✅ ABSENCE (solo)
        if (skill.type === 'absence') {
          if (hasAbsence) {
            throw new createError.BadRequest(
              `El usuario ${userName} tiene múltiples bloques de ausencia el día ${dayKey}`
            );
          }

          if (h.blocks.length !== 1) {
            throw new createError.BadRequest(
              `La ausencia del usuario ${userName} debe ser un único bloque el día ${dayKey}`
            );
          }

          if (b.start !== '08:00' || b.end !== '21:00') {
            throw new createError.BadRequest(
              `La ausencia del usuario ${userName} debe cubrir 08:00 - 21:00`
            );
          }

          hasAbsence = true;
          absenceDays += 1;
          continue;
        }

        // ⏱ Sumar solo operativas (ni break ni rest ni absence)
        if (skill.type === 'operative') {
          totalMinutes += timeToMinutes(b.end) - timeToMinutes(b.start);
        }
      }
    }

    if (!restDayDate) {
      throw new createError.BadRequest(`El usuario ${userName} no tiene su día de descanso semanal obligatorio`);
    }

    const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

    if (totalMinutes !== requiredMinutes) {
      throw new createError.BadRequest(
        `El usuario ${userName} tiene ${totalMinutes / 60} horas. Debe tener exactamente ${requiredMinutes / 60} horas operativas`
      );
    }

    // Regla 3–9 días entre descansos (misma lógica)
    const previousSchedules = await collection
      .find({
        userId: new ObjectId(userId),
        status: { $in: ['publicado', 'archivado'] },
        date: { $lt: restDayDate }
      })
      .sort({ date: -1 })
      .toArray();

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
      const diffDays = Math.floor((restDayDate - lastRestDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 3 || diffDays > 9) {
        throw new createError.BadRequest(
          `El descanso del usuario ${userName} incumple la regla de 3 a 9 días entre descansos`
        );
      }
    }

    // Archivar semana publicada anterior SOLO de este agente
    await collection.updateMany(
      { userId: new ObjectId(userId), status: 'publicado' },
      { $set: { status: 'archivado', archivedAt: new Date() } }
    );
  }

  // Publicar nueva semana (todos los borradores)
  const result = await collection.updateMany(
    { status: 'borrador', date: { $gte: weekStart, $lte: weekEnd } },
    { $set: { status: 'publicado', publishedAt: new Date() } }
  );

  return {
    week: { from: weekStart, to: weekEnd },
    totalUsersValidated: Object.keys(groupedByUser).length,
    totalDocumentsPublished: result.modifiedCount
  };
};

const editPublishedWeek = async ({ userId, date, schedules, editedBy }) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  assertValidObjectId(userId, 'UserId inválido');
  assertValidObjectId(editedBy, 'EditedBy inválido');

  if (!date || !Array.isArray(schedules) || schedules.length !== 7) {
    throw new createError.BadRequest('Debe enviar exactamente los 7 días de la semana');
  }

  const { weekStart, weekEnd } = getWeekRange(date);

  const existingPublished = await collection
    .find({
      userId: new ObjectId(userId),
      status: 'publicado',
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .toArray();

  if (existingPublished.length !== 7) {
    throw new createError.BadRequest('La semana publicada está incompleta o no existe');
  }

  // Map id -> fecha original
  const existingMap = {};
  existingPublished.forEach((doc) => {
    existingMap[doc._id.toString()] = normalizeDate(doc.date);
  });

  for (const day of schedules) {
    assertValidObjectId(day.id, `El identificador ${day.id} no es válido`);

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

  // SkillsMap para todo lo que venga en schedules (1 query)
  const allSkillIds = schedules.flatMap((d) => (d.blocks || []).map((b) => b.skillId?.toString()));
  const skillsMap = await buildSkillsMapFromIds(skillsCollection, allSkillIds.filter(Boolean));

  let totalMinutes = 0;
  let restDayDate = null;
  const uniqueDays = new Set();
  let absenceDays = 0;

  for (const day of schedules) {
    const scheduleDate = parseStrictISODateOrThrow(day.date, 'Fecha inválida, formato esperado YYYY-MM-DD');
    const dayKey = scheduleDate.toISOString().split('T')[0];

    if (uniqueDays.has(dayKey)) {
      throw new createError.BadRequest(`Día duplicado en la semana: ${dayKey}`);
    }
    uniqueDays.add(dayKey);

    const validatedBlocks = validateBlocksStructure(day.blocks);

    // Validación 4h + rest
    validateDayBlocksBusinessRules({
      blocks: validatedBlocks,
      skillsMap,
      allowedSkillsSet: null
    });

    // total horas operativas + detectar restDay
    for (const block of validatedBlocks) {
      const skill = getSkillFromMapOrThrow(skillsMap, block.skillId, 'Una de las habilidades asignadas no existe o está inactiva');
      const duration = timeToMinutes(block.end) - timeToMinutes(block.start);

      if (skill.type === 'rest') {
        restDayDate = scheduleDate;
      } else if (skill.type === 'operative') {
        totalMinutes += duration;
      }

      if (skill.type === 'absence') {
        if (validatedBlocks.length !== 1) {
          throw new createError.BadRequest('La ausencia no puede mezclarse con otros bloques');
        }

        if (block.start !== '08:00' || block.end !== '21:00') {
          throw new createError.BadRequest('La ausencia debe cubrir la jornada completa (08:00 - 21:00)');
        }

        absenceDays += 1;
    }
    }
  }

  const userCollection = await Database(USERS_COLLECTION);
  const userData = await userCollection.findOne({ _id: new ObjectId(userId) });
  const userName = userData?.name || 'Usuario desconocido';

  if (!restDayDate) {
    throw new createError.BadRequest(
      `El usuario ${userName} no tiene su día de descanso semanal obligatorio`
    );
  }

  const requiredMinutes = WEEKLY_REQUIRED_MINUTES - (absenceDays * 420);

  if (totalMinutes !== requiredMinutes) {
    throw new createError.BadRequest(
      `La semana del agente ${userName} tiene ${totalMinutes / 60} horas operativas. Debe tener exactamente ${requiredMinutes / 60} horas`
    );
  }

  // Validación 3–9 días entre descansos (misma lógica, pero sin N queries por skill)
  const previousRest = await collection
    .find({
      userId: new ObjectId(userId),
      status: { $in: ['publicado', 'archivado'] },
      date: { $lt: restDayDate }
    })
    .sort({ date: -1 })
    .toArray();

  let lastRestDate = null;

  // Para detectar rest en históricos, necesitamos skillsMap de esos bloques también
  const prevSkillIds = previousRest.flatMap((s) => s.blocks.map((b) => b.skillId.toString()));
  const prevSkillsMap = prevSkillIds.length
    ? await buildSkillsMapFromIds(skillsCollection, prevSkillIds)
    : {};

  for (const schedule of previousRest) {
    for (const b of schedule.blocks) {
      const skill = prevSkillsMap[b.skillId.toString()];
      if (skill && skill.type === 'rest') {
        lastRestDate = new Date(schedule.date);
        break;
      }
    }
    if (lastRestDate) break;
  }

  if (lastRestDate) {
    const diffDays = Math.floor((restDayDate - lastRestDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 3 || diffDays > 9) {
      throw new createError.BadRequest(
        `El descanso del agente ${userName} incumple la regla de 3 a 9 días entre descansos`
      );
    }
  }

  // OK => actualizar los mismos documentos
  for (const day of schedules) {
    await collection.updateOne(
      { _id: new ObjectId(day.id), status: 'publicado' },
      {
        $set: {
          date: parseStrictISODateOrThrow(day.date, 'Fecha inválida, formato esperado YYYY-MM-DD'),
          blocks: day.blocks.map((b) => ({
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
  editPublishedWeek
};
