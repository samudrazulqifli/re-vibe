"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Globe, Zap, Sprout } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: "Kenali Masalah Barangmu",
    subtitle: "Gunakan AI Vision untuk mendeteksi kerusakan hanya dengan satu jepretan foto.",
    icon: Zap,
    color: "bg-amber-500"
  },
  {
    id: 2,
    title: "Saran Reparasi Cerdas",
    subtitle: "Dapatkan estimasi biaya dan pilihan teknisi terdekat di sekitar Jakarta.",
    icon: Globe,
    color: "bg-primary"
  },
  {
    id: 3,
    title: "Sayangi Lingkungan",
    subtitle: "Turut serta mengurangi sampah elektronik di Indonesia dengan memilih reparasi.",
    icon: Sprout,
    color: "bg-secondary"
  }
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  const next = () => {
    if (current === slides.length - 1) {
      router.push('/');
    } else {
      setCurrent(current + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center text-center gap-12"
          >
            <div className={cn("w-48 h-48 rounded-[64px] flex items-center justify-center text-white shadow-2xl relative rotate-3", slides[current].color)}>
               {React.createElement(slides[current].icon, { size: 80, strokeWidth: 1.5 })}
               <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/20 rounded-full blur-2xl" />
            </div>
            
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                {slides[current].title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                {slides[current].subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-12 flex flex-col gap-8">
        <div className="flex gap-2 justify-center">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                i === current ? "w-10 bg-primary" : "w-2 bg-gray-200"
              )} 
            />
          ))}
        </div>

        <button 
          onClick={next}
          className="w-full bg-gray-900 text-white font-black py-6 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-[0.98]"
        >
          <span>{current === slides.length - 1 ? 'MULAI SEKARANG' : 'SELANJUTNYA'}</span>
          <ArrowRight size={24} />
        </button>

        {current !== slides.length - 1 && (
          <button 
            onClick={() => router.push('/')}
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
          >
            Lewati Onboarding
          </button>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
