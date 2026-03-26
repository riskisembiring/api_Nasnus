import bcrypt from 'bcrypt';
import { collection, getDocs, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Reset Password Handler
export const resetPasswordHandler = async (req, res) => {
  const { username, resetToken, newPassword } = req.body;

  if (!username || !resetToken || !newPassword) {
    return res.status(400).json({
      message: 'Username, reset token, dan password baru diperlukan'
    });
  }

  try {
    // Validasi password baru (minimal 6 karakter)
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password baru minimal 6 karakter'
      });
    }

    // Cari token reset yang valid
    const resetSnapshot = await getDocs(
      query(
        collection(db, 'password_resets'),
        where('username', '==', username),
        where('resetToken', '==', resetToken)
      )
    );

    const resetDoc = resetSnapshot.docs.find((doc) => !doc.data().used);

    if (!resetDoc) {
      return res.status(400).json({
        message: 'Token reset tidak valid atau sudah digunakan'
      });
    }

    const resetData = resetDoc.data();

    // Cek apakah token sudah expired
    if (new Date(resetData.expiresAt) < new Date()) {
      return res.status(400).json({
        message: 'Token reset sudah expired'
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password di collection 'users'
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );

    const userDoc = userSnapshot.docs.find((doc) => doc.data().username === username);

    if (!userDoc) {
      return res.status(404).json({
        message: 'Pengguna tidak ditemukan'
      });
    }

    const userRef = doc(db, 'users', userDoc.id);
    await updateDoc(userRef, { password: hashedPassword });

    // Tandai token sebagai sudah digunakan
    const resetRef = doc(db, 'password_resets', resetDoc.id);
    await updateDoc(resetRef, { used: true });

    res.status(200).json({
      message: 'Password berhasil direset'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan saat mereset password',
      error: error.message
    });
  }
};

export default resetPasswordHandler;

