import api from './client';

export const AuthApi = {
  login: (payload) => api.post('/auth/login', payload)
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
  editWeek: (payload) => api.patch('/horarios/editar-semana-publicada', payload),
  staffingByDay: ({ date, statuses }) => api.get(`/horarios/dotacion/dia?date=${date}&statuses=${statuses.join(',')}`),
  mySchedule: () => api.get('/horarios/mi-horario')
};
