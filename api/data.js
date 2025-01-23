// api/data.js
import { collection, addDoc, updateDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const docRef = await addDoc(collection(db, 'data'), req.body);
      res.status(201).json({ message: 'Data berhasil disimpan!', id: docRef.id });
    } catch (error) {
      res.status(500).json({ message: 'Error saat menyimpan data', error: error.message });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    try {
      const docRef = doc(db, 'data', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

      await updateDoc(docRef, req.body);
      res.status(200).json({ message: 'Data berhasil diperbarui' });
    } catch (error) {
      res.status(500).json({ message: 'Error saat memperbarui data', error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const snapshot = await getDocs(collection(db, 'data'));
      const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(dataList);
    } catch (error) {
      res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
