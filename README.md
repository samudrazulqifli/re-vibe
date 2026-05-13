# Re-Vibe 🛠️✨

**AI bantu kamu putuskan: perbaiki atau beli baru?**

PWA mobile-first untuk pemilik rumah di Indonesia. Foto barang rusak → AI (Gemini Vision) deteksi kerusakan → rekomendasi servis / DIY / beli baru, lengkap dengan tempat servis terdekat, panduan DIY, dan tutorial YouTube.

![JuaraVibeCoding](https://img.shields.io/badge/%23JuaraVibeCoding-2026-blue?style=for-the-badge&logo=google)

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion, Lucide icons |
| State | Zustand (UI state), Firestore (per-user data) |
| Auth | Firebase Auth (Google Sign-In only) |
| AI | Google Gemini 2.5 Flash Lite (vision + text) |
| Maps | Google Places API (New) + Maps JS SDK |
| Storage | Google Cloud Storage (foto upload) |
| Deploy | Cloud Build → Artifact Registry → Cloud Run |
| Region | asia-southeast2 (Jakarta) |

## Quick Start

```bash
# 1. Install
npm install

# 2. Copy env template
cp .env.example .env
# isi nilai-nilai sesuai instruksi di .env.example

# 3. (Opsional, untuk upload + admin SDK) login gcloud
gcloud auth application-default login
gcloud config set project re-vibe-496006

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

## Dokumentasi

- **[CLAUDE.md](./CLAUDE.md)** — panduan lengkap arsitektur, pola kode, cara nambah fitur (manual atau pakai AI). **Wajib dibaca** sebelum modify code.
- `.env.example` — daftar lengkap environment variables + sumbernya.

## Struktur Project

```
re-vibe/
├── app/                          # Next.js App Router pages & API routes
│   ├── api/                      # Server-side endpoints
│   ├── welcome/, login/          # Public routes (no auth)
│   ├── onboarding/               # Public 3-slide tutorial
│   ├── profile/, history/        # Protected routes (auth required)
│   ├── upload/, analyze/, ...    # Core analysis flow
│   └── layout.tsx                # Root layout (wraps AuthProvider + AuthGuard)
├── src/
│   ├── components/               # Shared UI components
│   │   └── auth/                 # AuthGuard, GoogleSignInButton
│   ├── hooks/                    # Custom React hooks
│   ├── lib/
│   │   ├── firebase/             # client.ts, admin.ts, auth-context.tsx, ...
│   │   ├── storage.ts            # GCS upload helper
│   │   ├── genai.ts              # Gemini retry + model fallback
│   │   ├── store.ts              # Zustand (UI state)
│   │   ├── history.ts            # Firestore CRUD re-exports
│   │   └── types.ts              # TypeScript shared types
│   └── services/                 # Domain helpers
├── public/                       # Static assets, PWA manifest
├── firestore.rules               # Per-user access rules
├── firebase.json, .firebaserc    # Firebase CLI config
├── Dockerfile                    # Multi-stage build, accepts NEXT_PUBLIC_* ARGs
├── cloudbuild.yaml               # Reference build (trigger override-nya yang aktif)
└── next.config.mjs               # PWA + env var exposure
```

## Auth Flow

```
First visit  → /welcome  →  /login  →  Google popup  →  /  (home)
                       ↘  /onboarding (Pelajari Cara Kerja)
Returning    → /  (Firebase SDK auto-restore session)
Logout       → /login
```

Routes di-gate oleh `<AuthGuard>` di `app/layout.tsx`. Public list: `/welcome`, `/onboarding`, `/login`. Yang lain wajib login.

## Deployment

Auto-deploy via Cloud Build trigger di **push ke `master`**:

1. GitHub push → trigger Cloud Build (project `re-vibe-496006`)
2. Build step #1 (`ReadEnv`): baca semua `NEXT_PUBLIC_*` dari Cloud Run env vars (`re-vibe` service di `asia-southeast2`) → tulis ke `/workspace/build-args.txt`
3. Build step #2 (`Build`): `docker build` dengan `--build-arg` dari file tersebut → Next.js bake values ke client bundle
4. Build step #3 (`Push`): push image ke Artifact Registry
5. Build step #4 (`Deploy`): `gcloud run services update re-vibe` → traffic 100% ke revision baru

**Penting**: untuk env var yang dipakai client-side (`<APIProvider>`, Firebase client, dll), set di Cloud Run dengan prefix `NEXT_PUBLIC_*`. Trigger akan otomatis pass sebagai `--build-arg` — tidak perlu hardcode di yaml. Detail di [CLAUDE.md](./CLAUDE.md#deployment--ci-flow).

## Production URLs

- App: https://re-vibe-287334421454.asia-southeast2.run.app
- Firebase Console: https://console.firebase.google.com/project/re-vibe-496006-4f8a2
- Cloud Run: https://console.cloud.google.com/run/detail/asia-southeast2/re-vibe?project=re-vibe-496006

---
Dibuat dengan ❤️ untuk komunitas #JuaraVibeCoding
