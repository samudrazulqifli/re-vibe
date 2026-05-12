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
