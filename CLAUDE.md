# Re-Vibe — Panduan Kode & Penambahan Fitur

> **Untuk siapa**: dokumen ini ditulis sekaligus untuk **AI agent** (Claude Code, dll. — auto-loaded sebagai context) dan **developer** yang nambah fitur secara manual. Setiap pola di sini sudah jadi keputusan arsitektur — jangan dideviasi tanpa diskusi.

## TL;DR (5 hal yang wajib diingat)

1. **Auth**: Firebase Auth Google-only. Setiap request ke API mutating wajib pakai `authFetch` dari client (attach Bearer token) dan `requireAuthedUser(req)` di server.
2. **Per-user data**: semua tersimpan di `users/{uid}/analyses/{id}` di Firestore. Tidak ada lagi `localStorage` untuk history.
3. **NEXT_PUBLIC_***: env var yang dipakai di **browser** wajib prefix `NEXT_PUBLIC_`. Di production, harus di-set di **Cloud Run env vars** — Cloud Build trigger otomatis baca dan pass sebagai `--build-arg`.
4. **Gemini**: pakai `generateWithRetry()` dari `src/lib/genai.ts`, bukan `ai.models.generateContent()` langsung. Sudah punya model fallback chain (`flash-lite` → `flash`) dan retry untuk 429/503.
5. **Public vs Protected API routes**: `/api/places` & `/api/youtube` = public (no auth). Selebihnya = protected via `requireAuthedUser`.

---

## Arsitektur Utuh

### Data flow

```
User → /welcome → /login (Google popup)
        ↓ signInWithPopup
        AuthProvider.onAuthStateChanged
        ↓ ensureUserDoc(user) — buat doc di users/{uid}
        ↓ migrateLocalHistory(uid) — pindah localStorage legacy → Firestore
        → / (home, AuthGuard pass)
        ↓
User upload foto → /api/upload (auth) → GCS path uploads/{uid}/{timestamp}-{name}
        ↓ url publik
        → /api/analyze (auth) → Gemini Vision → AnalysisRecord
        → /api/recommend (auth) → Gemini → service/diy/buy recommendation
        ↓ saveAnalysis(uid, record) → Firestore users/{uid}/analyses/{id}
        → branch ke /service (Places), /diy (Gemini + YouTube), atau /shop (Products)
```

### Layer files (yang sering disentuh)

```
src/lib/firebase/
├── client.ts          # Firebase JS SDK init (browser). Export getDb(), getFirebaseAuth(), googleProvider
├── admin.ts           # firebase-admin (server). getAdminApp() — ADC atau service-account
├── auth-context.tsx   # <AuthProvider>, useAuth() → { user, loading, signInWithGoogle, logOut }
├── user-data.ts       # ensureUserDoc, addAnalysis, getAnalyses, deleteAnalysis, calculateStats
├── migrate.ts         # localStorage history → Firestore (idempotent per uid)
├── api-auth.ts        # requireAuthedUser(req) → { uid } | NextResponse 401
└── auth-fetch.ts      # authFetch(input, init) → fetch dengan Authorization header otomatis

src/lib/
├── store.ts           # Zustand: UI/flow state (uploadedPhoto, currentAnalysis, recommendation, ...)
├── history.ts         # Thin re-export ke user-data.ts (saveAnalysis = addAnalysis, dll.)
├── genai.ts           # generateWithRetry + GenAIQuotaError (model fallback + retry)
├── storage.ts         # GCS uploadFile (ADC fallback, handles uniform bucket-level access)
└── types.ts           # AnalysisRecord, Recommendation, UserProfile (TS types)

src/components/auth/
├── AuthGuard.tsx          # Client-side route gate. PUBLIC_ROUTES whitelist.
└── GoogleSignInButton.tsx # Tombol "Masuk dengan Google" + error handling
```

---

## Pola Standar (Wajib Diikuti)

### Pola 1: Bikin API route baru

Contoh: route mutating, butuh auth, panggil Gemini.

