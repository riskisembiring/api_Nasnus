import { addUserHandler } from './api/add-user.js';
import { loginHandler } from './api/login.js';
import { addDataHandler, updateDataHandler, getDataHandler } from './api/data.js';

// Ekspor handler utama untuk Vercel
export default async function handler(req, res) {
  // Menentukan rute berdasarkan URL dan metode HTTP
  const { url, method } = req;

  try {
    if (url === '/api/add-user' && method === 'POST') {
      return addUserHandler(req, res);
    } else if (url === '/api/login' && method === 'POST') {
      return loginHandler(req, res);
    } else if (url === '/api/data' && method === 'POST') {
      return addDataHandler(req, res);
    } else if (url.startsWith('/api/data') && method === 'PUT') {
      // Menangkap ID dari URL (contoh: /api/data/:id)
      const id = url.split('/')[3]; // Mengambil ID dari URL
      req.params = { id }; // Menyisipkan ID ke objek `req`
      return updateDataHandler(req, res);
    } else if (url === '/api/data' && method === 'GET') {
      return getDataHandler(req, res);
    }

    // Jika rute tidak ditemukan
    res.status(404).json({ message: 'Rute tidak ditemukan' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
}
