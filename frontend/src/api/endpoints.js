import api from './client';

export const AuthApi = {
  login: (payload) => api.post('/auth/login', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload)
};

export const SkillsApi = {
  list: () => api.get('/skills'),
  create: (payload) => api.post('/skills', payload),
  update: (id, payload) => api.patch(`/skills/${id}`, payload),
  setStatus: (id, status) => api.patch(`/skills/${id}/status`, { status })
};

export const UsersApi = {
  list: () => api.get('/users'),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.patch(`/users/${id}`, payload),
  setStatus: (id, status) => api.patch(`/users/${id}/status`, { status })
};

export const HorariosApi = {
  byDay: ({ date, statuses }) => api.get(`/horarios/dia?date=${date}&statuses=${statuses.join(',')}`),
  create: (payload) => api.post('/horarios', payload),
  publish: (date) => api.post('/horarios/publicar', { date }),
  weekByUser: ({ userId, date }) => api.get(`/horarios/semana-publicada/usuario/${userId}?date=${date}`),
  weekByUserWithStatus: ({ userId, date, status }) => api.get(`/horarios/semana/usuario/${userId}?date=${date}&status=${status}`),
  editWeek: (payload) => api.patch('/horarios/editar-semana-publicada', payload),
  editWeekByMode: (payload) => api.patch('/horarios/editar-semana', payload),
  staffingByDay: ({ date, statuses, mode, campaign }) => {
    const params = new URLSearchParams();
    params.set('date', date);

    if (Array.isArray(statuses) && statuses.length > 0) {
      params.set('statuses', statuses.join(','));
    }

    if (mode) {
      params.set('mode', mode);
    }

    if (campaign !== undefined && campaign !== null && String(campaign).trim() !== '') {
      params.set('campaign', String(campaign).trim());
    }

    return api.get(`/horarios/dotacion/dia?${params.toString()}`);
  },

  weeklyHoursReport: ({ date, statuses, mode, campaign }) => {
    const params = new URLSearchParams();

    if (date) {
      params.set('date', date);
    }

    if (Array.isArray(statuses) && statuses.length > 0) {
      params.set('statuses', statuses.join(','));
    }

    if (mode) {
      params.set('mode', mode);
    }

    if (campaign !== undefined && campaign !== null && String(campaign).trim() !== '') {
      params.set('campaign', String(campaign).trim());
    }

    return api.get(`/horarios/reporte/horas-semana?${params.toString()}`);
  },

  downloadDailyOperativeHoursExcel: ({ date, statuses, mode, campaign }) => {
    const params = new URLSearchParams();

    if (date) {
      params.set('date', date);
    }

    if (Array.isArray(statuses) && statuses.length > 0) {
      params.set('statuses', statuses.join(','));
    }

    if (mode) {
      params.set('mode', mode);
    }

    if (campaign !== undefined && campaign !== null && String(campaign).trim() !== '') {
      params.set('campaign', String(campaign).trim());
    }

    return api.get(`/horarios/reporte/horas-operativas-diarias/excel?${params.toString()}`, {
      responseType: 'blob'
    });
  },
  
  mySchedule: () => api.get('/horarios/mi-horario')
};
