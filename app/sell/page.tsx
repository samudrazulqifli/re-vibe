"use client";

import React, { useEffect, useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { saveAnalysis } from '@/src/lib/history';
import { useAuth } from '@/src/lib/firebase/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Trash2, 
  DollarSign, 
  MapPin, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  Store,
  Facebook,
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

interface ScrapData {
  scrapValueRange: string;
  weightEstimate: string;
  tips: string[];
}

export default function SellPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentAnalysis, resetFlow } = useReVibeStore();
  
  const [scrapData, setScrapData] = useState<ScrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTipsExpanded, setIsTipsExpanded] = useState(false);

  useEffect(() => {
    if (!currentAnalysis) {
      router.push('/upload');
      return;
    }

    const fetchScrapValue = async () => {
      try {
        const response = await fetch('/api/scrap-value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: currentAnalysis.itemName,
            itemCategory: currentAnalysis.itemCategory
          })
        });

        if (!response.ok) throw new Error('Failed to load scrap value');
        const data = await response.json();
        setScrapData(data);
      } catch (err) {
        console.error('Scrap Value fetch error:', err);
        // Fallback data
        setScrapData({
          scrapValueRange: "Rp 15.000 - Rp 50.000",
          weightEstimate: "2 - 5 kg",
          tips: [
            "Bersihkan debu kasar agar barang terlihat lebih terawat.",
            "Siapkan kardus original jika masih ada untuk menambah nilai jual.",
            "Tawarkan ke lebih dari satu pengepul untuk mendapatkan harga terbaik."
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchScrapValue();
  }, [currentAnalysis, router]);

  const handleFinish = async () => {
    if (currentAnalysis && user) {
      const { recommendation, selectedAction } = useReVibeStore.getState();
      try {
        await saveAnalysis(user.uid, {
          ...currentAnalysis,
          id: crypto.randomUUID(),
          imageUrl: currentAnalysis.imageUrl || '',
          timestamp: Date.now(),
          recommendation: recommendation || undefined,
          selectedAction: selectedAction || undefined
        } as any);
      } catch (e) {
        console.error(e);
      }
    }
    resetFlow();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-white min-h-screen flex flex-col">
        <TopBar title="Mencari Penawaran..." />
        <div className="p-8 flex flex-col gap-8 items-center justify-center flex-1">
          <div className="w-24 h-24 rounded-full bg-gray-50 border-4 border-dashed border-gray-200 animate-spin flex items-center justify-center text-gray-300">
            <Trash2 size={40} />
          </div>
          <div className="flex flex-col gap-2 text-center">
            <h3 className="text-xl font-black text-gray-900 animate-pulse">Menghitung Nilai Bekas...</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              AI sedang membandingkan harga pasar pengepul
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen pb-12">
      <TopBar title="Jual Barang Lama" />

      <div className="p-6 flex flex-col gap-8">
        {/* Illustration & Intro */}
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-40 h-40 rounded-[48px] bg-accent/10 flex items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl animate-pulse" />
            <Package size={80} className="text-accent relative z-10" />
            <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center">
              <DollarSign size={32} className="text-secondary" />
            </div>
          </motion.div>
          
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Jangan Dibuang Dulu!</h2>
            <p className="text-sm text-gray-500 font-medium px-4 leading-relaxed">
              Barang rusakmu masih bisa dijual. Lumayan buat nambahin budget beli baru!
            </p>
          </div>
        </div>

        {/* Estimated Value Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-[40px] p-8 text-white flex flex-col gap-6 shadow-2xl shadow-gray-900/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={120} />
          </div>
          
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Estimasi Nilai Rongsok</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black tracking-tighter">{scrapData?.scrapValueRange.split(' – ')[0]}</h3>
              <span className="text-sm text-white/40 font-bold">sampai {scrapData?.scrapValueRange.split(' – ')[1]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-white/10 relative z-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Estimasi Berat</span>
              <span className="text-sm font-black">{scrapData?.weightEstimate}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 flex flex-col">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Kategori</span>
              <span className="text-sm font-black uppercase text-accent truncate">{currentAnalysis?.itemCategory}</span>
            </div>
          </div>
        </motion.div>

        {/* Selling Options */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Pilih Cara Jual</h4>
          
          {/* Option: Pengepul */}
          <div className="bg-gray-50 rounded-[32px] border border-gray-100 p-6 flex flex-col gap-5 group hover:bg-white hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg shadow-secondary/20">
                <Store size={28} />
              </div>
              <div className="flex-1 flex flex-col">
                <h5 className="font-black text-gray-900">Jual ke Pengepul</h5>
                <p className="text-[11px] text-gray-500 font-bold">Cepat laku, bayar di tempat.</p>
              </div>
            </div>
            <button 
              onClick={() => window.open(`https://www.google.com/maps/search/pengepul+barang+bekas+dekat+saya`, '_blank')}
              className="w-full bg-white text-gray-900 font-black py-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
              <MapPin size={18} className="text-secondary" />
              <span>Cari Pengepul Terdekat</span>
            </button>
          </div>

          {/* Option: OLX / Carousell */}
          <div className="bg-gray-50 rounded-[32px] border border-gray-100 p-6 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#23E5DB] flex items-center justify-center text-white shadow-lg shadow-[#23E5DB]/20">
                <Package size={28} />
              </div>
              <div className="flex-1 flex flex-col">
                <h5 className="font-black text-gray-900">Pasang Iklan Online</h5>
                <p className="text-[11px] text-gray-500 font-bold">Cocok untuk barang bernilai tinggi.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.open(`https://www.olx.co.id/items/q-${encodeURIComponent(currentAnalysis?.itemName || '')}`, '_blank')}
                className="bg-white text-[11px] font-black py-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-center gap-2"
              >
                OLX Indonesia
                <ExternalLink size={12} />
              </button>
              <button 
                onClick={() => window.open(`https://www.carousell.com/id/search/${encodeURIComponent(currentAnalysis?.itemName || '')}`, '_blank')}
                className="bg-white text-[11px] font-black py-4 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-center gap-2"
              >
                Carousell
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Option: Facebook */}
          <button 
            onClick={() => window.open(`https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(currentAnalysis?.itemName || '')}`, '_blank')}
            className="p-6 rounded-[32px] bg-[#1877F2] text-white flex items-center gap-6 shadow-xl shadow-[#1877F2]/20 active:scale-[0.98] transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Facebook size={28} />
            </div>
            <div className="flex-1 text-left">
              <h5 className="font-black">Facebook Marketplace</h5>
              <p className="text-[11px] text-white/70 font-bold">Jual ke komunitas sekitarmu.</p>
            </div>
          </button>
        </div>

        {/* Collapsible Tips */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsTipsExpanded(!isTipsExpanded)}
            className="w-full flex items-center justify-between p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Sparkles size={20} />
              </div>
              <span className="text-sm font-black text-gray-900">Tips Agar Cepat Terjual</span>
            </div>
            {isTipsExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {isTipsExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-gray-50 border border-gray-100 rounded-[32px] flex flex-col gap-4">
                  {scrapData?.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-xs text-gray-600 font-bold leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-6 mt-4">
          <button 
            onClick={() => router.push('/shop')}
            className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest group"
          >
            <span>Lewati, langsung ke produk baru</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={handleFinish}
            className="w-full bg-gray-900 text-white font-black py-6 rounded-[28px] shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <CheckCircle2 size={24} className="text-accent" />
            <span>Selesai & Simpan Hasil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
