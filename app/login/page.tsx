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
