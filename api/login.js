// api/login.js
import bcrypt from 'bcrypt';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password diperlukan' });
    }

    try {
      const userSnapshot = await getDocs(query(collection(db, 'users'), where("username", "==", username)));
      const user = userSnapshot.docs.map(doc => doc.data()).find(user => user.username === username);

      if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) return res.status(401).json({ message: 'Password salah' });

      res.status(200).json({ message: 'Login berhasil', role: user.userRole });
    } catch (error) {
      res.status(500).json({ message: 'Terjadi kesalahan saat login', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
