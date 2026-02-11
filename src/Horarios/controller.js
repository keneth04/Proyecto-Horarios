const createError = require('http-errors');
const debug = require('debug')('app:module-horarios-controller');

const { HorariosService } = require('./services');
const { Response } = require('../common/response');

module.exports.HorariosController = {

  getHorarios: async (req, res) => {
    try {
      const horarios = await HorariosService.getAll();
      Response.success(res, 200, 'Lista de horarios', horarios);
    } catch (error) {
      debug(error);
      Response.error(res);
    }
  },

  getHorario: async (req, res) => {
    try {
      const { id } = req.params;
      const horario = await HorariosService.getById(id);

      if (!horario) {
        return Response.error(res, new createError.NotFound());
      }

      Response.success(res, 200, 'Horario encontrado', horario);
    } catch (error) {
      debug(error);
      Response.error(res);
    }
  },

  createHorario: async (req, res) => {
    try {
      const { body } = req;

      if (!body || !body.userId || !body.date || !body.blocks) {
        return Response.error(res, createError.BadRequest('Datos incompletos'));
      }

      const insertedId = await HorariosService.create(body);
      Response.success(res, 201, 'Horario creado correctamente', insertedId);

    } catch (error) {
      debug(error);
      Response.error(res);
    }
  },

  updateHorario: async (req, res) => {
    try {
      const { id } = req.params;
      const { body } = req;

      if (!body || Object.keys(body).length === 0) {
        return Response.error(res, createError.BadRequest());
      }

      const result = await HorariosService.update(id, body);
      Response.success(res, 200, 'Horario actualizado', result);

    } catch (error) {
      debug(error);
      Response.error(res);
    }
  },

  deleteHorario: async (req, res) => {
    try {
      const { id } = req.params;

      const horario = await HorariosService.getById(id);
      if (!horario) {
        return Response.error(res, new createError.NotFound());
      }

      await HorariosService.remove(id);
      Response.success(res, 200, 'Horario eliminado', horario);

    } catch (error) {
      debug(error);
      Response.error(res);
    }
  }
};
