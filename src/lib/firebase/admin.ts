// src/lib/firebase/admin.ts
import { getApps, initializeApp, applicationDefault, cert, App } from 'firebase-admin/app';

let _app: App | null = null;

export function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let credential;
  if (saJson) credential = cert(JSON.parse(saJson));
  else if (saPath) credential = cert(saPath);
  else credential = applicationDefault();

  _app = initializeApp({ credential, projectId });
  return _app;
}