```ts
// app/api/<nama>/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { generateWithRetry, GenAIQuotaError } from '@/src/lib/genai';
import { requireAuthedUser } from '@/src/lib/firebase/api-auth';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  // 1) Auth gate (skip kalau public)
  const auth = await requireAuthedUser(req);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth; // <- pakai untuk per-user scoping

  try {
    const body = await req.json();

    // 2) Panggil Gemini via wrapper (auto retry + model fallback)
    const response = await generateWithRetry(ai, {
      model: 'gemini-2.5-flash-lite',
      contents: [{ parts: [{ text: `prompt ${body.input}` }] }],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,          // WAJIB cap, hindari truncation
        thinkingConfig: { thinkingBudget: 0 }, // disable thinking untuk hemat tokens
        responseSchema: {
          type: Type.OBJECT,
          properties: { /* ... */ },
          required: [/* ... */],
        },
      },
    });

    // 3) Defensive JSON parse
    const raw = response.text || '{}';
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch (parseErr) {
      console.error('JSON parse failed:', parseErr);
      return NextResponse.json({ error: 'AI returned malformed response' }, { status: 502 });
    }
  } catch (error) {
    console.error('<nama> API error:', error);
    if (error instanceof GenAIQuotaError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds, code: 'QUOTA_EXHAUSTED' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}
```

### Pola 2: Page client baru yang fetch API protected

```tsx
// app/<route>/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { authFetch } from '@/src/lib/firebase/auth-fetch';
import { useAuth } from '@/src/lib/firebase/auth-context';
import toast from 'react-hot-toast';

export default function MyPage() {
  const { user } = useAuth();              // Firebase User | null
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) return;                     // AuthGuard sebenarnya sudah jaga, tapi aman
    let cancelled = false;
    authFetch('/api/<endpoint>', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* ... */ }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { console.error(e); toast.error('Gagal memuat data.'); });
    return () => { cancelled = true; };
  }, [user]);

  // ...
}
```

**Jangan**: panggil `fetch('/api/protected', ...)` polos. Tokennya tidak akan attach. Selalu pakai `authFetch`.

### Pola 3: Tulis ke Firestore per-user

```tsx
import { useAuth } from '@/src/lib/firebase/auth-context';
import { saveAnalysis } from '@/src/lib/history';
import type { AnalysisRecord } from '@/src/lib/types';

const { user } = useAuth();

const record: AnalysisRecord = { id: crypto.randomUUID(), /* ... */ };
if (user) {
  try { await saveAnalysis(user.uid, record); }
  catch (e) { console.error(e); }
}
```

Schema Firestore (locked):
```
users/{uid}                              # docs
  └─ analyses/{analysisId}               # subcollection — id = client UUID
       ├─ id, imageUrl, timestamp
       ├─ itemName, itemCategory, damageTypes, severity, severityScore
       ├─ confidence, isRepairable, damageDescription, estimatedAge
       ├─ recommendation (nested object) | null
       └─ selectedAction: "service" | "diy" | "buy" | null
```

Security rules: `firestore.rules` — hanya owner UID yang bisa read/write doc-nya. Kalau Anda nambah subcollection baru di `users/{uid}/...`, **wajib** tambahkan rule yang sama.

### Pola 4: Page baru yang publik (tidak butuh login)

Wajib tambahkan path-nya ke `PUBLIC_ROUTES` di `src/components/auth/AuthGuard.tsx`:

```ts
const PUBLIC_ROUTES = ['/welcome', '/onboarding', '/login', '/<route-baru>'];
```

Kalau tidak, route Anda akan auto-redirect ke `/welcome` saat user belum login.

### Pola 5: Env var baru

**Kalau dipakai server-side saja** (di `/api/*` route):
1. Tambah di `.env` lokal: `MY_NEW_KEY="..."`
2. Tambah di Cloud Run env vars: `gcloud run services update re-vibe --region=asia-southeast2 --update-env-vars="MY_NEW_KEY=..."`
3. Tambah di `next.config.mjs` `env` block kalau perlu (umumnya tidak perlu — `process.env.MY_NEW_KEY` server-side selalu bisa)
4. Tambah placeholder di `.env.example`

