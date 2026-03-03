const express = require('express');
const { HorariosController } = require('./controller');

const { AuthMiddleware } = require('../middlewares/authMiddleware');
const { RoleMiddleware } = require('../middlewares/roleMiddleware');
const { ActiveUserMiddleware } = require('../middlewares/activeMiddleware');

const router = express.Router();

module.exports.HorariosAPI = (app) => {

  // 📌 ADMIN - ver horarios de un día (publicados y/o borradores)
  router.get(
    '/dia',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getHorariosByDate
  );

  // 📌 ADMIN - ver semana publicada por agente
  router.get(
    '/semana-publicada/usuario/:userId',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getPublishedWeekByUser
  );

  // 📌 ADMIN - ver semana publicada de todos los agentes
  router.get(
    '/semana-publicada',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getPublishedWeekAllAgents
  );

  // 📌 ADMIN - tabla visual de agentes por hora y skill
  router.get(
    '/dotacion/dia',
    AuthMiddleware,
    RoleMiddleware(['admin']),
    HorariosController.getStaffingTableByDate
  );
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