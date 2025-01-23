import express from 'express';
import cors from 'cors';
import { addUserHandler } from './api/add-user.js';
import { loginHandler } from './api/login.js';
import { addDataHandler, updateDataHandler, getDataHandler } from './api/data.js';

const app = express();

// CORS hanya diterapkan pada aplikasi Express
app.use(cors());
app.use(express.json());

// Menangani rute API
app.post('/api/add-user', addUserHandler);
app.post('/api/login', loginHandler);
app.post('/api/data', addDataHandler);
app.put('/api/data/:id', updateDataHandler);
app.get('/api/data', getDataHandler);

// Ekspor handler utama untuk Vercel
export default function handler(req, res) {
  // Menentukan rute berdasarkan URL dan metode HTTP
  const { url, method } = req;

  try {
    if (method === 'POST' && url === '/api/add-user') {
      return addUserHandler(req, res);
    } else if (method === 'POST' && url === '/api/login') {
      return loginHandler(req, res);
    } else if (method === 'POST' && url === '/api/data') {
      return addDataHandler(req, res);
    } else if (method === 'PUT' && url.startsWith('/api/data')) {
      const id = req.url.split('/')[3]; // Memperbaiki pengambilan ID
      req.params = { id };
      return updateDataHandler(req, res);
    } else if (method === 'GET' && url === '/api/data') {
      return getDataHandler(req, res);
    }

    res.status(404).json({ message: 'Rute tidak ditemukan' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
}
