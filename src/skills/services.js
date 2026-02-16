const { ObjectId } = require('mongodb');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'skills';

const getAll = async () => {
    const collection = await Database(COLLECTION);
    return collection.find({}).toArray();
};

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

const create = async (body) => {
    const collection = await Database(COLLECTION);

    const { name, color, descripcion } = body;

    if (!name || !color || !descripcion) {
        throw new createError.BadRequest('Datos incompletos');
    }

    const normalizedName = name.trim();

    const skillExists = await collection.findOne({ name: normalizedName });

    if (skillExists) {
        throw new createError.Conflict('La skill ya existe');
    }

    const newSkill = {
        name: normalizedName,
        color,
        descripcion,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await collection.insertOne(newSkill);

    return result.insertedId;
};

const updateSkill = async (id, body) => {
    const collection = await Database(COLLECTION);

    if (!ObjectId.isValid(id)) {
        throw new createError.BadRequest('ID inválido');
    }

    if (!body || Object.keys(body).length === 0) {
        throw new createError.BadRequest('Datos incompletos');
    }

    // No permitir modificar estos campos
    if (body.status || body.createdAt || body._id) {
        throw new createError.BadRequest('Campos no permitidos en actualización');
    }

    if (body.name) {
        body.name = body.name.trim();
    }

    body.updatedAt = new Date();

    const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: body }
    );

    if (result.matchedCount === 0) {
        throw new createError.NotFound('Skill no encontrada');
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
        throw new createError.NotFound('Skill no encontrada');
    }

    return { status };
};

module.exports.SkillsService = {
    getAll,
    getById,
    create,
    updateSkill,
    changeStatus
};
