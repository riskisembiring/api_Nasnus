import { doc, updateDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Update User Profile Handler (for completing data: fullName, address, phone, etc.)
export const updateUserHandler = async (req, res) => {
  const { username } = req.body; // or use userId if passed
  const updates = req.body; // {fullName, address, phone, etc.}
  delete updates.username; // Avoid overwriting username

  if (!username) {
    return res.status(400).json({ message: 'Username diperlukan' });
  }

  try {
    // Find user by username
    const userSnapshot = await getDocs(
      query(collection(db, 'users'), where('username', '==', username))
    );
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    const userDoc = userSnapshot.docs[0];

    // Update fields
    await updateDoc(doc(db, 'users', userDoc.id), updates);

    res.status(200).json({ 
      message: 'Data user berhasil diperbarui. Silahkan login kembali.' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saat update data user', error: error.message });
  }
};

export default updateUserHandler;

