# Firebase Auth + Per-User Data — Design Spec

**Date:** 2026-05-12
**Project:** re-vibe (`re-vibe-496006`)
**Firebase project:** `re-vibe-496006-4f8a2`
**Status:** Approved by user, ready for implementation plan

## 1. Goals

Convert Re-Vibe from a device-local PWA into a per-user, auth-gated, pre-production app:

- Require sign-in before using core features (upload, analyze, history, profile).
- Replace hardcoded profile data (avatar initials "SZ", name "Samudra Zulqifli") with real user profile from Google.
- Move analysis history from `localStorage` to per-user Firestore so data follows the user across devices.
- Tag uploaded files with the user's UID for auditability.

Non-goals (YAGNI):
- Email/password sign-in, magic links, MFA.
- Forgot-password flow (not applicable to Google-only).
- Account deletion UI (Firebase Console manual is sufficient for pre-prod).
- Admin/operator dashboard.

## 2. Decisions (locked)

| Topic | Decision |
|---|---|
| Auth provider | Firebase Auth |
| Sign-in methods | **Google only** |
| User data store | Firestore (`users/{uid}/analyses/{id}`) |
| Local data | One-time migrate from `localStorage` on first sign-in, then drop |
| Flow | Welcome → (optional Onboarding) → Login → protected app |
| Route protection | Client-side `AuthGuard` in root layout + server-side token verify on API routes |
| Server-side auth | `firebase-admin` `verifyIdToken()` on `/api/*` (mutating endpoints) |

## 3. Architecture

### 3.1 New dependencies

```json
{
  "dependencies": {
    "firebase": "^11.x",
    "firebase-admin": "^13.x"
  },
  "devDependencies": {
    "firebase-tools": "^14.x"   // only for deploying Firestore rules
  }
}
```

### 3.2 New files

```
src/lib/firebase/
├── client.ts          # initializeApp({ ...env }), exports auth + db
├── admin.ts           # initializeApp({ credential }), exports adminAuth + adminDb
├── auth-context.tsx   # React context + useAuth() hook
├── user-data.ts       # ensureUserDoc, addAnalysis, getAnalyses, deleteAnalysis, calculateStats
├── migrate.ts         # migrateLocalHistory(uid) — idempotent
└── api-auth.ts        # requireAuthedUser(req): server-side helper, returns { uid } or 401

src/components/auth/
├── AuthGuard.tsx           # wraps children, redirects based on auth state
└── GoogleSignInButton.tsx

app/welcome/page.tsx        # NEW: 3-slide welcome carousel (per user screenshot)
app/login/page.tsx          # NEW: single Google sign-in button page

firestore.rules             # security rules (committed)
firestore.indexes.json      # composite indexes (committed)
```

### 3.3 Modified files

| File | Change |
|---|---|
| `app/layout.tsx` | Wrap `children` with `<AuthProvider>` + `<AuthGuard>` |
| `app/page.tsx` | Greet user with first name from Google profile |
| `app/profile/page.tsx` | Replace hardcoded avatar/name; add Logout menu; dynamic badge tier; update "Powered by" to `Gemini 2.5 Flash`; clear localStorage hardcode |
| `app/upload/preview/page.tsx` | Send `Authorization: Bearer <idToken>` to `/api/upload` |
| `app/analyze/page.tsx` | Send `Authorization` header to `/api/analyze` (and other mutating endpoints) |
| `app/recommend/page.tsx`, `app/diy/page.tsx`, `app/sell/page.tsx` | Same header pattern |
| `app/history/page.tsx`, `app/history/[id]/page.tsx` | Read from `getAnalyses(uid)` instead of `getHistory()` localStorage |
| `src/lib/store.ts` | Remove `analysisHistory` + `addToHistory` (replaced by Firestore-backed hook) |
| `src/lib/history.ts` | Rewrite `getHistory`/`saveAnalysis`/`deleteAnalysis`/`calculateStats` to take `uid` and call Firestore |
| `app/api/upload/route.ts` | Verify token via `requireAuthedUser`; path = `uploads/{uid}/{timestamp}-{name}` |
| `app/api/analyze/route.ts`, `app/api/recommend/route.ts`, `app/api/diy/route.ts`, `app/api/products/route.ts`, `app/api/scrap-value/route.ts` | Wrap handler with `requireAuthedUser` |
| `.env.example` | Add `NEXT_PUBLIC_FIREBASE_*` placeholders |

`/api/places` and `/api/youtube` stay unauthenticated (read-only public data, low abuse risk).

## 4. Routes & auth gate

### 4.1 Route table

| Route | Public | Notes |
|---|---|---|
| `/welcome` | ✅ | New first-time landing |
| `/onboarding` | ✅ | Existing 3-slide tutorial (deep-dive) |
| `/login` | ✅ | Google sign-in |
| `/`, `/upload`, `/upload/preview`, `/analyze`, `/result`, `/recommend`, `/diy`, `/service`, `/shop`, `/sell`, `/history`, `/history/[id]`, `/profile` | 🔒 | Require `user` |

