import { addUserHandler } from './api/add-user.js';
import { loginHandler } from './api/login.js';
import { addDataHandler, updateDataHandler, getDataHandler } from './api/data.js';

// Fungsi untuk menangani CORS
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');  // Mengizinkan akses dari semua domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');  // Metode HTTP yang diizinkan
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  // Header yang diizinkan
};

// Ekspor handler utama untuk Vercel
export default async function handler(req, res) {
  const { url, method } = req;

  // Menangani preflight request (OPTIONS) untuk CORS
  if (method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();  // Mengirim respons kosong dengan status 200
  }

  try {
    // Menambahkan CORS untuk setiap respons
    setCorsHeaders(res);

    if (url === '/api/add-user' && method === 'POST') {
      return addUserHandler(req, res);
    } else if (url === '/api/login' && method === 'POST') {
      return loginHandler(req, res);
    } else if (url === '/api/data' && method === 'POST') {
      return addDataHandler(req, res);
    } else if (url.startsWith('/api/data') && method === 'PUT') {
      const id = url.split('/')[3];  // Mengambil ID dari URL
      req.params = { id };
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
