import { addUserHandler } from './api/add-user.js';
import { loginHandler } from './api/login.js';
import { addDataHandler, updateDataHandler, getDataHandler } from './api/data.js';

// Export handler untuk Vercel
export default async function handler(req, res) {
  // Routes
  if (req.method === 'POST' && req.url === '/add-user') {
    return addUserHandler(req, res);
  }

  if (req.method === 'POST' && req.url === '/login') {
    return loginHandler(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/data') {
    return addDataHandler(req, res);
  }

  if (req.method === 'PUT' && req.url.startsWith('/api/data/:id')) {
    return updateDataHandler(req, res);
  }

  if (req.method === 'GET' && req.url === '/api/data') {
    return getDataHandler(req, res);
  }

  // Jika metode HTTP tidak valid
  res.status(405).json({ message: 'Metode tidak diizinkan' });
}
