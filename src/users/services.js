const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'users';
const SKILLS_COLLECTION = 'skills';
const SALT_ROUNDS = 10;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getAll = async () => {
  const collection = await Database(COLLECTION);
  return collection.find({}, { projection: { password: 0 } }).toArray();
};

const getById = async (id) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

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

const create = async (body) => {
  const collection = await Database(COLLECTION);

  const { name, email, password, role: bodyRole } = body;

  if (!name || !email || !password) {
    throw new createError.BadRequest('Datos incompletos');
  }

  if (!emailRegex.test(email)) {
    throw new createError.BadRequest('Email inválido');
  }

  const userExists = await getByEmail(email);
  if (userExists) {
    throw new createError.Conflict('El usuario ya existe');
  }

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
    createdAt: new Date()
  };

  const result = await collection.insertOne(newUser);

  return result.insertedId;
};

const updateUser = async (id, body) => {
  const collection = await Database(COLLECTION);
  const skillsCollection = await Database(SKILLS_COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  if (!body || Object.keys(body).length === 0) {
    throw new createError.BadRequest('Datos incompletos');
  }

  if (body.status) {
    throw new createError.BadRequest('El estado no puede modificarse desde este endpoint');
  }

  if (body.email && !emailRegex.test(body.email)) {
    throw new createError.BadRequest('Email inválido');
  }

  if (body.password) {
    body.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  /**
   * 🔥 VALIDACIÓN DE SKILLS (BREAK BLOQUEADO)
   */
  if (body.allowedSkills !== undefined) {

    if (!Array.isArray(body.allowedSkills)) {
      throw new createError.BadRequest('allowedSkills debe ser un arreglo');
    }

    const uniqueSkills = [...new Set(body.allowedSkills)];
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

      // 🔥 BLOQUEAR BREAK
      if (skill.type === 'break') {
        throw new createError.BadRequest('No se puede asignar la skill BREAK a un usuario');
      }

      validatedSkills.push(new ObjectId(skillId));
    }

    body.allowedSkills = validatedSkills;
  }

  body.updatedAt = new Date();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: body }
  );

  if (result.matchedCount === 0) {
    throw new createError.NotFound('Usuario no encontrado');
  }

  return { modifiedCount: result.modifiedCount };
};

const changeStatus = async (id, status) => {
  const collection = await Database(COLLECTION);

  if (!ObjectId.isValid(id)) {
    throw new createError.BadRequest('ID inválido');
  }

  if (!['active', 'inactive'].includes(status)) {
    throw new createError.BadRequest('Estado inválido');
  }

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
