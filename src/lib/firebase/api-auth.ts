// src/lib/firebase/api-auth.ts
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './admin';

export async function requireAuthedUser(req: Request): Promise<{ uid: string } | NextResponse> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (err) {
    console.error('verifyIdToken failed:', err);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
