# Re-Vibe 🛠️✨

**AI bantu kamu putuskan: perbaiki atau beli baru?**

Re-Vibe adalah aplikasi PWA (Progressive Web App) yang dirancang untuk membantu pemilik rumah di Indonesia memperpanjang umur barang elektronik dan rumah tangga mereka. Dengan menggunakan AI Vision (Gemini), Re-Vibe menganalisis kerusakan barang melalui foto dan memberikan rekomendasi cerdas antara memperbaiki sendiri (DIY), mencari tempat servis, atau membeli baru.

![JuaraVibeCoding](https://img.shields.io/badge/%23JuaraVibeCoding-2026-blue?style=for-the-badge&logo=google)

## Fitur Utama

- 📸 **AI Vision Analysis**: Ambil foto barang rusak dan dapatkan diagnosis instan.
- 📍 **Service Center Locator**: Temukan tempat perbaikan terdekat via Google Maps.
- 🔧 **DIY Guides**: Tutorial perbaikan mandiri dari YouTube.
- 📈 **Cost Estimation**: Perbandingan estimasi biaya perbaikan vs beli baru.
- 📱 **PWA Experience**: Install di HP kamu dan akses layaknya aplikasi native.

## Teknologi yang Digunakan

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion
- **AI**: Google Gemini Pro Vision
- **Maps**: Google Maps Platform (Places & Maps JS SDK)
- **Deployment**: Google Cloud Run & Artifact Registry
- **Storage**: Google Cloud Storage (Opsional)

## Persiapan Lokal (Environment Variables)

Salin `.env.local.example` menjadi `.env.local` dan isi kunci API berikut:

- `NEXT_PUBLIC_GEMINI_API_KEY`: Kunci dari Google AI Studio.
- `GOOGLE_MAPS_API_KEY`: Kunci dari Google Cloud Console (aktifkan Maps & Places API).
- `YOUTUBE_API_KEY`: Kunci Data API v3 untuk tutorial video.

## Cara Menjalankan

1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
3. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## Deployment ke Google Cloud Run

Aplikasi ini siap di-deploy menggunakan Google Cloud Build:

1. Pastikan gcloud CLI sudah terinstall dan terkonfigurasi.
2. Jalankan perintah berikut:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

---
Dibuat dengan ❤️ untuk komunitas #JuaraVibeCoding
