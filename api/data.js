import { collection, addDoc, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Add Data
const addDataHandler = async (req, res) => {
  try {
    const docRef = await addDoc(collection(db, 'data'), req.body);
    res.status(201).json({ message: 'Data berhasil disimpan!', id: docRef.id });
  } catch (error) {
    res.status(500).json({ message: 'Error saat menyimpan data', error: error.message });
  }
}

// Update Data
const updateDataHandler = async (req, res) => {
  const { id } = req.query; // Change from params to query for Vercel compatibility

  try {
    const docRef = doc(db, 'data', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    await updateDoc(docRef, req.body);
    res.status(200).json({ message: 'Data berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Error saat memperbarui data', error: error.message });
  }
}

// Get Data
const getDataHandler = async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, 'data'));
    const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(dataList);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data', error: error.message });
  }
}

// Ekspor handler sebagai fungsi default untuk Vercel
export default async (req, res) => {
  if (req.method === 'POST') {
    return addDataHandler(req, res);
  } else if (req.method === 'PUT') {
    return updateDataHandler(req, res);
  } else if (req.method === 'GET') {
    return getDataHandler(req, res);
  }

  res.status(405).json({ message: 'Metode tidak diizinkan' });
};
