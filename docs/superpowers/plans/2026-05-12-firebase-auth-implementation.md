# Firebase Auth + Per-User Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the Re-Vibe Next.js PWA behind Google Sign-In, store analysis history per-user in Firestore, and replace the hardcoded profile data with the signed-in user's Google profile.

**Architecture:** Firebase Auth (Google provider only) on the client; `firebase-admin` `verifyIdToken()` on Next.js API routes; Firestore subcollection `users/{uid}/analyses/{id}` for history. A client-side `AuthGuard` in `app/layout.tsx` enforces the route whitelist. ADC (already set via `gcloud auth application-default login`) is the default server credential; service-account JSON via env is the fallback for production.

**Tech Stack:** Next.js 15.5 App Router, React 19, Firebase v11 client SDK, firebase-admin v13, Firestore, existing Zustand store, existing react-hot-toast for errors.

**Reference spec:** [`docs/superpowers/specs/2026-05-12-firebase-auth-design.md`](../specs/2026-05-12-firebase-auth-design.md)

**Testing policy:** The repo has no test framework and the spec mandates manual e2e (Section 11). Every task ends with a manual verification step run against `npm run dev` on http://localhost:3000. Do not introduce a test framework.

---

## File map

**Create:**
- `src/lib/firebase/client.ts` — browser SDK init
- `src/lib/firebase/admin.ts` — admin SDK init
- `src/lib/firebase/auth-context.tsx` — `<AuthProvider>` + `useAuth()`
- `src/lib/firebase/user-data.ts` — Firestore CRUD (analyses, user doc)
- `src/lib/firebase/migrate.ts` — localStorage → Firestore migration
- `src/lib/firebase/api-auth.ts` — server-side `requireAuthedUser()`
- `src/lib/firebase/auth-fetch.ts` — client helper that attaches `Authorization: Bearer <idToken>`
- `src/components/auth/AuthGuard.tsx`
- `src/components/auth/GoogleSignInButton.tsx`
- `app/welcome/page.tsx`
- `app/login/page.tsx`
- `firestore.rules`
- `firestore.indexes.json`

**Modify:**
- `package.json` (deps)
- `.env.example`
- `next.config.mjs`
- `app/layout.tsx`
- `src/components/Home.tsx`
- `app/profile/page.tsx`
- `app/history/page.tsx`
- `app/history/[id]/page.tsx`
- `app/diy/page.tsx`, `app/sell/page.tsx`, `app/recommend/page.tsx`, `app/shop/page.tsx`, `app/analyze/page.tsx`, `app/upload/preview/page.tsx` (auth header on fetch)
- `src/lib/store.ts`
- `src/lib/history.ts`
- `app/api/upload/route.ts`, `app/api/analyze/route.ts`, `app/api/recommend/route.ts`, `app/api/diy/route.ts`, `app/api/products/route.ts`, `app/api/scrap-value/route.ts` (token verify)

---

## Task 1: Install dependencies and prepare env

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `next.config.mjs`

- [ ] **Step 1: Install runtime deps**

```bash
cd /Users/samudrazulqifli/re-vibe
npm install firebase firebase-admin
```

- [ ] **Step 2: Add the `NEXT_PUBLIC_FIREBASE_*` keys to `next.config.mjs`**

Open `next.config.mjs` and replace the `env` block so it reads:

```js
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
```

- [ ] **Step 3: Add placeholders to `.env.example`**

Append at the bottom:

```bash

# Firebase Client SDK (browser). Get from Firebase Console → Project Settings → Your apps.
NEXT_PUBLIC_FIREBASE_API_KEY="MY_FIREBASE_WEB_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<project-id>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<firebase-project-id>"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<firebase-project-id>.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="MY_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="MY_APP_ID"

# Firebase Admin SDK (server). Either GOOGLE_APPLICATION_CREDENTIALS (path),
# GOOGLE_APPLICATION_CREDENTIALS_JSON (inline JSON), or rely on ADC (gcloud).
```

- [ ] **Step 4: Verify `.env` already has the real values**

```bash
grep "NEXT_PUBLIC_FIREBASE" /Users/samudrazulqifli/re-vibe/.env | wc -l
```

Expected: `6`. If less, stop and ask the user to fill `.env`.

- [ ] **Step 5: Restart dev server and confirm it boots**

```bash
pkill -f "next dev" 2>/dev/null; sleep 2
cd /Users/samudrazulqifli/re-vibe && npm run dev > /tmp/revibe-dev.log 2>&1 &
sleep 7; tail -5 /tmp/revibe-dev.log
```

Expected: `✓ Ready in <Xs>` and no errors mentioning firebase or missing modules.

- [ ] **Step 6: Commit**