### 4.2 `AuthGuard` logic (client-side, runs on every navigation)

```ts
const { user, loading } = useAuth();
const path = usePathname();
const hasSeenWelcome = typeof window !== 'undefined' && localStorage.getItem('rv-welcome-seen') === '1';

if (loading) return <Splash />;

const publicRoutes = ['/welcome', '/onboarding', '/login'];
const isPublic = publicRoutes.includes(path);

if (!user && !isPublic) {
  router.replace(hasSeenWelcome ? '/login' : '/welcome');
  return null;
}
if (user && isPublic) {
  router.replace('/');
  return null;
}
return children;
```

### 4.3 First-time vs returning

```
Fresh user        → /welcome → "Mulai Sekarang" → /login → Google → /
                              "Pelajari Cara Kerja" → /onboarding → /login → Google → /
Returning user    → (session restored by Firebase SDK) → / directly
Logged-out user   → /login (skip welcome because flag set)
```

## 5. Firestore schema

### 5.1 Documents

```
users/{uid}
  displayName        : string
  email              : string
  photoURL           : string | null
  createdAt          : Timestamp
  lastLoginAt        : Timestamp

users/{uid}/analyses/{analysisId}
  id                 : string  // = doc id
  imageUrl           : string  // GCS public URL
  timestamp          : number  // epoch ms
  itemName           : string
  itemCategory       : "elektronik" | "furnitur" | "peralatan_rumah" | "lainnya"
  damageTypes        : string[]
  severity           : "ringan" | "sedang" | "parah"
  severityScore      : number
  confidence         : number
  isRepairable       : boolean
  damageDescription  : string
  estimatedAge       : string
  recommendation     : Recommendation | null   // nested object from /api/recommend
  selectedAction     : "service" | "diy" | "buy" | null
  userDescription    : string | null
```

`analysisId` = client-generated `crypto.randomUUID()` so writes are deterministic (idempotent on retry).

### 5.2 Indexes

Single-collection ordering by `timestamp DESC` is auto-indexed. No composite indexes needed at v1.

### 5.3 Security rules (`firestore.rules`)

```
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

### 5.4 GCS object path

`uploads/{uid}/{timestamp}-{sanitizedFilename}` — derived from verified `uid` on the server, not trustable from client. Bucket-level public read remains unchanged.

## 6. Migration from localStorage

`src/lib/firebase/migrate.ts`:

```ts
export async function migrateLocalHistory(uid: string): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const flag = `rv-migrated-${uid}`;
  if (localStorage.getItem(flag)) return 0;

  const raw = localStorage.getItem('re-vibe-history');
  if (!raw) {
    localStorage.setItem(flag, '1');
    return 0;
  }

  const records: AnalysisRecord[] = JSON.parse(raw);
  if (records.length === 0) {
    localStorage.setItem(flag, '1');
    return 0;
  }

  const batch = writeBatch(db);
  for (const r of records) {
    const ref = doc(db, 'users', uid, 'analyses', r.id);
    batch.set(ref, r, { merge: true });
  }
  await batch.commit();
  localStorage.setItem(flag, '1');
  return records.length;
}
```

Triggered once in `auth-context.tsx` right after first successful sign-in, before redirecting to `/`. Failure does not block login — error toast + retry next session.

## 7. Server-side auth helper

`src/lib/firebase/api-auth.ts`:

```ts
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;
  if (saJson) credential = cert(JSON.parse(saJson));
  else if (saPath) credential = cert(saPath);
  else credential = applicationDefault(); // ADC (gcloud auth application-default login or Cloud Run)
  return initializeApp({ credential, projectId: 're-vibe-496006-4f8a2' });
}

