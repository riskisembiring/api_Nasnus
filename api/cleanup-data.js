import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

const COLLECTIONS = ['data', 'dataMak', 'users'];

export const cleanupDataHandler = async (req, res) => {
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 bulan = 90 hari

    let totalDeleted = 0;
    const errors = [];
    const results = {};

    for (const collName of COLLECTIONS) {
      const q = query(collection(db, collName), where('createdAt', '<', threeMonthsAgo));
      const querySnapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnap of querySnapshot.docs) {
        try {
          if (collName === 'users') {
            // Soft delete untuk users: set isActive false
            await updateDoc(doc(db, collName, docSnap.id), { isActive: false });
          } else {
            await deleteDoc(doc(db, collName, docSnap.id));
          }
          deletedCount++;
        } catch (deleteError) {
          errors.push(`Gagal proses ${collName}/${docSnap.id}: ${deleteError.message}`);
        }
      }

      results[collName] = deletedCount;
      totalDeleted += deletedCount;
    }

    return res.status(200).json({
      message: `Pembersihan data selesai. Total diproses: ${totalDeleted} dokumen (users: soft deactive).`,
      results,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Error cleanup data:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat membersihkan data',
      error: error.message,
    });
  }
};

