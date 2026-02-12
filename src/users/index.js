const express = require('express');
const { UsersController } = require('./controller');
const { UsersService } = require('./services');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware');

const router = express.Router();

module.exports.UsersAPI = (app) => {

    /**
     * 🔥 CREAR USUARIO
     * - Si NO existen usuarios → permite crear el primer admin sin token
     * - Si YA existen usuarios → exige token + rol admin
     */
    router.post(
        '/',
        async (req, res, next) => {
            try {
                const users = await UsersService.getAll();

                // Si ya existe al menos un usuario → exigir autenticación
                if (users.length > 0) {
                    return AuthMiddleware(req, res, (err) => {
                        if (err) return next(err);

                        // Luego validar rol admin
                        RoleMiddleware(['admin'])(req, res, next);
                    });
                }

                // Si no hay usuarios → permitir crear primer admin
                next();

            } catch (error) {
                next(error);
            }
        },
        UsersController.createUser
    );

    /**
     * 🔐 Rutas protegidas
     */

    // Ver todos los usuarios (solo admin)
    router.get(
        '/',
        AuthMiddleware,
        RoleMiddleware(['admin']),
        UsersController.getUsers
    );

    // Ver un usuario por id (solo admin)
    router.get(
        '/:id',
        AuthMiddleware,
        RoleMiddleware(['admin']),
        UsersController.getUser
    );

    // Actualizar usuario (solo admin)
    router.patch(
        '/:id',
        AuthMiddleware,
        RoleMiddleware(['admin']),
        UsersController.updateUser
    );

    // Eliminar usuario (solo admin)
    router.delete(
        '/:id',
        AuthMiddleware,
        RoleMiddleware(['admin']),
        UsersController.deleteUser
    );

    app.use('/api/users', router);
};
