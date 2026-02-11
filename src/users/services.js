// en este archivo vamos a gestionar todos los datos y la comunicacion con la base de datos

const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const { Database } = require('../database');

const COLLECTION = 'users';

const getAll = async () => {
    const collection = await Database(COLLECTION);
    return await collection.find(
        {},
        { projection: { password: 0 } }
    ).toArray();
};

const getById = async (id) => {
    const collection = await Database(COLLECTION);

    if (!ObjectId.isValid(id)) {
        throw new createError.BadRequest('Id inválido');
    }

    return await collection.findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
    );
};

const getByEmail = async (email) => {
    const collection = await Database(COLLECTION);
    return await collection.findOne({ email });
};

const create = async (body) => {
    const collection = await Database(COLLECTION);

    const { name, email, password, role } = body;

    if (!name || !email || !password) {
        throw new createError.BadRequest('Datos incompletos');
    }

    const userExists = await getByEmail(email);
    if (userExists) {
        throw new createError.Conflict('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        name,
        email,
        password: hashedPassword,
        role: role || 'agente',
        createdAt: new Date()
    };

    const result = await collection.insertOne(newUser);

    return {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
    };
};

const updateUser = async (id, body) => {
    const collection = await Database(COLLECTION);

    if (!ObjectId.isValid(id)) {
        throw new createError.BadRequest('Id inválido');
    }

    if (body.password) {
        body.password = await bcrypt.hash(body.password, 10);
    }

    const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: body }
    );

    if (result.matchedCount === 0) {
        throw new createError.NotFound('Usuario no encontrado');
    }

    return result;
};

const deleteUser = async (id) => {
    const collection = await Database(COLLECTION);

    if (!ObjectId.isValid(id)) {
        throw new createError.BadRequest('Id inválido');
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
        throw new createError.NotFound('Usuario no encontrado');
    }

    return result;
};

module.exports.UsersService = {
    getAll,
    getById,
    getByEmail,
    create,
    updateUser,
    deleteUser
};
