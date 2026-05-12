"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Microscope, Zap, ShieldCheck, AlertCircle, RefreshCw, Sprout } from 'lucide-react';
import { authFetch } from '@/src/lib/firebase/auth-fetch';
import toast from 'react-hot-toast';

const steps = [
  { icon: Microscope, text: "Mengidentifikasi jenis barang..." },
  { icon: Zap, text: "Mendeteksi kerusakan..." },
  { icon: ShieldCheck, text: "Menghitung estimasi biaya..." }
];

export default function AnalyzePage() {
  const router = useRouter();
  const { photoPreviewUrl, uploadedImageUrl, userDescription, setAnalysis } = useReVibeStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadedImageUrl) {
      router.push('/upload');
      return;
    }

    const analyzeImage = async () => {
      try {
        const response = await authFetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageUrl: uploadedImageUrl,
            userDescription 
          }),
        });

        if (!response.ok) throw new Error('Gagal menganalisis gambar');

        const result = await response.json();
        setAnalysis(result);
        
        // Wait a small bit for dramatic effect
        setTimeout(() => {
          router.push('/result');
        }, 1500);
      } catch (err) {
        console.error('Analysis error:', err);
        setError('Terjadi kesalahan saat menganalisis. Mohon coba lagi.');
        toast.error('Gagal menganalisis gambar.');
      }
    };

    analyzeImage();

    // Rotate status texts
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [uploadedImageUrl, userDescription, router, setAnalysis]);

  if (error) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={40} className="text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-900">Analisis Gagal</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Coba Lagi
          </button>
          <button 
            onClick={() => router.push('/upload')}
            className="w-full bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center gap-10">
      {/* Thumbnail */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-3"
      >
        <img src={photoPreviewUrl || ''} alt="Preview" className="w-full h-full object-cover" />
      </motion.div>

      {/* Pulse Logo Animation */}
      <div className="relative">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary rounded-full blur-2xl"
        />
        <div className="relative w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sprout size={48} className="text-primary" />
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">AI Sedang Menganalisa</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Re-Vibe Diagnostic Engine v1.0</p>
      </div>

      {/* Rotating Status */}
      <div className="w-full max-w-xs h-16 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary">
              {React.createElement(steps[currentStep].icon, { size: 18 })}
            </div>
            <span className="text-xs font-bold text-gray-700">{steps[currentStep].text}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-1/2 h-full bg-primary"
        />
      </div>
    </div>
  );
}
