"use client";

import React, { useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, ArrowRight, Wrench, Sprout, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function ResultPage() {
  const router = useRouter();
  const { currentAnalysis, photoPreviewUrl, setAnalysis } = useReVibeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    itemName: currentAnalysis?.itemName || '',
    damageTypes: currentAnalysis?.damageTypes?.join(', ') || ''
  });

  if (!currentAnalysis || !photoPreviewUrl) return null;

  const severityStyles = {
    ringan: "bg-green-50 text-green-600 border-green-100",
    sedang: "bg-orange-50 text-orange-600 border-orange-100",
    parah: "bg-red-50 text-red-600 border-red-100"
  };

  const handleSaveEdit = () => {
    setAnalysis({
      ...currentAnalysis,
      itemName: editForm.itemName,
      damageTypes: editForm.damageTypes.split(',').map(s => s.trim())
    });
    setIsEditing(false);
  };

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen pb-12">
      <TopBar title="Hasil Deteksi" />
      
      <div className="p-6 flex flex-col gap-6">
        {/* Warning Banner */}
        {currentAnalysis.confidence! < 60 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3"
          >
            <AlertCircle size={20} className="text-amber-500" />
            <p className="text-[11px] font-bold text-amber-700 leading-tight">
              AI kurang yakin dengan hasil ini. Pastikan foto cukup jelas dan cerahkan pencahayaan.
            </p>
          </motion.div>
        )}

        {/* Hero Image with Overlay */}
        <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl group">
          <img src={photoPreviewUrl} className="w-full h-full object-cover" alt="Result" />
          
          {/* Annotation Overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-20">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="w-full aspect-square border-4 border-dashed border-red-500 rounded-full bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)] relative"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                Area Kerusakan
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-[24px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <ShieldCheck size={20} className="text-gray-900" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Tingkat Akurasi</span>
                <span className="text-sm font-black text-white">{currentAnalysis.confidence?.toFixed(1)}% Akurat</span>
              </div>
            </div>
            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${currentAnalysis.confidence}%` }}
                className={cn(
                  "h-full rounded-full",
                  currentAnalysis.confidence! > 80 ? "bg-green-400" : "bg-accent"
                )}
              />
            </div>
          </div>
        </div>

        {/* Analysis Result Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100 flex flex-col gap-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{currentAnalysis.itemCategory}</span>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{currentAnalysis.itemName}</h2>
            </div>
            <div className={cn(
              "px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
              severityStyles[currentAnalysis.severity as keyof typeof severityStyles]
            )}>
              {currentAnalysis.severity}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Wrench size={14} className="text-primary" />
              Detail Kerusakan
            </h4>
            <ul className="grid grid-cols-1 gap-3">
              {currentAnalysis.damageTypes?.map((damage, i) => (
                <li key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-bold text-gray-700">{damage}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
            "{currentAnalysis.damageDescription}"
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.push('/recommend')}
            className="w-full bg-primary text-white font-black py-6 rounded-[24px] shadow-xl shadow-primary/20 flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
          >
            <Check size={20} />
            <span>Hasil Sudah Benar</span>
          </button>
          
          <button 
            onClick={() => setIsEditing(true)}
            className="w-full bg-gray-50 text-gray-900 font-black py-6 rounded-[24px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all"
          >
            <Edit2 size={20} className="text-gray-400" />
            <span>Edit Deskripsi</span>
          </button>
        </div>
      </div>

      {/* Edit Bottom Sheet */}
      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[101] p-8 flex flex-col gap-8 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Perbarui Info</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-900">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nama Barang</label>
                  <input 
                    type="text"
                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold focus:outline-none focus:border-primary/30"
                    value={editForm.itemName}
                    onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Jenis Kerusakan (pisahkan koma)</label>
                  <textarea 
                    className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold focus:outline-none focus:border-primary/30 h-24 resize-none"
                    value={editForm.damageTypes}
                    onChange={(e) => setEditForm({ ...editForm, damageTypes: e.target.value })}
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveEdit}
                className="w-full bg-gray-900 text-white font-black py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-3"
              >
                Simpan Perubahan
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
