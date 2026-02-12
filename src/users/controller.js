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
            const result = await UsersService.updateUser(id, body);
            Response.success(res, 200, 'Usuario actualizado correctamente', result);
        } catch (error) {
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            await UsersService.deleteUser(id);
            Response.success(res, 200, 'Usuario eliminado correctamente', null);
        } catch (error) {
            next(error);
        }
    }
};
