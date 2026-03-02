const express = require('express');
const { UsersController } = require('./controller');
const { UsersService } = require('./services');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware'); // (mantengo el nombre actual para no romper nada)

const router = express.Router();

/**
 * Middleware:
 * - Si NO existen usuarios, permite crear el primero sin auth (se fuerza admin en el service)
 * - Si YA existen, exige token + rol admin
 */
const RequireAdminIfUsersExist = async (req, res, next) => {
  try {
    const users = await UsersService.getAll();

    if (users.length === 0) {
      return next();
    }

    // Si ya hay usuarios => Auth + Role admin
    AuthMiddleware(req, res, (err) => {
      if (err) return next(err);
      RoleMiddleware(['admin'])(req, res, next);
    });
  } catch (error) {
    next(error);
  }
};

module.exports.UsersAPI = (app) => {
  /**
   * 🔥 CREAR USUARIO
   * - Primer usuario: permitido sin token (service lo fuerza admin)
   * - Después: solo admin
   */
  router.post('/', RequireAdminIfUsersExist, UsersController.createUser);

  /**
   * 🔐 Rutas protegidas (solo admin)
   */
  router.get('/', AuthMiddleware, RoleMiddleware(['admin']), UsersController.getUsers);

  router.get('/:id', AuthMiddleware, RoleMiddleware(['admin']), UsersController.getUser);

  router.patch('/:id', AuthMiddleware, RoleMiddleware(['admin']), UsersController.updateUser);

  router.patch('/:id/status', AuthMiddleware, RoleMiddleware(['admin']), UsersController.changeStatus);

  app.use('/api/users', router);
};