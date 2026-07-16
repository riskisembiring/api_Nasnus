import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

const COLLECTIONS = ['data', 'dataMak', 'users'];

const parseDateValue = (value) => {
  if (!value) return null;

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const [datePart, timePart = '00:00:00'] = value.trim().split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map(Number);

    if (!day || !month || !year) return null;

    const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
};

export const cleanupDataHandler = async (req, res) => {
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 bulan = 90 hari

    let totalDeleted = 0;
    const errors = [];
    const results = {};
    const skipped = {};

    for (const collName of COLLECTIONS) {
      const querySnapshot = await getDocs(collection(db, collName));
      let deletedCount = 0;
      let skippedCount = 0;

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const documentDate = parseDateValue(data.tanggal || data.createdAt);

        if (!documentDate || documentDate >= threeMonthsAgo) {
          skippedCount++;
          continue;
        }

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
      skipped[collName] = skippedCount;
      totalDeleted += deletedCount;
    }

    return res.status(200).json({
      message: `Pembersihan data selesai. Total diproses: ${totalDeleted} dokumen (users: soft deactive).`,
      results,
      skipped,
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

