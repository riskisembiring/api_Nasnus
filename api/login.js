import bcrypt from 'bcrypt';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Login User Handler
export const loginHandler = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password diperlukan' });
  }

  try {
    // Ambil data pengguna berdasarkan username
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );
    const user = userSnapshot.docs
      .map((doc) => doc.data())
      .find((user) => user.username === username);

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Verifikasi password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }
    res.status(200).json({ 
      message: `Berhasil login sebagai '${user.userRole}'`, 
      role: user.userRole, 
      username: user.username 
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat login', error: error.message });
  }
};

export default loginHandler;
