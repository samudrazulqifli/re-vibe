// src/lib/firebase/migrate.ts
import { writeBatch, doc } from 'firebase/firestore';
import { getDb } from './client';
import type { AnalysisRecord } from '@/src/lib/types';

const HISTORY_KEY = 're-vibe-history';
const flagKey = (uid: string) => `rv-migrated-${uid}`;

export async function migrateLocalHistory(uid: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(flagKey(uid))) return 0;

  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) {
    localStorage.setItem(flagKey(uid), '1');
    return 0;
  }

  let records: AnalysisRecord[] = [];
  try {
    records = JSON.parse(raw);
  } catch (e) {
    console.error('migrate: cannot parse legacy history', e);
    localStorage.setItem(flagKey(uid), '1');
    return 0;
  }

  if (!Array.isArray(records) || records.length === 0) {
    localStorage.setItem(flagKey(uid), '1');
    return 0;
  }

  const db = getDb();
  const batch = writeBatch(db);
  for (const r of records) {
    if (!r?.id) continue;
    batch.set(doc(db, 'users', uid, 'analyses', r.id), r);
  }
  await batch.commit();
  localStorage.setItem(flagKey(uid), '1');
  return records.length;
}
