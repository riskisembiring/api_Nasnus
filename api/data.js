import { collection, addDoc, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

// Add Data Handler
export const addDataHandler = async (req, res) => {
  try {
    // Menambahkan dokumen baru ke koleksi 'data'
    const docRef = await addDoc(collection(db, 'data'), req.body);
    res.status(201).json({ message: 'Data berhasil disimpan!', id: docRef.id });
  } catch (error) {
    // Menangani error saat menyimpan data
    res.status(500).json({ message: 'Error saat menyimpan data', error: error.message });
  }
};

// Update Data Handler
export const updateDataHandler = async (req, res) => {
  const { id } = req.params; // ID dokumen yang akan diperbarui

  try {
    // Referensi dokumen berdasarkan ID
    const docRef = doc(db, 'data', id);
    const docSnap = await getDoc(docRef);

    // Jika dokumen tidak ditemukan
    if (!docSnap.exists()) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    // Memperbarui dokumen dengan data baru dari request body
    await updateDoc(docRef, req.body);
    res.status(200).json({ message: 'Data berhasil diperbarui' });
  } catch (error) {
    // Menangani error saat memperbarui data
    res.status(500).json({ message: 'Error saat memperbarui data', error: error.message });
  }
};

// Get Data Handler
export const getDataHandler = async (req, res) => {
  try {
    // Mengambil semua dokumen dari koleksi 'data'
    const snapshot = await getDocs(collection(db, 'data'));
    const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Mengembalikan data sebagai response
    res.status(200).json(dataList);
  } catch (error) {
    // Menangani error saat mengambil data
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data', error: error.message });
  }
};
