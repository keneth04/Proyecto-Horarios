import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api'
});

const persistedToken = window.localStorage.getItem('token');
if (persistedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${persistedToken}`;
}
export default api;
