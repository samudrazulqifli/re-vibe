"use client";

import React, { useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/src/lib/utils';
import { authFetch } from '@/src/lib/firebase/auth-fetch';

export default function PreviewPage() {
  const router = useRouter();
  const { uploadedPhoto, photoPreviewUrl, setDescription, userDescription, setPhoto, setUploadedImageUrl } = useReVibeStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!photoPreviewUrl || !uploadedPhoto) {
    if (typeof window !== 'undefined') router.push('/upload');
    return null;
  }

  const handleUploadAndAnalyze = async () => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', uploadedPhoto);

      // We'd normally use progress event but fetch doesn't support it directly
      // We simulate progress for UX
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 100);

      const response = await authFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Gagal mengunggah foto');
      }

      const data = await response.json();
      console.log('Upload successful:', data.url);
      setUploadedImageUrl(data.url);
      
      // Successfully uploaded! Navigate to analysis which will fetch from Gemini via server route
      router.push('/analyze');
    } catch (error) {
      console.error('Upload flow error:', error);
      toast.error('Gagal mengunggah gambar. Silakan coba lagi.');
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <TopBar title="Preview Foto" />
      
      <div className="flex-1 flex flex-col gap-8 pb-12">
        <div className="relative w-full aspect-[4/5] bg-gray-50 flex items-center justify-center overflow-hidden">
          <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
          
          <button 
            onClick={() => router.push('/upload')}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-lg border border-white/30 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/30 transition-colors"
          >
            <RefreshCw size={18} />
            <span>Ganti Foto</span>
          </button>
        </div>

        <div className="px-6 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <Sparkles size={12} className="text-accent" />
              Ceritakan keluhanmu
            </label>
            <textarea 
              placeholder="Contoh: tombol tidak bisa ditekan, layar retak di pojok kiri..."
              className="w-full h-32 p-5 rounded-3xl bg-gray-50 border border-gray-100 focus:border-primary/30 focus:shadow-sm focus:outline-none text-sm resize-none placeholder:text-gray-300 font-medium leading-relaxed"
              value={userDescription}
              onChange={(e) => setDescription(e.target.value)}
            />
          </motion.div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertCircle size={16} className="text-primary" />
            </div>
            <p className="text-[11px] text-primary/80 leading-relaxed font-medium">
              AI akan menganalisis foto dan deskripsi kamu untuk memberikan rekomendasi servis atau perbaikan mandiri.
            </p>
          </div>

          <button 
            disabled={isUploading}
            onClick={handleUploadAndAnalyze}
            className={cn(
              "w-full bg-primary text-white font-black py-6 rounded-[24px] shadow-xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-[0.98] transition-all relative overflow-hidden",
              isUploading && "opacity-80 scale-95"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Sedang Mengirim... {uploadProgress}%</span>
              </>
            ) : (
              <>
                <span>Analisa Sekarang</span>
                <ArrowRight size={20} />
              </>
            )}
            
            {isUploading && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
