import express from 'express';
import bcrypt from 'bcrypt';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

const app = express();
app.use(express.json());

// Register User Handler
export const addUserHandler = async (req, res) => {
const { username, userRole, password, email, phone, fullName, address } = req.body;

  // Validasi input
if (!username || !userRole || !password) {
    return res.status(400).json({ message: 'Username, userRole, dan password wajib diisi! Email dan phone opsional.' });
  }

  try {
    // Hashing password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Menyimpan data pengguna ke Firestore
    const docRef = await addDoc(collection(db, 'users'), {
      username,
      userRole,
      password: hashedPassword,
      email: email || null,
      phone: phone || null,
      fullName: fullName || null,
      address: address || null,
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date(),
      isActive: true
    });

    // Mengembalikan response sukses
    res.status(200).json({
      message: 'Data berhasil disimpan!',
      id: docRef.id,
    });
  } catch (error) {
    // Menangani error saat menyimpan data
    res.status(500).json({
      message: 'Error saat menyimpan data',
      error: error.message,
    });
  }
};

// Ekspor handler sebagai fungsi default untuk Vercel
export default async (req, res) => {
  return addUserHandler(req, res);
};
