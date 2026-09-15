import { gzipSync, gunzipSync } from 'node:zlib';
import {
  collection, doc, getDoc, getDocs, getCountFromServer,
  query, orderBy, limit, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

const historyCollection = collection(db, 'dashboardUploadHistory');
const CHUNK_SIZE = 600000;

// Store compressed JSON in chunks to avoid Firestore's document size limit
// and preserve nested arrays in dashboard data.
export function encodeDashboard(dashboard) {
  const encoded = gzipSync(Buffer.from(JSON.stringify(dashboard))).toString('base64');
  return Array.from({ length: Math.ceil(encoded.length / CHUNK_SIZE) }, (_, index) =>
    encoded.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
}

export function decodeDashboard(chunks) {
  return JSON.parse(gunzipSync(Buffer.from(chunks.join(''), 'base64')).toString('utf8'));
}

export async function saveDashboardHistory(dashboard) {
  const chunks = encodeDashboard(dashboard);
  if (chunks.length > 12) {
    throw new Error('Data dashboard terlalu besar untuk disimpan dalam history.');
  }
  const ref = doc(historyCollection);
  const metadata = {
    fileName: dashboard.fileName,
    uploadedAt: new Date().toISOString(),
    totalRows: dashboard.rawDashboard.rows.length,
  };
  const batch = writeBatch(db);
  batch.set(ref, { ...metadata, chunkCount: chunks.length });
  chunks.forEach((payload, index) => {
    batch.set(doc(ref, 'chunks', String(index)), { payload });
  });
  // Metadata and detail are committed together; failed uploads leave no history.
  await batch.commit();
  return { id: ref.id, ...metadata };
}

export const historyStore = {
  async list(page, pageSize) {
    const count = await getCountFromServer(historyCollection);
    const total = count.data().count;
    const offset = (page - 1) * pageSize;
    if (offset >= total) return { data: [], total };
    const snapshot = await getDocs(query(
      historyCollection, orderBy('uploadedAt', 'desc'), limit(page * pageSize),
    ));
    return {
      total,
      data: snapshot.docs.slice(offset).map((item) => {
        const { fileName, uploadedAt, totalRows } = item.data();
        return { id: item.id, fileName, uploadedAt, totalRows };
      }),
    };
  },
  async get(id) {
    const ref = doc(historyCollection, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const { chunkCount, ...metadata } = snapshot.data();
    const chunks = await Promise.all(Array.from({ length: chunkCount }, async (_, index) => {
      const chunk = await getDoc(doc(ref, 'chunks', String(index)));
      if (!chunk.exists()) throw new Error('Data history tidak lengkap.');
      return chunk.data().payload;
    }));
    return { history: { id, ...metadata }, data: decodeDashboard(chunks) };
  },
};

export function createHistoryHandlers(store = historyStore) {
  return {
    async list(req, res) {
      const params = new URL(req.url, 'http://localhost').searchParams;
      const page = Number(params.get('page') ?? 1);
      const pageSize = Number(params.get('pageSize') ?? 10);
      if (!Number.isSafeInteger(page) || page < 1 ||
          !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
          !Number.isSafeInteger(page * pageSize)) {
        return res.status(400).json({ message: 'page harus bilangan bulat positif dan pageSize antara 1 sampai 100.' });
      }
      const { data, total } = await store.list(page, pageSize);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return res.status(200).json({
        data,
        pagination: { page, pageSize, total, totalPages, hasPreviousPage: page > 1, hasNextPage: page < totalPages },
      });
    },
    async detail(req, res) {
      const id = req.params.id;
      if (!/^[a-zA-Z0-9]{20}$/.test(id)) {
        return res.status(400).json({ message: 'ID history tidak valid.' });
      }
      const result = await store.get(id);
      if (!result) return res.status(404).json({ message: 'History upload tidak ditemukan.' });
      return res.status(200).json(result);
    },
  };
}

export const dashboardHistoryHandlers = createHistoryHandlers();
