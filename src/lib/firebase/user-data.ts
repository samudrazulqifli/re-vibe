import {
  doc, setDoc, getDoc, collection, getDocs,
  query, orderBy, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getDb } from './client';
import type { AnalysisRecord } from '@/src/lib/types';

export async function ensureUserDoc(user: User): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
    return;
  }
  await setDoc(ref, {
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
}

export async function addAnalysis(uid: string, record: AnalysisRecord): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'users', uid, 'analyses', record.id);
  await setDoc(ref, record);
}

export async function getAnalyses(uid: string): Promise<AnalysisRecord[]> {
  const db = getDb();
  const col = collection(db, 'users', uid, 'analyses');
  const snap = await getDocs(query(col, orderBy('timestamp', 'desc')));
  return snap.docs.map((d) => d.data() as AnalysisRecord);
}

export async function getAnalysisById(uid: string, id: string): Promise<AnalysisRecord | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', uid, 'analyses', id));
  return snap.exists() ? (snap.data() as AnalysisRecord) : null;
}

export async function deleteAnalysis(uid: string, id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'users', uid, 'analyses', id));
}

export async function calculateStats(uid: string): Promise<{
  total: number;
  savings: number;
  itemsSold: number;
}> {
  const records = await getAnalyses(uid);
  let savings = 0;
  for (const record of records) {
    const rec = record.recommendation;
    if (rec && rec.recommendation === 'service') {
      const avgService = (rec.serviceCostMin + rec.serviceCostMax) / 2;
      const avgNew = (rec.newProductPriceMin + rec.newProductPriceMax) / 2;
      savings += Math.max(0, avgNew - avgService);
    }
  }
  return {
    total: records.length,
    savings,
    itemsSold: records.filter((r) => r.selectedAction === 'buy').length,
  };
}
