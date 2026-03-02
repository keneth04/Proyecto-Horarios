const express = require('express');
const { HorariosController } = require('./controller');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMidddleware');
const { ActiveUserMiddleware } = require('../middlewares/activeMiddleware');

const router = express.Router();

module.exports.HorariosAPI = (app) => {
  // 📌 AGENTE - ver solo sus horarios PUBLICADOS
  router.get(
    '/mi-horario',
    AuthMiddleware,
    ActiveUserMiddleware,
    RoleMiddleware(['agente']),
    HorariosController.getMyHorarios
  );

  // 📌 ADMIN - publicar horarios por fecha
  router.post(
    '/publicar',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.publishByDate
  );

  // 📌 ADMIN - editar semana ya publicada
  router.patch(
    '/editar-semana-publicada',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.editPublishedWeek
  );

  // 📌 ADMIN - ver horarios por userId
  router.get(
    '/usuario/:userId',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getHorariosByUser
  );

  // 📌 ADMIN - ver todos
  router.get(
    '/',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getHorarios
  );

  // 📌 ADMIN - ver por id
  router.get(
    '/:id',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getHorario
  );

  // 📌 ADMIN - crear
  router.post(
    '/',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.createHorario
  );

  // 📌 ADMIN - actualizar
  router.patch(
    '/:id',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.updateHorario
  );

  app.use('/api/horarios', router);
};