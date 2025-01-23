import bcrypt from 'bcrypt';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Register User
const addUserHandler = async (req, res) => {
  const { username, userRole, password } = req.body;

  if (!username || !userRole || !password) {
    return res.status(400).json({ message: 'Semua field harus diisi!' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const docRef = await addDoc(collection(db, 'users'), { username, userRole, password: hashedPassword });
    res.status(200).json({ message: 'Data berhasil disimpan!', id: docRef.id });
  } catch (error) {
    res.status(500).json({ message: 'Error saat menyimpan data', error: error.message });
  }
};

export default addUserHandler;
