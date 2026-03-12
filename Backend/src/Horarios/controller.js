const { HorariosService } = require('./services');
const { Response } = require('../common/response');

module.exports.HorariosController = {
  getHorariosByDate: async (req, res, next) => {
    try {
      const { date, statuses } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const horarios = await HorariosService.getSchedulesByDate({
        date,
        statuses: parsedStatuses
      });

      Response.success(res, 200, 'Horarios del día', horarios);
    } catch (error) {
      next(error);
    }
  },

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

  getPublishedWeekByUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      const week = await HorariosService.getPublishedWeekByUser({ userId, date });
      Response.success(res, 200, 'Semana publicada del agente', week);
    } catch (error) {
      next(error);
    }
  },

  getPublishedWeekAllAgents: async (req, res, next) => {
    try {
      const { date } = req.query;
      const week = await HorariosService.getPublishedWeekAllAgents({ date });
      Response.success(res, 200, 'Semana publicada de todos los agentes', week);
    } catch (error) {
      next(error);
    }
  },

  getStaffingTableByDate: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const table = await HorariosService.getStaffingTableByDate({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      Response.success(res, 200, 'Tabla de dotación por hora y skill', table);
    } catch (error) {
      next(error);
    }
  },

  
  getWeeklyHoursReport: async (req, res, next) => {
    try {
      const { date, statuses, mode, campaign } = req.query;
      const parsedStatuses = statuses
        ? String(statuses).split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const report = await HorariosService.getWeeklyHoursReport({
        date,
        statuses: parsedStatuses,
        mode,
        campaign
      });

      Response.success(res, 200, 'Reporte semanal de horas por agente y skill', report);
    } catch (error) {
      next(error);
    }
  },


  createHorario: async (req, res, next) => {
    try {
      const horarioData = {
        ...req.body,
        createdBy: req.user.id
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
      const result = await HorariosService.update(id, req.body);
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
  },

  editPublishedWeek: async (req, res, next) => {
    try {
      const result = await HorariosService.editPublishedWeek({
        ...req.body,
        editedBy: req.user.id
      });

      Response.success(res, 200, 'Semana publicada editada correctamente', result);
    } catch (error) {
      next(error);
    }
  }
};
