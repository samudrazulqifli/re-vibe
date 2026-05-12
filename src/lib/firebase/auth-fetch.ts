// src/lib/firebase/auth-fetch.ts
import { getFirebaseAuth } from './client';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = getFirebaseAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
