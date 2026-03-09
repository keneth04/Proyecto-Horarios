const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';
const SALT_ROUNDS = 10;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** =========================
 * Helpers / Validaciones
 * ========================= */

const assertValidObjectId = (id) => {
  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }
};

const assertValidEmail = (email) => {
  if (!emailRegex.test(email)) {
    throw new createError.BadRequest('Email inválido');
  }
};

const hashPasswordIfPresent = async (payload) => {
  if (!payload.password) return payload;
  return {
    ...payload,
    password: await bcrypt.hash(payload.password, SALT_ROUNDS)
  };
};

const validateUpdatePayload = (body) => {
  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  // Mantener tu regla
  if (body.status) {
    throw new createError.BadRequest('El estado no puede modificarse desde este endpoint');
  }

  if (body.email) {
    assertValidEmail(body.email);
  }
};

const validateAndNormalizeAllowedSkills = async (allowedSkills) => {
  if (allowedSkills === undefined) return undefined;

  if (!Array.isArray(allowedSkills)) {
    throw new createError.BadRequest('allowedSkills debe ser un arreglo');
  }

  const skillsCollection = await Database(SKILLS_COLLECTION);

  // quitar duplicados
  const uniqueSkills = [...new Set(allowedSkills)];
  const validatedSkills = [];

  for (const skillId of uniqueSkills) {
    if (!ObjectId.isValid(skillId)) {
      throw new createError.BadRequest(`Skill inválida: ${skillId}`);
    }

    const skill = await skillsCollection.findOne({
      _id: new ObjectId(skillId),
      status: 'active'
    });

    if (!skill) {
      throw new createError.BadRequest(`Skill no existe o está inactiva: ${skillId}`);
    }

    // Mantener tu regla: bloquear BREAK
    if (skill.type === 'break') {
      throw new createError.BadRequest('No se puede asignar la skill BREAK a un usuario');
    }

    validatedSkills.push(new ObjectId(skillId));
  }

  return validatedSkills;
};

/** =========================
 * Queries
 * ========================= */

const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}, { projection: { password: 0 } }).toArray();
};

const getById = async (id) => {
  assertValidObjectId(id);

  const collection = await Database(COLLECTION);
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

/** =========================
 * Commands
 * ========================= */

const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, email, password, role: bodyRole } = body;

  if (!name || !email || !password) {
    throw new createError.BadRequest('Datos incompletos');
  }

  assertValidEmail(email);

  const userExists = await getByEmail(email);
  if (userExists) {
    throw new createError.Conflict('El usuario ya existe');
  }

  // Mantener tu lógica: primer usuario => admin
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
    allowedSkills: [],
    loginAttempts: 0,
    lockUntil: null,
    createdAt: new Date()
  };

  const result = await collection.insertOne(newUser);
  return result.insertedId;
};

const updateUser = async (id, body) => {
  assertValidObjectId(id);
  validateUpdatePayload(body);

  const collection = await Database(COLLECTION);

  // Construimos payload sin mutar "body" directo
  let payload = { ...body };

  // password
  payload = await hashPasswordIfPresent(payload);

  // allowedSkills
  if (payload.allowedSkills !== undefined) {
    payload.allowedSkills = await validateAndNormalizeAllowedSkills(payload.allowedSkills);
  }

  payload.updatedAt = new Date();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: payload }
  );

  if (result.matchedCount === 0) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return { modifiedCount: result.modifiedCount };
};

const changeStatus = async (id, status) => {
  assertValidObjectId(id);

  if (!['active', 'inactive'].includes(status)) {
    throw new createError.BadRequest('Estado inválido');
  }

  const collection = await Database(COLLECTION);

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return { status };
};

module.exports.UsersService = {
  getAll,
  getById,
  getByEmail,
  create,
  updateUser,
  changeStatus
};