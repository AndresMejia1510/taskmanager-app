import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://taskmanager-backend-z9jj.onrender.com/api',
});

// Interceptor para enviar el token JWT automáticamente en cada petición si el usuario ha iniciado sesión
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const isAuthRequest = config.url?.startsWith('/auth/');
  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;