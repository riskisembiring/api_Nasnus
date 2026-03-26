import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Verify Email OTP Handler
export const verifyEmailOTPHandler = async (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({ message: 'Username dan OTP diperlukan' });
  }

  try {
    // cari user dulu
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // cari OTP
    const otpSnapshot = await getDocs(
      query(
        collection(db, 'user_verifications'),
        where('type', '==', 'email'),
        where('used', '==', false),
        where('userId', '==', userId)
      )
    );

    const validOtpDoc = otpSnapshot.docs.find(doc => {
      const data = doc.data();

      return (
        String(data.code) === String(otp) &&
        data.expiresAt.toDate() > new Date()
      );
    });

    if (!validOtpDoc) {
      return res.status(400).json({ message: 'OTP tidak valid atau sudah expired' });
    }

    // update otp used
    await updateDoc(doc(db, 'user_verifications', validOtpDoc.id), { used: true });

    // update user verified
    await updateDoc(doc(db, 'users', userId), { emailVerified: true });

    res.status(200).json({ message: 'Email berhasil diverifikasi!' });

  } catch (error) {
    res.status(500).json({ message: 'Gagal verifikasi OTP', error: error.message });
  }
};

export default verifyEmailOTPHandler;

