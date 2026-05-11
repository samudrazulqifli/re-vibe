"use client";

import React, { useEffect, useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  ShoppingBag, 
  BookOpen, 
  ChevronRight, 
  Info, 
  TrendingDown, 
  AlertCircle,
  Banknote,
  LayoutGrid,
  InfoIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

export default function RecommendPage() {
  const router = useRouter();
  const { currentAnalysis, recommendation, setRecommendation, setSelectedAction, userDescription } = useReVibeStore();
  const [isLoading, setIsLoading] = useState(true);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    if (!currentAnalysis) {
      router.push('/upload');
      return;
    }

    const fetchRecommendation = async () => {
      try {
        const response = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: currentAnalysis.itemName,
            itemCategory: currentAnalysis.itemCategory,
            damageTypes: currentAnalysis.damageTypes,
            severity: currentAnalysis.severity,
            severityScore: currentAnalysis.severityScore,
            userDescription
          }),
        });

        if (!response.ok) throw new Error('Gagal memuat rekomendasi');

        const data = await response.json();
        setRecommendation(data);
      } catch (err) {
        console.error('Recommend fetch error:', err);
        toast.error('Gagal mengambil rekomendasi AI.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendation();
  }, [currentAnalysis, router, setRecommendation, userDescription]);

  const handleAction = (type: 'service' | 'diy' | 'buy') => {
    setSelectedAction(type);
    if (type === 'service') router.push('/service');
    else if (type === 'diy') router.push('/diy');
    else if (type === 'buy') router.push('/shop');
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-white flex flex-col min-h-screen">
        <TopBar title="Mencari Solusi..." />
        <div className="p-6 flex flex-col gap-6">
          <div className="h-48 w-full bg-gray-100 animate-pulse rounded-[32px]" />
          <div className="h-32 w-full bg-gray-50 animate-pulse rounded-[32px]" />
          <div className="space-y-4">
            <div className="h-24 w-full bg-gray-100 animate-pulse rounded-[28px]" />
            <div className="h-24 w-full bg-gray-100 animate-pulse rounded-[28px]" />
            <div className="h-24 w-full bg-gray-100 animate-pulse rounded-[28px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen pb-12">
      <TopBar title="Rekomendasi Re-Vibe" />
      
      <div className="p-6 flex flex-col gap-6">
        {/* Recommendation Primary Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-8 rounded-[40px] flex flex-col gap-4 shadow-xl border",
            recommendation.recommendation === 'buy' 
              ? "bg-gray-900 border-gray-800 text-white" 
              : "bg-primary border-primary/20 text-white"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              {recommendation.recommendation === 'service' && <Wrench size={20} />}
              {recommendation.recommendation === 'diy' && <BookOpen size={20} />}
              {recommendation.recommendation === 'buy' && <ShoppingBag size={20} />}
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Saran AI: {
              recommendation.recommendation === 'service' ? 'Servis Profesional' :
              recommendation.recommendation === 'diy' ? 'Perbaikan Mandiri' : 'Beli Baru'
            }</h3>
          </div>
          
          <p className="text-xl font-bold leading-tight">
            "{recommendation.primaryReasoning}"
          </p>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10">
            <TrendingDown size={14} className="text-accent" />
            <span>Biaya Servis ~{recommendation.costRatioPercent}% Harga Baru</span>
          </div>
        </motion.div>

        {/* Cost Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Wrench size={12} />
              Biaya Servis
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900">
                {formatIDR(recommendation.serviceCostMin)}
              </span>
              <span className="text-[10px] font-bold text-gray-400">s/d {formatIDR(recommendation.serviceCostMax)}</span>
            </div>
          </div>
          <div className="p-5 bg-gray-50 rounded-[32px] border border-gray-100 flex flex-col gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={12} />
              Harga Baru
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900">
                {formatIDR(recommendation.newProductPriceMin)}
              </span>
              <span className="text-[10px] font-bold text-gray-400">s/d {formatIDR(recommendation.newProductPriceMax)}</span>
            </div>
          </div>
        </div>

        {/* Action Choices */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Pilih Langkah Berikutnya</h4>
          
          {/* Action: Service */}
          <button 
            onClick={() => handleAction('service')}
            className={cn(
              "p-6 rounded-[32px] border flex items-center gap-6 text-left transition-all active:scale-[0.98]",
              recommendation.recommendation === 'service' 
                ? "bg-white border-primary shadow-lg shadow-primary/5" 
                : "bg-gray-50 border-gray-100"
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Wrench size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <h5 className="font-black text-gray-900">Panggil Jasa Servis</h5>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-500 font-bold leading-tight">Teknisi profesional akan menangani kerusakan ini dengan aman.</p>
            </div>
          </button>

          {/* Action: DIY */}
          <button 
            disabled={!recommendation.diyPossible}
            onClick={() => handleAction('diy')}
            className={cn(
              "p-6 rounded-[32px] border flex items-center gap-6 text-left transition-all active:scale-[0.98]",
              !recommendation.diyPossible ? "opacity-50 grayscale cursor-not-allowed bg-gray-50 border-gray-100" :
              recommendation.recommendation === 'diy' 
                ? "bg-white border-accent shadow-lg shadow-accent/5" 
                : "bg-gray-50 border-gray-100"
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-gray-900 shadow-lg shadow-accent/20">
              <BookOpen size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <h5 className="font-black text-gray-900">Perbaiki Sendiri</h5>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-500 font-bold leading-tight">
                {recommendation.diyPossible 
                  ? `Ikuti panduan perbaikan ${recommendation.diyDifficulty}.` 
                  : "Tidak direkomendasikan untuk kerusakan ini."}
              </p>
            </div>
          </button>

          {/* Action: New */}
          <button 
            onClick={() => handleAction('buy')}
            className={cn(
              "p-6 rounded-[32px] border flex items-center gap-6 text-left transition-all active:scale-[0.98]",
              recommendation.recommendation === 'buy' 
                ? "bg-white border-gray-900 shadow-lg shadow-gray-900/5" 
                : "bg-gray-50 border-gray-100"
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-lg shadow-gray-900/20">
              <ShoppingBag size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <h5 className="font-black text-gray-900">Beli Barang Baru</h5>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-500 font-bold leading-tight">Harga baru lebih masuk akal dibandingkan biaya servis.</p>
            </div>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <InfoIcon size={16} />
          </div>
          <div className="flex flex-col gap-1">
            <h6 className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Catatan Penting</h6>
            <p className="text-[10px] text-amber-700/80 leading-relaxed font-bold">
              Keputusan akhir tetap di tanganmu. Re-Vibe AI memberikan estimasi berdasarkan visual dan database pasar. Harga di lokasi Anda mungkin berbeda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
