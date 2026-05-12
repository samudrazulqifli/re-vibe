"use client";

import React from 'react';
import { Camera, Image as ImageIcon, Sparkles, Sprout, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/src/lib/firebase/auth-context';

interface HomeProps {
  onCapture: (file: File) => void;
}

export function Home({ onCapture }: HomeProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Sobat';

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-2"
      >
        <span className="text-xs font-bold text-gray-400 tracking-wide">Hai, {firstName} 👋</span>
        <span className="text-secondary font-bold text-sm tracking-wide uppercase">#JuaraVibeCoding</span>
        <h2 className="text-3xl font-bold text-gray-900 leading-tight">
          Hemat Uang, <br />
          <span className="text-primary">Selamatkan Bumi.</span>
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-[280px]">
          Rusak? AI bantu kamu putuskan: perbaiki atau beli baru.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <FeatureSmall 
          icon={<Sparkles className="w-5 h-5 text-accent" />}
          text="AI Vision Analysis"
        />
        <FeatureSmall 
          icon={<Wrench className="w-5 h-5 text-primary" />}
          text="Jasa Servis Terdekat"
        />
        <FeatureSmall 
          icon={<ImageIcon className="w-5 h-5 text-secondary" />}
          text="DIY Tutorials"
        />
        <FeatureSmall 
          icon={<Sprout className="w-5 h-5 text-green-600" />}
          text="Sustainability"
        />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="relative group">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleFileChange}
          />
          <button className="w-full bg-primary text-white p-6 rounded-3xl font-bold flex items-center justify-center gap-4 shadow-xl shadow-primary/20 hover:scale-[0.98] transition-transform">
            <Camera className="w-6 h-6" />
            <span>Ambil Foto Kerusakan</span>
          </button>
        </div>
        
        <div className="relative group">
          <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleFileChange}
          />
          <button className="w-full bg-white text-gray-700 border-2 border-gray-100 p-4 rounded-3xl font-bold flex items-center justify-center gap-4 hover:bg-gray-50 transition-colors">
            <ImageIcon className="w-5 h-5 text-gray-400" />
            <span>Upload dari Galeri</span>
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl h-fit">
          <Sparkles className="text-primary w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-gray-900">Program Indonesia Hijau</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Dibuat untuk <strong>#JuaraVibeCoding</strong> oleh Google for Developers Indonesia. 
            Setiap komponen yang kamu perbaiki membantu mengurangi sampah elektronik.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureSmall({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="bg-white border border-gray-100 p-4 rounded-3xl flex flex-col gap-3 shadow-sm">
      {icon}
      <span className="text-xs font-bold text-gray-800 leading-tight">{text}</span>
    </div>
  );
}