```bash
cd /Users/samudrazulqifli/re-vibe
git add package.json package-lock.json next.config.mjs .env.example
git commit -m "chore(auth): install firebase deps and expose NEXT_PUBLIC_FIREBASE_* to client"
```

---

## Task 2: Firebase client SDK init

**Files:**
- Create: `src/lib/firebase/client.ts`

- [ ] **Step 1: Create the client init module**

```ts
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 2: Verify no TS errors**

```bash
cd /Users/samudrazulqifli/re-vibe
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: no errors mentioning `src/lib/firebase/client.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/client.ts
git commit -m "feat(auth): add firebase client init module"
```

---

## Task 3: AuthProvider + useAuth hook

**Files:**
- Create: `src/lib/firebase/auth-context.tsx`

- [ ] **Step 1: Create the context**

```tsx
// src/lib/firebase/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from './client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const logOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 2: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | head -10
```

Expected: no errors in `auth-context.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/auth-context.tsx
git commit -m "feat(auth): add AuthProvider and useAuth hook"
```

---

## Task 4: AuthGuard component + wrap layout

**Files:**
- Create: `src/components/auth/AuthGuard.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create AuthGuard**

```tsx
// src/components/auth/AuthGuard.tsx
"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/lib/firebase/auth-context';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/welcome', '/onboarding', '/login'];

function hasSeenWelcome(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rv-welcome-seen') === '1';
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(path);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace(hasSeenWelcome() ? '/login' : '/welcome');
    } else if (user && isPublic) {
      router.replace('/');
    }
  }, [loading, user, isPublic, router]);

  if (loading || (!user && !isPublic) || (user && isPublic)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap layout — read current first**

```bash
cat /Users/samudrazulqifli/re-vibe/app/layout.tsx
```

Note the BottomNav line and Toaster/PageTransition wrapping.

- [ ] **Step 3: Replace the body content in `app/layout.tsx`**

Find this block:

```tsx
        <div className="w-full max-w-[440px] bg-white shadow-2xl relative flex flex-col min-h-screen">
          <Toaster position="top-center" />
          <PageTransition>
            {children}
          </PageTransition>
          <BottomNav />
        </div>
```

Replace with:

```tsx
        <AuthProvider>
          <div className="w-full max-w-[440px] bg-white shadow-2xl relative flex flex-col min-h-screen">
            <Toaster position="top-center" />
            <AuthGuard>
              <PageTransition>
                {children}
              </PageTransition>
              <BottomNav />
            </AuthGuard>
          </div>
        </AuthProvider>
```

Add the imports at the top of the file, near the other imports:

```tsx
import { AuthProvider } from "@/src/lib/firebase/auth-context";
import { AuthGuard } from "@/src/components/auth/AuthGuard";
```

- [ ] **Step 4: Restart dev and load `/` in the browser**

```bash
pkill -f "next dev" 2>/dev/null; sleep 2
cd /Users/samudrazulqifli/re-vibe && npm run dev > /tmp/revibe-dev.log 2>&1 &
sleep 7
```

Open http://localhost:3000/ in a private browser window. Expected: instant redirect to http://localhost:3000/welcome (404 is OK — welcome page does not exist yet, the redirect itself proves the guard works).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthGuard.tsx app/layout.tsx
git commit -m "feat(auth): add AuthGuard and wire it into root layout"
```

---

## Task 5: Welcome page

**Files:**
- Create: `app/welcome/page.tsx`

- [ ] **Step 1: Create `/welcome` page**

```tsx
// app/welcome/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Sprout, ScanLine } from 'lucide-react';

const SLIDES = [
  {
    icon: ScanLine,
    title: 'Selamat Datang di Re-Vibe',
    subtitle: 'Foto barang rusak kamu. AI kami yang akan bantu putuskan langkah terbaik.',
    color: 'bg-primary',
  },
  {
    icon: Sparkles,
    title: 'AI Vision Analysis',
    subtitle: 'Deteksi kerusakan otomatis dengan satu jepretan.',
    color: 'bg-amber-500',
  },
  {
    icon: Sprout,
    title: 'Sustainability First',
    subtitle: 'Setiap perbaikan mengurangi sampah elektronik di Indonesia.',
    color: 'bg-secondary',
  },
];

function markWelcomeSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rv-welcome-seen', '1');
  }
}

