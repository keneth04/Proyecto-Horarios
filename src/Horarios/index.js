const express = require('express');
const { HorariosController } = require('./controller');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware');
const { ActiveUserMiddleware } = require('../middlewares/activeMiddleware');

const router = express.Router();

module.exports.HorariosAPI = (app) => {

  router

    /**
     * 🔥 IMPORTANTE:
     * Rutas específicas PRIMERO
     */

    // 📌 AGENTE - ver solo sus horarios
    .get('/mi-horario',
      AuthMiddleware,
      ActiveUserMiddleware,
      RoleMiddleware(['agente']),
      HorariosController.getMyHorarios
    )

    // 📌 ADMIN - ver horarios por userId
    .get('/usuario/:userId',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorariosByUser
    )

    /**
     * 📌 ADMIN - ver todos
     */
    .get('/',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorarios
    )

    /**
     * 📌 ADMIN - ver por id
     */
    .get('/:id',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorario
    )

    /**
     * 📌 ADMIN - crear
     */
    .post('/',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.createHorario
    )

    /**
     * 📌 ADMIN - actualizar
     */
    .patch('/:id',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.updateHorario
    )

    /**
     * 📌 ADMIN - eliminar
     */
    .delete('/:id',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.deleteHorario
    );

  app.use('/api/horarios', router);
};