export async function requireAuthedUser(req: Request): Promise<{ uid: string } | Response> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}
```

Each protected route handler:

```ts
const authResult = await requireAuthedUser(req);
if (authResult instanceof Response) return authResult;
const { uid } = authResult;
// ... use uid
```

## 8. Pages

### 8.1 `/welcome` (NEW)

- 3-slide carousel; each slide = title + description + illustration placeholder (Lucide icon for v1; PNG/SVG can be swapped later).
- Slide 1: "Selamat Datang di Re-Vibe" — "Foto barang rusak kamu. AI kami yang akan bantu putuskan langkah terbaik."
- Slide 2: "AI Vision Analysis" — "Deteksi kerusakan otomatis dengan satu foto."
- Slide 3: "Sustainability First" — "Setiap perbaikan mengurangi sampah elektronik."
- Bottom: pagination dots, "Mulai Sekarang" primary button → `/login`, "Pelajari Cara Kerja →" link → `/onboarding`.
- On any CTA: `localStorage.setItem('rv-welcome-seen', '1')`.
- Layout: max-w-[440px] mobile-style (matches root layout).

### 8.2 `/login` (NEW)

- Logo / title "Re-Vibe"
- Subtitle "Masuk untuk mulai analisa barang kamu"
- Single "Masuk dengan Google" button → `signInWithPopup(auth, new GoogleAuthProvider())`. Mobile: try popup, fallback to redirect if blocked.
- Loading state during sign-in.
- Error toast on unrecoverable errors. `auth/popup-closed-by-user` and `auth/cancelled-popup-request` are silent.
- Disclaimer text "Dengan masuk, kamu setuju Syarat & Kebijakan Privasi." (no actual T&C page in v1 — placeholder text).
- Back arrow → `/welcome`.

### 8.3 `/profile` (REPLACE HARDCODE)

- Avatar: `<Image src={user.photoURL} />` if present, else gradient background with `getInitials(user.displayName)`.
- Name: `user.displayName`.
- Badge tier (dynamic):
  - `< 5` analyses → "Pemula"
  - `< 20` → "Pejuang"
  - `≥ 20` → "Pahlawan Lingkungan"
- Stats from `calculateStats(uid)` (Firestore-backed).
- New menu item at the bottom: "Keluar" (LogOut icon, text-red-600). On click: confirm dialog → `signOut(auth)` → `router.replace('/login')`.
- About modal: update "Gemini 1.5 Flash" → "Gemini 2.5 Flash" (matches current routes).

### 8.4 Root layout & home

- `app/layout.tsx`: wrap with `<AuthProvider>` and `<AuthGuard>`. Body should still render `BottomNav` only when authed.
- `app/page.tsx` / `src/components/Home.tsx`: title becomes "Hai, {firstName}!" via `useAuth()`.

## 9. Environment variables

`.env` (already set by user for client side):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=re-vibe-496006-4f8a2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=re-vibe-496006-4f8a2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=re-vibe-496006-4f8a2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=27064217723
NEXT_PUBLIC_FIREBASE_APP_ID=1:27064217723:web:44c51e3fdaf9afa299b2de
```

Server side (admin SDK), one of:
- `GOOGLE_APPLICATION_CREDENTIALS` = absolute path to service account JSON, OR
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` = inline JSON string, OR
- ADC fallback (works locally via `gcloud auth application-default login`, works on Cloud Run via attached service account).

For Cloud Run deploy: attach a service account with roles `roles/firebase.viewer` + `roles/iam.serviceAccountTokenCreator` (or simply Firebase Admin). `cloudbuild.yaml` should pass `NEXT_PUBLIC_FIREBASE_*` as build args (so Next.js inlines them into client bundle) and runtime env.

`next.config.mjs` `env` block to be extended with the 6 `NEXT_PUBLIC_FIREBASE_*` keys so Next.js carries them into the client bundle.

## 10. Error handling matrix

| Scenario | Behavior |
|---|---|
| Popup closed by user | Silent |
| Network error during sign-in | Toast: "Koneksi bermasalah, coba lagi" |
| Firestore write fails during migration | Toast: "Gagal migrasi data lama" — login still succeeds, data not deleted, retry on next session |
| API call returns 401 (token invalid/expired) | Frontend signs out + redirects to `/login` |
| Token refresh fails silently | Firebase SDK auto-handles; on next user action, may re-prompt |
| Firestore offline | Hooks return cached data via Firestore offline persistence |

## 11. Testing approach

Manual end-to-end smoke list (no unit tests for v1, this is pre-prod hardening):

1. Open app in incognito → `/welcome` shows.
2. "Mulai Sekarang" → `/login` → Google popup → `/` home with greeting using Google name.
3. Reload mid-session → stays on `/` (no flash back to `/welcome`).
4. Open `/upload` directly while logged out → redirected to `/login` (or `/welcome` if first visit).
5. Upload a photo → confirm GCS object path is `uploads/{uid}/...` in `gsutil ls`.
6. Run analyze → record appears in `/history` and in Firestore console at `users/{uid}/analyses/...`.
7. `/profile` shows Google name + avatar (no "SZ" hardcode).
8. Logout from profile → land on `/login`.
9. Sign in as User B → `/history` is empty (User A's data not visible).
10. Seed `localStorage` with `re-vibe-history` JSON for fresh user, then sign in → records auto-migrate to Firestore.
11. With ADC unset and service account JSON only → API still verifies tokens correctly.
12. Cloud Run smoke after deploy: same 1–10 against production URL.

## 12. Open questions / future

- Anonymous mode for tire-kickers — deferred per YAGNI.
- Account deletion self-service — deferred.
- App Check (Firebase) to block API abuse from non-app clients — recommended post-v1.
- Move `/api/places` & `/api/youtube` behind auth if observed quota abuse.
- Email/password sign-in if user demand emerges.

## 13. Out-of-scope (explicit non-goals)

- Email/password, magic link, phone, anonymous auth.
- Forgot password.
- Multi-factor authentication.
- Account deletion UI.
- Admin dashboard.
- Migration of localStorage → Firestore for users who don't sign in (no such users exist post-launch).
