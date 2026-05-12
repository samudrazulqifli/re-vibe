"use client";

import React, { useEffect, useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Hammer,
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Youtube,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import { authFetch } from '@/src/lib/firebase/auth-fetch';

interface DIYStep {
  stepNumber: number;
  title: string;
  description: string;
  warning?: string | null;
}

interface DIYGuide {
  title: string;
  estimatedTime: string;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  tools: string[];
  materials: string[];
  steps: DIYStep[];
  safetyNotes: string;
  youtubeSearchQuery: string;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

export default function DIYPage() {
  const router = useRouter();
  const { currentAnalysis, recommendation } = useReVibeStore();
  
  const [guide, setGuide] = useState<DIYGuide | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!currentAnalysis || !recommendation) {
      router.push('/upload');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch DIY Guide
        const guideDataRes = await authFetch('/api/diy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: currentAnalysis.itemName,
            damageTypes: currentAnalysis.damageTypes,
            diyDifficulty: recommendation.diyDifficulty
          })
        });

        if (!guideDataRes.ok) throw new Error('Failed to load DIY guide');
        const guideData: DIYGuide = await guideDataRes.json();
        setGuide(guideData);

        // Fetch YouTube videos
        const youtubeRes = await fetch(`/api/youtube?query=${encodeURIComponent(guideData.youtubeSearchQuery)}`);
        if (youtubeRes.ok) {
          const ytData = await youtubeRes.json();
          setVideos(ytData.videos || []);
        }
      } catch (err) {
        console.error('DIY fetch error:', err);
        toast.error('Gagal memuat panduan perbaikan.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAnalysis, recommendation, router]);

  const handleNext = () => {
    if (guide && activeStep < guide.steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else if (guide && activeStep === guide.steps.length - 1) {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-white min-h-screen flex flex-col">
        <TopBar title="Memuat Panduan..." />
        <div className="p-8 flex flex-col gap-8">
          <div className="h-10 w-3/4 bg-gray-100 animate-pulse rounded-xl" />
          <div className="flex gap-4">
            <div className="h-8 w-24 bg-gray-100 animate-pulse rounded-full" />
            <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-full" />
          </div>
          <div className="aspect-video w-full bg-gray-100 animate-pulse rounded-3xl" />
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-50 animate-pulse rounded-full" />
            <div className="h-4 w-full bg-gray-50 animate-pulse rounded-full" />
            <div className="h-4 w-2/3 bg-gray-50 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!guide) return null;

  const currentStep = guide.steps[activeStep];

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen pb-12">
      <TopBar title="Panduan Perbaikan" />

      {/* Header Info */}
      <div className="px-6 pt-6 flex flex-col gap-4">
        <motion.h2 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-gray-900 leading-tight"
        >
          {guide.title}
        </motion.h2>

        <div className="flex flex-wrap gap-2">
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            guide.difficulty === 'Mudah' ? "bg-green-50 text-green-600 border-green-100" :
            guide.difficulty === 'Sedang' ? "bg-orange-50 text-orange-600 border-orange-100" :
            "bg-red-50 text-red-600 border-red-100"
          )}>
            <Wrench size={12} />
            <span>{guide.difficulty}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100 text-[10px] font-black uppercase tracking-widest">
            <Clock size={12} />
            <span>{guide.estimatedTime}</span>
          </div>
        </div>
      </div>

      {/* Collapsible Tools & Materials */}
      <div className="px-6 mt-6">
        <button 
          onClick={() => setIsToolsExpanded(!isToolsExpanded)}
          className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-[24px] border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Hammer size={18} />
            </div>
            <span className="text-sm font-black text-gray-900">Alat & Bahan</span>
          </div>
          {isToolsExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>
        <AnimatePresence>
          {isToolsExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-gray-50/50 border border-t-0 border-gray-100 rounded-b-[24px] grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alat</h4>
                  <ul className="space-y-1">
                    {guide.tools.map((tool, i) => <li key={i} className="text-xs font-bold text-gray-700">• {tool}</li>)}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bahan</h4>
                  <ul className="space-y-1">
                    {guide.materials.map((mat, i) => <li key={i} className="text-xs font-bold text-gray-700">• {mat}</li>)}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-8">
        {!isCompleted ? (
          <>
            {/* Step Progress */}
            <div className="flex items-center gap-2">
              {guide.steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    i <= activeStep ? "bg-primary" : "bg-gray-100"
                  )}
                />
              ))}
            </div>

            {/* Step Card */}
            <motion.div 
              key={activeStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100 flex flex-col gap-6"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
                {currentStep.stepNumber}
              </div>
              
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                  {currentStep.title}
                </h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {currentStep.warning && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] font-bold text-amber-700 leading-tight">
                    {currentStep.warning}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handlePrev}
                disabled={activeStep === 0}
                className="flex-1 bg-gray-50 disabled:opacity-30 text-gray-900 font-black py-5 rounded-[24px] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ChevronLeft size={20} />
                <span>Sebelumnya</span>
              </button>
              <button 
                onClick={handleNext}
                className="flex-1 bg-primary text-white font-black py-5 rounded-[24px] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>{activeStep === guide.steps.length - 1 ? 'Selesai' : 'Lanjut'}</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-8 py-12"
          >
            <div className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-green-200/30 rounded-full blur-xl"
              />
              <CheckCircle2 size={64} className="text-green-500 relative z-10" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">Selesai!</h3>
              <p className="text-sm text-gray-500 font-medium px-8 leading-relaxed">
                Barang kamu sudah berhasil diperbaiki. Terima kasih telah membantu mengurangi limbah bersama Re-Vibe.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button onClick={() => router.push('/')} className="w-full bg-primary text-white font-black py-5 rounded-[24px] shadow-xl">
                Kembali ke Beranda
              </button>
              <button onClick={() => setIsCompleted(false)} className="text-xs font-black text-gray-400 uppercase tracking-widest py-4">
                Lihat Panduan Lagi
              </button>
            </div>
          </motion.div>
        )}

        {/* YouTube Section */}
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Youtube size={14} className="text-red-500" />
              Tutorial YouTube
            </h4>
            <a 
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(guide.youtubeSearchQuery)}`}
              target="_blank"
              className="text-[10px] font-black text-primary uppercase"
            >
              Lihat Semua
            </a>
          </div>

          <div className="flex flex-col gap-4">
            {videos.length > 0 ? videos.map((video) => (
              <a 
                key={video.videoId}
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                className="flex items-center gap-4 bg-gray-50 p-3 rounded-[28px] border border-gray-100 hover:bg-white hover:shadow-lg transition-all group"
              >
                <div className="relative w-28 aspect-video rounded-2xl overflow-hidden shrink-0">
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <h5 className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-snug">
                    {video.title}
                  </h5>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
                    {video.channelName}
                  </span>
                </div>
              </a>
            )) : (
              <div className="p-8 bg-gray-50 rounded-[32px] border border-dashed border-gray-200 text-center flex flex-col items-center gap-3">
                <Youtube size={24} className="text-gray-300" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Video tutorial tidak ditemukan
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Safety Header */}
        <div className="p-6 bg-red-50 rounded-[32px] border border-red-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex flex-col gap-1">
            <h6 className="text-[11px] font-black text-red-900 uppercase tracking-widest">Catatan Keamanan</h6>
            <p className="text-[10px] text-red-700/80 leading-relaxed font-bold">
              {guide.safetyNotes}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
