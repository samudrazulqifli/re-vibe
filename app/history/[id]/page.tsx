"use client";

import React, { useEffect, useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter, useParams } from 'next/navigation';
import { getAnalysisById, deleteAnalysis } from '@/src/lib/history';
import { useAuth } from '@/src/lib/firebase/auth-context';
import { AnalysisRecord } from '@/src/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Share2, 
  Trash2, 
  Calendar, 
  AlertCircle,
  Wrench,
  BookOpen,
  ShoppingBag,
  RefreshCcw,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'diy' | 'shop' | 'sell'>('summary');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAnalysisById(user.uid, id)
      .then((data) => {
        if (data) setRecord(data);
        else router.push('/history');
      })
      .catch((e) => { console.error(e); toast.error('Gagal memuat detail'); })
      .finally(() => setLoading(false));
  }, [user, id, router]);

  const handleDelete = async () => {
    if (!user) return;
    await deleteAnalysis(user.uid, id);
    toast.success('Analisa berhasil dihapus');
    router.push('/history');
  };

  const handleShare = async () => {
    if (!record) return;
    const text = `Hasil analisa Re-Vibe untuk ${record.itemName}:\nSaran: ${record.recommendation?.recommendation === 'service' ? 'Servis Profesional' : record.recommendation?.recommendation === 'diy' ? 'Perbaikan Mandiri' : 'Beli Baru'}\n\nAnalisa oleh Re-Vibe AI.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hasil Analisa Re-Vibe',
          text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share error:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Rangkuman disalin ke clipboard');
    }
  };

  if (loading) return null;
  if (!record) return null;

  return (
    <div className="flex-1 bg-white min-h-screen flex flex-col pb-12">
      <TopBar 
        title={record.itemName} 
        actions={
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-2 text-gray-500 hover:text-primary">
              <Share2 size={20} />
            </button>
            <button onClick={() => setShowConfirmDelete(true)} className="p-2 text-gray-500 hover:text-red-500">
              <Trash2 size={20} />
            </button>
          </div>
        }
      />

      <div className="relative h-64 w-full">
        <Image 
          src={record.imageUrl} 
          alt={record.itemName}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} />
              {new Date(record.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">{record.itemName}</h2>
          </div>
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
            record.selectedAction === 'service' ? "bg-primary text-white" :
            record.selectedAction === 'diy' ? "bg-accent text-gray-900" :
            "bg-white text-gray-900"
          )}>
            {record.selectedAction === 'service' ? 'DI-SERVICE' : record.selectedAction === 'diy' ? 'DIY' : 'BELI BARU'}
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Detail Ringkasan */}
        <div className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temuan Kerusakan</span>
            <div className="flex flex-wrap gap-2">
              {record.damageTypes.map((t, i) => (
                <div key={i} className="px-3 py-1 bg-white rounded-full border border-gray-100 text-[10px] font-bold text-gray-600">
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tingkat Kerusakan</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900">{record.severity}</span>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                        "h-full rounded-full",
                        record.severityScore > 7 ? "bg-red-400" : record.severityScore > 4 ? "bg-orange-400" : "bg-green-400"
                    )}
                    style={{ width: `${record.severityScore * 10}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rekomendasi AI</span>
              <span className="text-sm font-black text-primary capitalize">{record.recommendation?.recommendation}</span>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-primary/5 rounded-[32px] border border-primary/10 p-6 flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles size={16} />
             </div>
             <h4 className="text-sm font-black text-primary uppercase tracking-widest">Analisis AI Re-Vibe</h4>
           </div>
           <p className="text-sm font-bold text-gray-700 italic leading-relaxed">
             "{record.recommendation?.primaryReasoning}"
           </p>
        </div>

        {/* Quick Links related to the decision */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Lihat Detail Solusi</h4>
          
          <button 
            onClick={() => router.push('/diy')}
            className="p-5 bg-white rounded-[28px] border border-gray-100 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <BookOpen size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-gray-900">Panduan Perbaikan</span>
                <span className="text-[10px] text-gray-400 font-bold">Langkah-langkah DIY</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
          </button>

          <button 
            onClick={() => router.push('/service')}
            className="p-5 bg-white rounded-[28px] border border-gray-100 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wrench size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-gray-900">Jasa Servis Terdekat</span>
                <span className="text-[10px] text-gray-400 font-bold">Cari teknisi profesional</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
          </button>

          <button 
            onClick={() => router.push('/shop')}
            className="p-5 bg-white rounded-[28px] border border-gray-100 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900">
                <ShoppingBag size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-gray-900">Beli Produk Pengganti</span>
                <span className="text-[10px] text-gray-400 font-bold">Cari di marketplace</span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Re-analyze Button */}
        <button 
          onClick={() => {
            // Simplified: navigates back to upload with intent would be better
            // but for now just trigger a new one
            router.push('/upload');
          }}
          className="mt-4 w-full bg-gray-900 text-white font-black py-6 rounded-[28px] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
        >
          <RefreshCcw size={20} />
          <span>Analisa Ulang Barang Ini</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center text-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <Trash2 size={40} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Hapus Riwayat?</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Data analisa barang ini akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleDelete}
                  className="w-full bg-red-500 text-white font-black py-5 rounded-[24px] shadow-xl shadow-red-500/20 active:scale-95 transition-transform"
                >
                  Ya, Hapus
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-xs font-black text-gray-400 uppercase tracking-widest py-4"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
