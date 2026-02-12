const createError = require('http-errors');
const debug = require('debug')('app:module-users-controller');

const { UsersService } = require('./services');
const { Response } = require('../common/response');

module.exports.UsersController = {

    getUsers: async (req, res, next) => {
        try {
            const users = await UsersService.getAll();
            Response.success(res, 200, 'Lista de usuarios', users);
        } catch (error) {
            next(error);
        }
    },

    getUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await UsersService.getById(id);

            if (!user) {
                throw new createError.NotFound('Usuario no encontrado');
            }

            Response.success(res, 200, 'Usuario encontrado', user);
        } catch (error) {
            next(error);
        }
    },

    createUser: async (req, res, next) => {
        try {
            const { body } = req;

            const insertedId = await UsersService.create(body);

            Response.success(res, 201, 'Usuario creado correctamente', {
                id: insertedId
            });
        } catch (error) {
            next(error);
        }
    },

    updateUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { body } = req;

            if (!body || Object.keys(body).length === 0) {
                throw new createError.BadRequest('Datos incompletos');
            }

            const result = await UsersService.updateUser(id, body);

            Response.success(res, 200, 'Usuario actualizado correctamente', result);
        } catch (error) {
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;

            const user = await UsersService.getById(id);
            if (!user) {
                throw new createError.NotFound('Usuario no encontrado');
            }

            await UsersService.deleteUser(id);

            Response.success(res, 200, 'Usuario eliminado correctamente');
        } catch (error) {
            next(error);
        }
    }
};
