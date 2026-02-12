const createError = require('http-errors');
const debug = require('debug')('app:module-horarios-controller');

const { HorariosService } = require('./services');
const { Response } = require('../common/response');

module.exports.HorariosController = {

  // 🔹 ADMIN - traer todos
  getHorarios: async (req, res, next) => {
    try {
      const horarios = await HorariosService.getAll();
      Response.success(res, 200, 'Lista de horarios', horarios);
    } catch (error) {
  next(error);
    }
  },

  // 🔹 ADMIN - traer por ID
  getHorario: async (req, res, next) => {
    try {
      const { id } = req.params;

      const horario = await HorariosService.getById(id);

      if (!horario) {
        return Response.error(res, new createError.NotFound('Horario no encontrado'));
      }

      Response.success(res, 200, 'Horario encontrado', horario);

    } catch (error) {
  next(error);
    }
  },

  // 🔹 ADMIN - traer por userId
  getHorariosByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;

      const horarios = await HorariosService.getByUserId(userId);

      Response.success(res, 200, 'Horarios del usuario', horarios);

    } catch (error) {
  next(error);
    }
  },

  // 🔹 AGENTE - traer sus propios horarios
  getMyHorarios: async (req, res, next) => {
    try {
      const userId = req.user.id.toString(); // 🔥 Normalizado

      const horarios = await HorariosService.getByUserId(userId);

      Response.success(res, 200, 'Mis horarios', horarios);

    } catch (error) {
  next(error);
    }
  },

  // 🔹 ADMIN - crear horario
  createHorario: async (req, res, next) => {
    try {
      const { body, user } = req;

      if (!body || !body.userId || !body.date || !body.blocks) {
        return Response.error(
          res,
          new createError.BadRequest('Datos incompletos')
        );
      }

      const horarioData = {
        ...body,
        createdBy: user.id
      };

      const insertedId = await HorariosService.create(horarioData);

      Response.success(
        res,
        201,
        'Horario creado correctamente',
        insertedId
      );

    } catch (error) {
  next(error);
    }
  },

  updateHorario: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { body } = req;

      if (!body || Object.keys(body).length === 0) {
        return Response.error(res, new createError.BadRequest('Datos incompletos'));
      }

      const result = await HorariosService.update(id, body);

      Response.success(res, 200, 'Horario actualizado', result);

    } catch (error) {
  next(error);
    }
  },

  deleteHorario: async (req, res, next) => {
    try {
      const { id } = req.params;

      const horario = await HorariosService.getById(id);

      if (!horario) {
        return Response.error(res, new createError.NotFound('Horario no encontrado'));
      }

      await HorariosService.remove(id);

      Response.success(res, 200, 'Horario eliminado', horario);

    } catch (error) {
  next(error);
    }
  }

};
