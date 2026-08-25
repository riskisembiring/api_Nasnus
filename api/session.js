import { randomUUID } from 'node:crypto';
import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase-config.js';

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;

  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
};

export const createActiveSession = async (userDocId) => {
  const sessionId = randomUUID();

  await updateDoc(doc(db, 'users', userDocId), {
    activeSessionId: sessionId,
    activeSessionCreatedAt: serverTimestamp(),
  });

  return sessionId;
};

export const clearActiveSession = async (userDocId) => {
  await updateDoc(doc(db, 'users', userDocId), {
    activeSessionId: deleteField(),
    activeSessionCreatedAt: deleteField(),
  });
};

export const requireActiveSession = async (req, res) => {
  const sessionId = getBearerToken(req);

  if (!sessionId) {
    res.status(401).json({
      message: 'Session diperlukan. Silahkan login kembali.',
      code: 'SESSION_REQUIRED',
    });
    return false;
  }

  const userSnapshot = await getDocs(
    query(collection(db, 'users'), where('activeSessionId', '==', sessionId))
  );

  if (userSnapshot.empty) {
    res.status(401).json({
      message: 'Session tidak berlaku. Silahkan login kembali.',
      code: 'SESSION_EXPIRED',
    });
    return false;
  }

  const userDoc = userSnapshot.docs[0];
  const user = userDoc.data();

  if (!user.isActive) {
    res.status(403).json({
      message: 'Akun tidak aktif. Hubungi admin.',
      code: 'ACCOUNT_INACTIVE',
    });
    return false;
  }

  req.authUser = {
    id: userDoc.id,
    ...user,
  };

  return true;
};

export const validateSessionHandler = async (req, res) => {
  const isValid = await requireActiveSession(req, res);

  if (!isValid) {
    return;
  }

  return res.status(200).json({
    message: 'Session masih aktif',
    username: req.authUser.username,
    role: req.authUser.userRole,
  });
};

export const logoutHandler = async (req, res) => {
  const isValid = await requireActiveSession(req, res);

  if (!isValid) {
    return;
  }

  await clearActiveSession(req.authUser.id);

  return res.status(200).json({
    message: 'Berhasil logout',
  });
};
