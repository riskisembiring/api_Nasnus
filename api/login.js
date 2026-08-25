import bcrypt from 'bcrypt';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';
import { createActiveSession } from './session.js';

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
    const userDoc = userSnapshot.docs.find((doc) => doc.data().username === username);
    const user = userDoc?.data();

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Akun tidak aktif. Hubungi admin.' });
    }

    // Check if email is verified
    // if (!user.emailVerified) {
    //   return res.status(403).json({ 
    //     message: 'Silahkan lengkapi data terlebih dahulu. Verifikasi email Anda.', 
    //     needsVerification: true, 
    //     nextStep: 'update-profile' 
    //   });
    // }

    // Verifikasi password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }

    if (user.activeSessionId) {
      return res.status(409).json({
        message: 'User ini sudah login di browser atau device lain. Silahkan logout terlebih dahulu.',
        code: 'SESSION_ALREADY_ACTIVE',
      });
    }

    const sessionId = await createActiveSession(userDoc.id);

    res.status(200).json({ 
      message: `Berhasil login sebagai '${user.userRole}'`, 
      role: user.userRole, 
      username: user.username,
      sessionId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat login', error: error.message });
  }
};

export default loginHandler;