export default function WelcomePage() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();
  const slide = SLIDES[current];
  const Icon = slide.icon;

  const goLogin = () => {
    markWelcomeSeen();
    router.push('/login');
  };
  const goOnboarding = () => {
    markWelcomeSeen();
    router.push('/onboarding');
  };
  const next = () => {
    if (current === SLIDES.length - 1) goLogin();
    else setCurrent(current + 1);
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-10 pt-16 pb-8 text-center gap-10">
        <h1 className="text-2xl font-black text-primary tracking-tight">Re-Vibe</h1>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-8"
          >
            <div className={`w-48 h-48 rounded-[56px] flex items-center justify-center text-white shadow-2xl ${slide.color}`}>
              <Icon size={84} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-3 max-w-xs">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{slide.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{slide.subtitle}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-10 flex flex-col gap-6">
        <div className="flex gap-2 justify-center">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-primary' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full bg-primary text-white font-black py-5 rounded-[28px] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          <span>{current === SLIDES.length - 1 ? 'Mulai Sekarang' : 'Selanjutnya'}</span>
          <ArrowRight size={20} />
        </button>

        <button
          onClick={goOnboarding}
          className="text-xs font-bold text-primary tracking-wide hover:underline"
        >
          Pelajari Cara Kerja →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verify**

Open http://localhost:3000/welcome (fresh incognito window).
- See 3 slides with carousel dots.
- "Selanjutnya" advances slides; on slide 3 it becomes "Mulai Sekarang".
- "Mulai Sekarang" → navigates to `/login` (404 — Task 6 fixes).
- "Pelajari Cara Kerja" → navigates to `/onboarding` (existing 3-slide page works, but tries to return to `/` afterward which redirects back to `/welcome` since not logged in — expected for now).

- [ ] **Step 3: Commit**

```bash
git add app/welcome/page.tsx
git commit -m "feat(auth): add /welcome landing page with 3-slide carousel"
```

---

## Task 6: Google Sign-In button + /login page

**Files:**
- Create: `src/components/auth/GoogleSignInButton.tsx`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the Google button component**

```tsx
// src/components/auth/GoogleSignInButton.tsx
"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/src/lib/firebase/auth-context';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const SILENT_ERROR_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch (err: any) {
      if (!SILENT_ERROR_CODES.has(err?.code)) {
        toast.error('Koneksi bermasalah, coba lagi.');
      }
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-900 font-bold py-5 rounded-[24px] flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      )}
      <span>{loading ? 'Sedang masuk...' : 'Masuk dengan Google'}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create `/login` page**

```tsx
// app/login/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GoogleSignInButton } from '@/src/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      <div className="p-6">
        <button
          onClick={() => router.push('/welcome')}
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700"
          aria-label="Kembali"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-10 text-center">
        <div className="flex flex-col gap-3 max-w-xs">
          <h1 className="text-3xl font-black text-primary tracking-tight">Re-Vibe</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Masuk untuk mulai analisa barang kamu dan menyimpan riwayat di akun.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <GoogleSignInButton />
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs">
          Dengan masuk, kamu menyetujui Syarat & Kebijakan Privasi Re-Vibe.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verify Google sign-in**

Open http://localhost:3000/login.
- See logo, subtitle, "Masuk dengan Google" button.
- Click button → Google popup opens → choose account → popup closes → redirected to `/`.
- After sign-in, AuthGuard renders the home page (no redirect loop).

If popup is blocked by browser, allow popups for localhost and retry. If domain is rejected, check Firebase Console → Authentication → Settings → Authorized domains includes `localhost`.

- [ ] **Step 4: Verify sign-out path**

In DevTools console:

```js
firebase.auth().signOut?.() // or:
import('firebase/auth').then(m => m.signOut(m.getAuth()))
```

Easier: just reload the page after closing all browser tabs. Or use the upcoming Logout button (Task 12). For now, manually clear `IndexedDB → firebaseLocalStorageDb` in DevTools and reload — should redirect to `/login` (because `rv-welcome-seen` is now set).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/GoogleSignInButton.tsx app/login/page.tsx
git commit -m "feat(auth): add Google sign-in button and /login page"
```

---

## Task 7: Firestore user-data module (create user doc + analysis CRUD)

**Files:**
- Create: `src/lib/firebase/user-data.ts`

- [ ] **Step 1: Create the module**

```ts
// src/lib/firebase/user-data.ts
import {
  doc, setDoc, getDoc, collection, addDoc, getDocs,
  query, orderBy, deleteDoc, serverTimestamp, Timestamp
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
```

- [ ] **Step 2: Wire `ensureUserDoc` into auth-context**

Edit `src/lib/firebase/auth-context.tsx`. Find:

```tsx
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
```

Replace with:

```tsx
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try { await ensureUserDoc(u); } catch (e) { console.error('ensureUserDoc failed', e); }
      }
      setUser(u);
      setLoading(false);
    });
