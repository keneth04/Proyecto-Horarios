const debug = require('debug')('app:module-horarios-controller');
const { HorariosService } = require('./services');
const { Response } = require('../common/response');

module.exports.HorariosController = {

  getHorarios: async (req, res, next) => {
    try {
      const horarios = await HorariosService.getAll();
      Response.success(res, 200, 'Lista de horarios', horarios);
    } catch (error) {
      next(error);
    }
  },

  getHorario: async (req, res, next) => {
    try {
      const { id } = req.params;
      const horario = await HorariosService.getById(id);
      Response.success(res, 200, 'Horario encontrado', horario);
    } catch (error) {
      next(error);
    }
  },

  getHorariosByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const horarios = await HorariosService.getByUserId(userId);
      Response.success(res, 200, 'Horarios del usuario', horarios);
    } catch (error) {
      next(error);
    }
  },

  getMyHorarios: async (req, res, next) => {
    try {
      const userId = req.user.id.toString();
      const horarios = await HorariosService.getPublishedByUserId(userId);
      Response.success(res, 200, 'Mis horarios publicados', horarios);
    } catch (error) {
      next(error);
    }
  },

  createHorario: async (req, res, next) => {
    try {
      const { body, user } = req;

      const horarioData = {
        ...body,
        createdBy: user.id
      };

      const insertedId = await HorariosService.create(horarioData);

      Response.success(res, 201, 'Horario creado como borrador', {
        id: insertedId
      });
    } catch (error) {
      next(error);
    }
  },

  updateHorario: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { body } = req;

      const result = await HorariosService.update(id, body);

      Response.success(res, 200, 'Horario actualizado correctamente', result);
    } catch (error) {
      next(error);
    }
  },

  publishByDate: async (req, res, next) => {
    try {
      const { date } = req.body;
      const result = await HorariosService.publishByDate(date);

      Response.success(res, 200, 'Horarios publicados correctamente', result);
    } catch (error) {
      next(error);
    }
  }

};