**Kalau dipakai client-side** (di komponen `"use client"`):
1. Wajib prefix `NEXT_PUBLIC_*` — Next.js bake nilainya ke bundle saat build
2. Tambah di `.env` lokal: `NEXT_PUBLIC_MY_KEY="..."`
3. Tambah di Cloud Run env vars (Cloud Build trigger otomatis pick up semua `NEXT_PUBLIC_*` saat build)
4. Tambah ARG + ENV di `Dockerfile` builder stage:
   ```dockerfile
   ARG NEXT_PUBLIC_MY_KEY
   ENV NEXT_PUBLIC_MY_KEY=$NEXT_PUBLIC_MY_KEY
   ```
5. (Opsional) `next.config.mjs` env block — Next.js sebenarnya sudah auto-expose `NEXT_PUBLIC_*` tanpa ini, tapi konsisten dengan existing pattern.

---

## Deployment & CI Flow

**Trigger**: GitHub push ke `master` → Cloud Build trigger `a54ecae9-657d-417d-811f-8353e8fbf7ba` di project `re-vibe-496006`.

**Trigger config** (inline, bukan dari `cloudbuild.yaml` di repo — sengaja, karena perlu akses ke `gcloud run services describe`):

```yaml
steps:
  - id: ReadEnv             # baca NEXT_PUBLIC_* dari Cloud Run service
    name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: bash
    args: [-c, |
      gcloud run services describe re-vibe --region=$_DEPLOY_REGION ... | python3 ...
      > /workspace/build-args.txt
    ]
  - id: Build               # docker build dengan --build-arg dari file di atas
    name: gcr.io/cloud-builders/docker
    entrypoint: bash
    args: [-c, mapfile -t ARGS < /workspace/build-args.txt; docker build ... ]
  - id: Push                # push ke Artifact Registry
  - id: Deploy              # gcloud run services update
```

**Source of truth**: env vars di Cloud Run service `re-vibe` (region `asia-southeast2`). Cek dengan:
```bash
gcloud run services describe re-vibe --region=asia-southeast2 --project=re-vibe-496006 --format=json | jq '.spec.template.spec.containers[0].env'
```

Kalau Anda perlu modify trigger config: edit `/tmp/trigger-updated.yaml` lalu `gcloud builds triggers import --source=/tmp/trigger-updated.yaml --project=re-vibe-496006`.

**Cloud Run service account**: `287334421454-compute@developer.gserviceaccount.com`. Punya akses ADC ke GCS bucket `re-vibe-uploads` dan Firebase project `re-vibe-496006-4f8a2`.

---

## Common Gotchas

| Gejala | Akar masalah | Fix |
|---|---|---|
| Spinner loading forever di production | Firebase `apiKey:undefined` di bundle | Pastikan `NEXT_PUBLIC_FIREBASE_*` ada di Cloud Run env vars + ARG di Dockerfile |
| `Firebase: Error (auth/unauthorized-domain)` | Cloud Run URL tidak di Firebase Authorized Domains | Tambah di Firebase Console → Auth → Settings → Authorized domains |
| `auth/invalid-api-key` | Firebase key expired atau bocor | Generate baru di https://aistudio.google.com/apikey, update di Cloud Run env vars |
| Gemini `429 RESOURCE_EXHAUSTED` | Free tier quota habis (20 req/day/model) | `generateWithRetry` auto-fallback ke `flash-lite` → `flash`. Kalau semua exhaust, expose `GenAIQuotaError` ke user |
| Gemini `JSON parse error` | Output melebihi `maxOutputTokens` | **Cap di config**: `maxOutputTokens: 4096`. Tambah constraint di prompt (max N items, deskripsi singkat). |
| Places API 403 `SERVICE_DISABLED` | API belum di-enable di project | Enable di https://console.cloud.google.com/apis/library/places.googleapis.com?project=re-vibe-496006 |
| Maps API key blocked di YouTube | API key restrictions tidak include YouTube | Tambah `youtube.googleapis.com` di key restrictions di Cloud Console |
| Places search return 0 results | `locationRestriction` + `rankPreference: DISTANCE` tidak kompatibel | Pakai `locationBias` + filter distance di server (`app/api/places/route.ts`) |
| GCS upload error `412 Precondition Failed` | Uniform bucket-level access enabled, `makePublic()` gagal | Sudah di-handle di `src/lib/storage.ts`. Public access di-set via bucket-level IAM, bukan per-object ACL. |