```

Add the import at top of `auth-context.tsx`:

```tsx
import { ensureUserDoc } from './user-data';
```

- [ ] **Step 3: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: no errors mentioning the new module.

- [ ] **Step 4: Manual verify**

Reload http://localhost:3000/login → sign in. Then in Firebase Console → Firestore Data, expect a new document at `users/{your-uid}` with `displayName`, `email`, `photoURL`, `createdAt`, `lastLoginAt`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/user-data.ts src/lib/firebase/auth-context.tsx
git commit -m "feat(auth): create users/{uid} doc on sign-in and add Firestore CRUD"
```

---

## Task 8: Rewrite store + history.ts to be Firestore-backed

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/lib/history.ts`

- [ ] **Step 1: Replace `src/lib/store.ts` to drop `analysisHistory` state**

Read the file first to see current shape, then replace it with:

```ts
// src/lib/store.ts
import { create } from 'zustand';
import { AnalysisRecord, Recommendation } from './types';

interface ReVibeState {
  uploadedPhoto: File | null;
  uploadedImageUrl: string | null;
  photoPreviewUrl: string | null;
  userDescription: string;

  currentAnalysis: Partial<AnalysisRecord> | null;
  recommendation: Recommendation | null;
  selectedAction: 'service' | 'diy' | 'buy' | null;

  setPhoto: (file: File | null, url: string | null) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setDescription: (desc: string) => void;
  setAnalysis: (analysis: Partial<AnalysisRecord>) => void;
  setRecommendation: (rec: Recommendation) => void;
  setSelectedAction: (action: 'service' | 'diy' | 'buy' | null) => void;
  resetFlow: () => void;
}

export const useReVibeStore = create<ReVibeState>((set) => ({
  uploadedPhoto: null,
  uploadedImageUrl: null,
  photoPreviewUrl: null,
  userDescription: '',
  currentAnalysis: null,
  recommendation: null,
  selectedAction: null,

  setPhoto: (file, url) => set({ uploadedPhoto: file, photoPreviewUrl: url }),
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
  setDescription: (desc) => set({ userDescription: desc }),
  setAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setRecommendation: (rec) => set({ recommendation: rec }),
  setSelectedAction: (action) => set({ selectedAction: action }),
  resetFlow: () => set({
    uploadedPhoto: null,
    uploadedImageUrl: null,
    photoPreviewUrl: null,
    userDescription: '',
    currentAnalysis: null,
    recommendation: null,
    selectedAction: null,
  }),
}));
```

- [ ] **Step 2: Replace `src/lib/history.ts` to be a thin re-export of `user-data.ts`**

```ts
// src/lib/history.ts
export {
  addAnalysis as saveAnalysis,
  getAnalyses as getHistory,
  getAnalysisById,
  deleteAnalysis,
  calculateStats,
} from './firebase/user-data';
```

All call sites that used to call `saveAnalysis(record)` now need to pass `(uid, record)`. Task 9 fixes the callers. For now, TS will surface every broken call site — that is intentional.

- [ ] **Step 3: TS check (will reveal callers that need fixing)**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | tee /tmp/tsc.log | head -60
```

Note every `error TS2554` (wrong number of arguments) — those are the callers Task 9 covers.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store.ts src/lib/history.ts
git commit -m "refactor(history): replace localStorage history with Firestore-backed CRUD"
```

---

## Task 9: Update /history pages to use Firestore

**Files:**
- Modify: `app/history/page.tsx`
- Modify: `app/history/[id]/page.tsx`

- [ ] **Step 1: Read both files**

```bash
cat /Users/samudrazulqifli/re-vibe/app/history/page.tsx | head -40
cat /Users/samudrazulqifli/re-vibe/app/history/\[id\]/page.tsx | head -40
```

Identify each call to `getHistory()`, `getAnalysisById(id)`, `deleteAnalysis(id)`.

- [ ] **Step 2: Update `app/history/page.tsx`**

At the top, add:

```tsx
import { useAuth } from '@/src/lib/firebase/auth-context';
```

Replace the data-loading effect (currently `setHistory(getHistory())` or similar) with:

```tsx
const { user } = useAuth();
const [history, setHistory] = useState<AnalysisRecord[]>([]);
const [loadingHistory, setLoadingHistory] = useState(true);

