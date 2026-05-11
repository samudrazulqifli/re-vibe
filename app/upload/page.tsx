"use client";

import React, { useEffect, useState, useRef } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { Camera, Image as ImageIcon, Zap, RefreshCcw, XCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { useCamera } from '@/src/hooks/useCamera';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoRef, startCamera, stopCamera, capturePhoto, error, permissionState } = useCamera();
  const { setPhoto } = useReVibeStore();
  const [isFlashOn, setIsFlashOn] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    const blob = await capturePhoto();
    if (blob) {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);
      setPhoto(file, url);
      router.push('/upload/preview');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(file, url);
      router.push('/upload/preview');
    }
  };

  if (permissionState === 'denied') {
    return (
      <div className="flex-1 bg-white flex flex-col">
        <TopBar title="Pindai Barang" />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={40} className="text-destructive" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold text-gray-900">Izin Kamera Ditolak</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Kami membutuhkan akses kamera untuk menganalisis kerusakan barang secara langsung. 
              Mohon izinkan kamera pada pengaturan browser Anda atau gunakan pilihan galeri.
            </p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-primary text-white font-bold py-5 rounded-[24px] shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            <ImageIcon size={20} />
            <span>Pilih dari Galeri</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-950 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="p-6 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
            <XCircle size={24} />
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={cn(
                "w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors",
                isFlashOn ? "bg-accent text-gray-900" : "bg-white/10 text-white"
              )}
            >
              <Zap size={20} fill={isFlashOn ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => startCamera()}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
            >
              <RefreshCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        
        {/* Rounded Rect Guide Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[80%] aspect-[4/5] max-h-[60%] border-2 border-white/50 rounded-[48px] relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex flex-col items-center justify-center gap-1 text-white border border-white/10"
          >
            <ImageIcon size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">Galeri</span>
          </button>

          <button 
            onClick={handleCapture}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl relative active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary" />
            </div>
          </button>

          <div className="w-14 h-14" /> {/* Spacer */}
        </div>
        
        <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest mt-6">
          Arahkan kamera ke bagian yang rusak
        </p>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </div>
  );
}