---

## Cara Nambah Fitur (Pakai AI)

Untuk hasil terbaik, briefing AI dengan format ini:

```
Context: ini Re-Vibe (Next.js 15 App Router, Firebase Auth, Firestore per-user).
Baca CLAUDE.md dulu untuk pola standar.

Goal: <satu kalimat>

Constraint:
- Pakai Pola N dari CLAUDE.md (kalau applicable)
- Jangan introduce dependency baru tanpa konfirmasi
- Untuk env var client-side: pakai NEXT_PUBLIC_* + update Dockerfile ARG + Cloud Run
- Untuk Firestore: pakai schema users/{uid}/... + tambah rules

Acceptance:
- TypeScript: zero errors (npx tsc --noEmit -p tsconfig.json)
- Auth flow tidak rusak (test: incognito → /welcome → login → fitur baru)
- Existing fitur tidak regresi
```

## Cara Nambah Fitur (Manual)

Checklist:

1. **Spec dulu, kode nanti**. Tulis ke `docs/superpowers/specs/YYYY-MM-DD-<nama>-design.md` (folder ini di-gitignore — sengaja, biar tidak bocor ke repo).
2. **Branch**: kerja di branch baru. `master` auto-deploy ke production saat push.
3. **TDD opsional**: belum ada test framework di project ini. Manual smoke test di `npm run dev` cukup.
4. **Wajib lakukan sebelum push**:
   - `npx tsc --noEmit -p tsconfig.json` → zero errors
   - Test fitur baru di `npm run dev`
   - Test bahwa fitur existing tidak rusak (minimal: login flow + 1 analysis flow end-to-end)
5. **Push ke master** → Cloud Build auto-deploy. Monitor:
   ```bash
   gcloud builds list --project=re-vibe-496006 --limit=3
   ```

## Style Conventions

- **TypeScript**: strict mode, zero errors
- **Indentasi**: 2 spaces, no tabs
- **Imports**: pakai alias `@/src/...` dan `@/...` (lihat `tsconfig.json` paths)
- **Komentar**: minimal — kode self-documenting. Tambah komentar HANYA kalau menjelaskan WHY (constraint tersembunyi, workaround bug, invariant), bukan WHAT
- **Bahasa UI**: Indonesia (toast, button label, dll)
- **Bahasa log/error/comment**: bebas, tapi English lebih konsisten untuk debugging
- **Emoji**: hindari di kode. Boleh di UI string Indonesia kalau memang aesthetic

## "JANGAN" List

- ❌ Jangan import `firebase-admin` di file client (`"use client"`)
- ❌ Jangan akses `localStorage` untuk history (sudah di-Firestore-kan)
- ❌ Jangan panggil `ai.models.generateContent()` langsung — selalu via `generateWithRetry`
- ❌ Jangan hardcode `NEXT_PUBLIC_*` di `cloudbuild.yaml` — biarkan trigger baca dari Cloud Run env
- ❌ Jangan tambah API route baru tanpa `requireAuthedUser` kecuali memang public (Places/YouTube)
- ❌ Jangan commit `.env` (sudah di `.gitignore`)
- ❌ Jangan ubah `Dockerfile` runner stage tanpa update Cloud Run env juga
- ❌ Jangan delete `firestore.rules` — itu satu-satunya barrier antara user data dan public access

## Referensi Cepat

- Firebase Console: https://console.firebase.google.com/project/re-vibe-496006-4f8a2
- Cloud Run service: https://console.cloud.google.com/run/detail/asia-southeast2/re-vibe?project=re-vibe-496006
- Cloud Build triggers: https://console.cloud.google.com/cloud-build/triggers?project=re-vibe-496006
- Artifact Registry: `asia-southeast2-docker.pkg.dev/re-vibe-496006/cloud-run-source-deploy/re-vibe`
- GCS bucket: `gs://re-vibe-uploads/` (region `asia-southeast2`)
- Gemini API quota dashboard: https://ai.dev/rate-limit