useEffect(() => {
  if (!user) return;
  let cancelled = false;
  setLoadingHistory(true);
  getHistory(user.uid)
    .then((rows) => { if (!cancelled) setHistory(rows); })
    .catch((e) => { console.error(e); toast.error('Gagal memuat riwayat'); })
    .finally(() => { if (!cancelled) setLoadingHistory(false); });
  return () => { cancelled = true; };
}, [user]);
```

Replace any `deleteAnalysis(id)` call with:

```tsx
if (!user) return;
await deleteAnalysis(user.uid, id);
setHistory((rows) => rows.filter((r) => r.id !== id));
```

Make sure `react-hot-toast` is imported if not already. While editing, also render a small empty/loading state when `loadingHistory && history.length === 0`.

- [ ] **Step 3: Update `app/history/[id]/page.tsx` the same way**

Replace `const record = getAnalysisById(id)` (synchronous) with async fetch:

```tsx
const { user } = useAuth();
const [record, setRecord] = useState<AnalysisRecord | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!user) return;
  getAnalysisById(user.uid, id)
    .then(setRecord)
    .catch((e) => { console.error(e); toast.error('Gagal memuat detail'); })
    .finally(() => setLoading(false));
}, [user, id]);

if (loading) return /* existing loading UI or a simple spinner */;
if (!record) return /* existing "not found" UI */;
```

- [ ] **Step 4: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```

Expected: errors related to `app/history/*` should be gone. Errors from `analyze/page.tsx` (which calls `saveAnalysis`) are addressed in Task 10.

- [ ] **Step 5: Manual verify**

Reload http://localhost:3000/history while logged in → shows empty state (no analyses yet) without crashing.

- [ ] **Step 6: Commit**

```bash
git add app/history/page.tsx 'app/history/[id]/page.tsx'
git commit -m "feat(history): read history pages from Firestore per-user"
```

---

## Task 10: Update analyze/recommend/etc. flow to save analyses to Firestore

**Files:**
- Modify: `app/analyze/page.tsx` (or wherever `saveAnalysis(record)` is currently called)

- [ ] **Step 1: Find current saveAnalysis callers**

```bash
cd /Users/samudrazulqifli/re-vibe
grep -rn "saveAnalysis\|addToHistory" app src --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] **Step 2: Update each caller to pass `user.uid`**

In each file from Step 1, add the import:

```tsx
import { useAuth } from '@/src/lib/firebase/auth-context';
```

In the component body:

```tsx
const { user } = useAuth();
```

Replace each `saveAnalysis(record)` or `addToHistory(record)` with:

```tsx
if (user) {
  try { await saveAnalysis(user.uid, record); } catch (e) { console.error(e); }
}
```

Also remove any direct `useReVibeStore((s) => s.addToHistory)` usage since `addToHistory` no longer exists on the store.

- [ ] **Step 3: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | tee /tmp/tsc.log | head -30
```

Expected: zero TS errors. If `addToHistory` is referenced anywhere else, fix it.

- [ ] **Step 4: Manual verify**

End-to-end:
1. http://localhost:3000/ → "Upload dari Galeri" → pick `/tmp/test.jpg`
2. Preview → "Analisa Sekarang"
3. After analyze completes, check Firebase Console → Firestore → `users/{uid}/analyses/` for a new doc.
4. Reload `/history` → that record shows up.

- [ ] **Step 5: Commit**

```bash
git add -A app src
git commit -m "feat(analyze): persist analysis records to Firestore per-user"
```

---

## Task 11: Server-side API auth helper + protect API routes

**Files:**
- Create: `src/lib/firebase/admin.ts`
- Create: `src/lib/firebase/api-auth.ts`
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `app/api/recommend/route.ts`
- Modify: `app/api/diy/route.ts`
- Modify: `app/api/products/route.ts`
- Modify: `app/api/scrap-value/route.ts`

- [ ] **Step 1: Create admin SDK init**

```ts
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
```

- [ ] **Step 2: Create the per-request auth helper**

```ts
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
```

- [ ] **Step 3: Update `app/api/upload/route.ts` to use uid in the GCS path**

Find the current `POST` handler. Replace the body so it reads:

