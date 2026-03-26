import { v4 as uuidv4 } from 'uuid';
import { collection, getDocs, query, where, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Forgot Password Handler
export const forgotPasswordHandler = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username diperlukan' });
  }

  try {
    // Ambil data pengguna berdasarkan username
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );

    const userDoc = userSnapshot.docs.find((doc) => doc.data().username === username);

    if (!userDoc) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const tokenExpiration = new Date(Date.now() + 15 * 60 * 1000); // 15 menit dari sekarang

    // Simpan token ke Firestore (di collection 'password_resets')
    await addDoc(collection(db, 'password_resets'), {
      username,
      resetToken,
      expiresAt: tokenExpiration,
      createdAt: new Date(),
      used: false
    });

    // Kembalikan token ke client (dalam production,最好 dikirim via email)
    res.status(200).json({
      message: 'Token reset password berhasil dibuat',
      resetToken: resetToken,
      expiresIn: '15 menit',
      note: 'Silakan gunakan token ini untuk mereset password Anda'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan saat membuat token reset',
      error: error.message
    });
  }
};

export default forgotPasswordHandler;

