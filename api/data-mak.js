import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js'; // Pastikan path ini sesuai dengan konfigurasi Anda

export const addDataMakHandler = async (req, res) => {
    const {
      namaDebitur,
      nomorMak,
      tanggalMak,
      namaAccOfficer,
      noTelpDeb,
      ...otherFields
    } = req.body;
  
    // Validasi data utama yang wajib
    if (!namaDebitur || !nomorMak || !tanggalMak || !namaAccOfficer || !noTelpDeb) {
      return res.status(400).json({ message: 'Data tidak lengkap atau wajib diisi.' });
    }
  
    try {
      // Template data untuk Firestore
      const makData = {
        namaDebitur,
        nomorMak,
        tanggalMak,
        namaAccOfficer,
        noTelpDeb,
        ...otherFields, // Properti tambahan dari req.body
        createdAt: new Date(),
      };
  
      // Simpan ke Firestore
      const docRef = await addDoc(collection(db, 'dataMak'), makData);
  
      return res.status(201).json({
        message: 'Data MAK berhasil ditambahkan',
        id: docRef.id,
      });
    } catch (error) {
      console.error('Error adding data MAK:', error);
      return res.status(500).json({
        message: 'Terjadi kesalahan pada server',
        error: error.message,
      });
    }
  };

  export const updateDataMakHandler = async (req, res) => {
    const { id } = req.params;  // Mengambil ID dari params
  
    if (!id) {
        return res.status(400).json({ message: 'ID data diperlukan untuk update.' });
    }
  
    const updatedData = req.body; // Data yang diupdate
  
    try {
        const docRef = doc(db, 'dataMak', id);  // Mengambil dokumen berdasarkan ID
        const docSnap = await getDoc(docRef);  // Memeriksa apakah dokumen ada
  
        if (!docSnap.exists()) {
            return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
        }
  
        // Jika dokumen ditemukan, update data
        await updateDoc(docRef, updatedData);
  
        return res.status(200).json({
            message: 'Data MAK berhasil diperbarui',
            id: id,
        });
    } catch (error) {
        console.error('Error updating data MAK:', error);
        return res.status(500).json({
            message: 'Terjadi kesalahan pada server',
            error: error.message,
        });
    }
  };

// Fungsi untuk mengambil data MAK
export const getDataMakHandler = async (req, res) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'dataMak'));
      const dataMak = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // Kirimkan respons sukses
      return res.status(200).json({
        message: 'Data MAK berhasil diambil',
        data: dataMak,
      });
    } catch (error) {
      // Tangani error
      console.error('Error getting data MAK:', error);
      return res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
    }
  };
    