const express = require('express');
const { HorariosController } = require('./controller');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware');
const { ActiveUserMiddleware } = require('../middlewares/activeMiddleware');

const router = express.Router();

module.exports.HorariosAPI = (app) => {

  router

    /**
     * 🔥 Rutas específicas primero
     */

    // 📌 AGENTE - ver solo sus horarios PUBLICADOS
    .get('/mi-horario',
      AuthMiddleware,
      ActiveUserMiddleware,
      RoleMiddleware(['agente']),
      HorariosController.getMyHorarios
    )

    // 📌 ADMIN - publicar horarios por fecha
    .post('/publicar',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.publishByDate
    )

    .patch('/editar-semana-publicada',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.editPublishedWeek
)

    // 📌 ADMIN - ver horarios por userId
    .get('/usuario/:userId',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorariosByUser
    )

    // 📌 ADMIN - ver todos
    .get('/',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorarios
    )

    // 📌 ADMIN - ver por id
    .get('/:id',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.getHorario
    )
    
    // 📌 ADMIN - crear
    .post('/',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.createHorario
    )

    // 📌 ADMIN - actualizar
    .patch('/:id',
      AuthMiddleware,
      RoleMiddleware(['admin']),
      HorariosController.updateHorario 
    );

  app.use('/api/horarios', router);
};
