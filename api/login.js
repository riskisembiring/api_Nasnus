import bcrypt from 'bcrypt';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Login User Handler
const loginHandler = async (req, res) => {
  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password diperlukan' });
  }

  try {
    // Mencari pengguna berdasarkan username di Firestore
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );

    // Mengambil data pengguna
    const user = userSnapshot.docs.map(doc => doc.data()).find(user => user.username === username);

    // Jika pengguna tidak ditemukan
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Verifikasi password menggunakan bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // Login berhasil
    res.status(200).json({
      message: 'Login berhasil',
      role: user.userRole, // Mengembalikan peran pengguna (opsional)
    });
  } catch (error) {
    // Menangani error lainnya
    res.status(500).json({
      message: 'Terjadi kesalahan saat login',
      error: error.message,
    });
  }
};

// Ekspor handler sebagai fungsi default untuk Vercel
export default async (req, res) => {
  return loginHandler(req, res);
};