```ts
import { NextResponse } from 'next/server';
import { uploadFile } from '@/src/lib/storage';
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';

export async function POST(req: Request) {
  const auth = await requireAuthedUser(req);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/\s+/g, '_');
    const fileName = `uploads/${uid}/${Date.now()}-${safeName}`;
    const bucketName = process.env.GCS_BUCKET_NAME || 're-vibe-uploads';
    const publicUrl = await uploadFile(bucketName, fileName, buffer, file.type);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', detail: error?.message || 'unknown' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Add the same auth gate to the other 5 routes**

For each of `app/api/analyze/route.ts`, `app/api/recommend/route.ts`, `app/api/diy/route.ts`, `app/api/products/route.ts`, `app/api/scrap-value/route.ts`, add the import:

```ts
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';
```

And at the top of each `POST` handler body (before any `await req.json()`):

```ts
const auth = await requireAuthedUser(req);
if (auth instanceof NextResponse) return auth;
```

Do **not** add it to `app/api/places/route.ts` or `app/api/youtube/route.ts` (these are public per spec Section 3.3).

- [ ] **Step 5: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 6: Manual verify the gate**

```bash
curl -s -X POST http://localhost:3000/api/upload -F "file=@/tmp/test.jpg" -w "\nHTTP: %{http_code}\n" | head -3
```

Expected: HTTP 401, `{"error":"Unauthorized"}`. The browser-based flow will work once Task 12 attaches the token.

- [ ] **Step 7: Commit**

```bash
git add src/lib/firebase/admin.ts src/lib/firebase/api-auth.ts app/api
git commit -m "feat(api): verify Firebase ID token on mutating API routes"
```

---

## Task 12: Client-side auth-fetch helper + wire into every fetch call

**Files:**
- Create: `src/lib/firebase/auth-fetch.ts`
- Modify: `app/upload/preview/page.tsx`
- Modify: `app/analyze/page.tsx`
- Modify: `app/recommend/page.tsx`
- Modify: `app/diy/page.tsx`
- Modify: `app/shop/page.tsx`
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: Create `auth-fetch.ts`**

```ts
// src/lib/firebase/auth-fetch.ts
import { getFirebaseAuth } from './client';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = getFirebaseAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
```

- [ ] **Step 2: Replace each `fetch('/api/...'` call**

For each of the 6 files listed under "Files", change the import section to include:

```tsx
import { authFetch } from '@/src/lib/firebase/auth-fetch';
```

Then replace every `fetch(` call that targets `/api/upload`, `/api/analyze`, `/api/recommend`, `/api/diy`, `/api/products`, or `/api/scrap-value` with `authFetch(`. Leave `/api/places` and `/api/youtube` calls (in `app/service/page.tsx` and the YouTube usage path) using plain `fetch` — those routes are public.

Locations from the codebase audit (line numbers may shift after edits):
- `app/upload/preview/page.tsx:37` → `/api/upload`
- `app/analyze/page.tsx:30` → `/api/analyze`
- `app/recommend/page.tsx:44` → `/api/recommend`
- `app/diy/page.tsx:71` → `/api/diy`
- `app/shop/page.tsx:63` → `/api/products`
- `app/sell/page.tsx:50` → `/api/scrap-value`

- [ ] **Step 3: TS check**

```bash
cd /Users/samudrazulqifli/re-vibe && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Manual verify**

1. Log in via http://localhost:3000/login
2. Upload a photo → preview → "Analisa Sekarang"
3. Confirm both `/api/upload` returns 200 and `/api/analyze` returns 200 in browser DevTools Network tab.
4. In the request headers for both, see `Authorization: Bearer eyJ...`.
5. Check Firebase Console Firestore → new analysis record created.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/auth-fetch.ts app
git commit -m "feat(auth): attach ID token to mutating API requests via authFetch"
```

---

## Task 13: De-hardcode /profile and add Logout

**Files:**
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Replace hardcoded user header**

Find this block:

```tsx
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-[32px] bg-primary flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-primary/30">
              SZ
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-xl border-4 border-white flex items-center justify-center text-accent">
              <ShieldCheck size={20} fill="currentColor" stroke="white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Samudra Zulqifli</h2>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Pahlawan Lingkungan</span>
          </div>
        </div>
```

Replace with:

```tsx
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-[32px] object-cover shadow-2xl shadow-primary/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-[32px] bg-primary flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-primary/30">
                {getInitials(user?.displayName)}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-xl border-4 border-white flex items-center justify-center text-accent">
              <ShieldCheck size={20} fill="currentColor" stroke="white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {user?.displayName ?? 'Pengguna Re-Vibe'}
            </h2>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{tierLabel(stats.total)}</span>
          </div>
        </div>
```

Add these helpers near the top of the file (above the component or inline):

```tsx
function getInitials(name?: string | null): string {
  if (!name) return 'RV';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'RV';
}

function tierLabel(total: number): string {
  if (total >= 20) return 'Pahlawan Lingkungan';
  if (total >= 5) return 'Pejuang Reparasi';
  return 'Pemula Re-Vibe';
}
```

Add the import for `useAuth` at the top:

```tsx
import { useAuth } from '@/src/lib/firebase/auth-context';
```

Inside the component, near other hooks:

```tsx
const { user, logOut } = useAuth();
```

- [ ] **Step 2: Update `calculateStats()` call to pass `uid`**

Find:

```tsx
useEffect(() => {
  setStats(calculateStats());
}, []);
```

Replace with:

```tsx
useEffect(() => {
  if (!user) return;
  let cancelled = false;
  calculateStats(user.uid)
    .then((s) => { if (!cancelled) setStats(s); })
    .catch((e) => console.error('calculateStats failed', e));
  return () => { cancelled = true; };
}, [user]);
```

- [ ] **Step 3: Add Logout menu item**

Inside `menuItems`, append a new entry at the end:

```tsx
{ label: 'Keluar', icon: LogOut, action: async () => {
    if (!confirm('Yakin ingin keluar dari akun?')) return;
    await logOut();
    router.replace('/login');
  }, danger: true },
```

Add `LogOut` to the lucide-react import line at the top of the file.

Then in the menu item render block, change the button so the "danger" entry has red text. Find the existing `<button>` block inside `{menuItems.map(...)}` and change the inner `<span className="text-sm font-black text-gray-900">` to:

```tsx
<span className={cn(
  "text-sm font-black",
  (item as any).danger ? "text-red-600" : "text-gray-900"
)}>{item.label}</span>
```

- [ ] **Step 4: Fix "Powered by" hardcode in the About modal**

Find `<span className="text-[10px] font-black text-gray-900">Gemini 1.5 Flash</span>` and replace with `<span className="text-[10px] font-black text-gray-900">Gemini 2.5 Flash</span>`.

- [ ] **Step 5: Manual verify**

Reload http://localhost:3000/profile.
- Avatar shows your real Google photo (or initials if no photo).
- Name shows your Google display name.
- Tier reflects analysis count.
- "Keluar" at the bottom of the menu is red. Click → confirm → logged out → redirected to `/login`.

- [ ] **Step 6: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat(profile): show real Google profile + logout, drop SZ hardcode"
```

---

## Task 14: Home greeting

**Files:**
- Modify: `src/components/Home.tsx`

- [ ] **Step 1: Add useAuth and a greeting line**

Add the imports section at the top of `src/components/Home.tsx`:

```tsx
"use client";
import { useAuth } from '@/src/lib/firebase/auth-context';
```

The component is currently a server component — since we're adding `useAuth`, make sure it has `"use client"` at the very top (add if missing).

Inside the component, after the existing `handleFileChange`:

```tsx
const { user } = useAuth();
const firstName = user?.displayName?.split(' ')[0] ?? 'Sobat';
```

In the JSX, find the `<motion.div ...>` that contains the existing title and add a greeting line above the `#JuaraVibeCoding` span:

```tsx
        <span className="text-xs font-bold text-gray-400 tracking-wide">Hai, {firstName} 👋</span>
        <span className="text-secondary font-bold text-sm tracking-wide uppercase">#JuaraVibeCoding</span>
```

- [ ] **Step 2: Manual verify**

Reload http://localhost:3000/. Greeting "Hai, <FirstName>" appears at the top of the home page.

- [ ] **Step 3: Commit**

```bash
git add src/components/Home.tsx
git commit -m "feat(home): greet signed-in user by first name"
```

---

## Task 15: One-time localStorage → Firestore migration

**Files:**
- Create: `src/lib/firebase/migrate.ts`
- Modify: `src/lib/firebase/auth-context.tsx`

- [ ] **Step 1: Create migrate.ts**

```ts
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
```

- [ ] **Step 2: Wire migration into auth-context**

In `src/lib/firebase/auth-context.tsx`, find the `onAuthStateChanged` callback (added in Task 7). Replace it with:

```tsx
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try { await ensureUserDoc(u); } catch (e) { console.error('ensureUserDoc failed', e); }
        try {
          const n = await migrateLocalHistory(u.uid);
          if (n > 0) console.info(`migrated ${n} legacy analyses to Firestore`);
        } catch (e) {
          console.error('migrateLocalHistory failed', e);
        }
      }
      setUser(u);
      setLoading(false);
    });
```

Add the import:

```tsx
import { migrateLocalHistory } from './migrate';
```

- [ ] **Step 3: Manual verify**

1. In DevTools console (while logged out / on /welcome), run:
   ```js
   localStorage.setItem('re-vibe-history', JSON.stringify([
     { id: 'mig-test-1', imageUrl: '', timestamp: Date.now(),
       itemName: 'Legacy Item', itemCategory: 'lainnya',
       damageTypes: ['retak'], severity: 'ringan', severityScore: 2,
       confidence: 50, isRepairable: true,
       damageDescription: 'Legacy', estimatedAge: '1 tahun' }
   ]))
   ```
2. Clear `rv-migrated-<your-uid>` from localStorage if present (or just sign in as a different user).
3. Sign in. Check Firestore Console for `users/{uid}/analyses/mig-test-1`.
4. Re-sign-in (logout then login again): no duplicate, flag prevents re-run.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase/migrate.ts src/lib/firebase/auth-context.tsx
git commit -m "feat(auth): migrate legacy localStorage history to Firestore on first sign-in"
```

---

## Task 16: Firestore security rules

**Files:**
- Create: `firestore.rules`
- Create: `firestore.indexes.json`

- [ ] **Step 1: Create rules file**

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /analyses/{analysisId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

- [ ] **Step 2: Create indexes file (empty)**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 3: Deploy rules**

Two options — pick one. Either via `firebase` CLI (one-time install per environment):

```bash
cd /Users/samudrazulqifli/re-vibe
npx -y firebase-tools@latest deploy --only firestore:rules --project re-vibe-496006-4f8a2
```

…or paste the rules into Firebase Console → Firestore → Rules tab manually.

- [ ] **Step 4: Verify enforcement**

In the Firebase Console "Rules Playground" (or via gcloud), simulate a `get` on `/users/abc123/analyses/x` with `request.auth.uid = "abc123"` → ALLOW. With `request.auth.uid = "xyz"` → DENY.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat(security): firestore rules limit access to owner uid"
```

---

## Task 17: Final smoke test (no code changes)

This is a manual checkpoint, not a code task. Run through Spec Section 11 list end-to-end. Each failure means a regression; fix and re-run.

- [ ] **Step 1: Fresh-user flow**

In an incognito window:
1. http://localhost:3000/ → expect redirect to `/welcome`.
2. "Mulai Sekarang" → `/login`.
3. Sign in with Google → land on `/`.
4. Home shows "Hai, <FirstName>".

- [ ] **Step 2: Upload + analyze**

1. Click "Upload dari Galeri" → pick a real JPG.
2. On preview, "Analisa Sekarang" → 200 response.
3. In GCS, verify `gs://re-vibe-uploads/uploads/<uid>/...` was created:
   ```bash
   export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
   gsutil ls gs://re-vibe-uploads/uploads/ | tail -5
   ```
4. In Firebase Console, verify `users/<uid>/analyses/<id>` exists with the analysis fields.

- [ ] **Step 3: History**

http://localhost:3000/history → the just-created analysis appears. Click it → detail page loads from Firestore.

- [ ] **Step 4: Profile**

http://localhost:3000/profile → real avatar + name + correct tier. Click "Keluar" → confirm → land on `/login`.

- [ ] **Step 5: Cross-user isolation**

Sign in with a second Google account → `/history` is empty for the new user (first account's data not visible).

- [ ] **Step 6: API gate enforced**

```bash
curl -s -X POST http://localhost:3000/api/upload -F "file=@/tmp/test.jpg" -w "\nHTTP: %{http_code}\n"
```

Expected: 401 `{"error":"Unauthorized"}`.

- [ ] **Step 7: Returning user**

Reload the app while signed in → no flash to `/welcome`, direct to `/`.

- [ ] **Step 8: Public APIs still work**

```bash
curl -s -X POST http://localhost:3000/api/places \
  -H "Content-Type: application/json" \
  -d '{"lat":-6.2,"lng":106.8,"keyword":"servis","radius":5000}' -w "\nHTTP: %{http_code}\n" | head -c 200
curl -s "http://localhost:3000/api/youtube?query=perbaiki+hp" -w "\nHTTP: %{http_code}\n" | head -c 200
```

Expected: HTTP 200 for both, regardless of auth state.

- [ ] **Step 9: Commit nothing — checkpoint only**

If any step failed, debug and re-test. Otherwise, mark this task complete.

---

## Self-Review Notes

After writing this plan, against the spec:

- **Section 1 (Goals):** Tasks 4, 13, 14 collectively cover gating, profile de-hardcode, and history relocation. ✓
- **Section 3 (Architecture):** Task 11 creates `admin.ts` and `api-auth.ts`; Tasks 2, 3, 7, 12, 15 cover the rest of `src/lib/firebase/`. ✓
- **Section 4 (Routes):** Task 4 implements the AuthGuard with the exact public list. ✓
- **Section 5 (Schema):** Task 7 sets up `users/{uid}` + `analyses` subcollection. Task 16 deploys the matching rules. ✓
- **Section 6 (Migration):** Task 15. ✓
- **Section 7 (Server auth helper):** Task 11. ✓
- **Section 8 (Pages):** Tasks 5 (welcome), 6 (login), 13 (profile), 14 (home greeting). ✓
- **Section 9 (Env vars):** Task 1. ✓
- **Section 10 (Error handling):** Covered inline (popup-closed silent in Task 6; migration soft-fail in Task 15; 401 from Task 11). ✓
- **Section 11 (Testing):** Task 17 walks through every listed smoke step. ✓

No placeholders, no "TBD", every file path is explicit, every code change shows the exact code, and every task ends with a commit (or, for Task 17, an explicit checkpoint note).
