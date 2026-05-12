"use client";

import React, { useEffect, useState } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { BottomNav } from '@/src/components/layout/BottomNav';
import { useRouter } from 'next/navigation';
import { calculateStats } from '@/src/lib/history';
import { useAuth } from '@/src/lib/firebase/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronRight,
  BarChart3,
  PiggyBank,
  Trash2,
  Info,
  Bell,
  Globe,
  Lock,
  Star,
  Mail,
  ShieldCheck,
  Cpu,
  Trophy,
  LogOut
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Image from 'next/image';

function getInitials(name?: string | null): string {
  if (!name) return 'RV';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'RV';
}

function tierLabel(total: number): string {
  if (total >= 20) return 'Pahlawan Lingkungan';
  if (total >= 5) return 'Pejuang Reparasi';
  return 'Pemula Re-Vibe';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const [stats, setStats] = useState({ total: 0, savings: 0, itemsSold: 0 });
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!user) return;
    calculateStats(user.uid).then(setStats).catch(console.error);
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const menuItems = [
    { label: 'Notifikasi', icon: Bell, action: () => {} },
    { label: 'Bahasa', icon: Globe, sub: 'Bahasa Indonesia', action: () => {} },
    { label: 'Privasi & Data', icon: Lock, action: () => {} },
    { label: 'Beri Rating', icon: Star, action: () => {} },
    { label: 'Hubungi Kami', icon: Mail, action: () => {} },
    { label: 'Tentang Re-Vibe', icon: Info, action: () => setShowAbout(true) },
    { label: 'Keluar', icon: LogOut, action: async () => {
        if (!confirm('Yakin ingin keluar dari akun?')) return;
        await logOut();
        router.replace('/login');
      }, danger: true },
  ];

  return (
    <div className="flex-1 bg-white min-h-screen flex flex-col pb-24">
      <TopBar title="Profil Saya" hideBack />

      <div className="p-6 flex flex-col gap-8">
        {/* User Profile Header */}
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-[32px] object-cover shadow-2xl shadow-primary/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-[32px] bg-primary flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-primary/30">
                {getInitials(user?.displayName)}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-xl border-4 border-white flex items-center justify-center text-accent">
              <ShieldCheck size={20} fill="currentColor" stroke="white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {user?.displayName ?? 'Pengguna Re-Vibe'}
            </h2>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{tierLabel(stats.total)}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-[32px] p-6 text-white flex flex-col gap-4 shadow-xl shadow-gray-900/20">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <PiggyBank size={20} className="text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Hemat Biaya</span>
              <span className="text-lg font-black tracking-tighter">{formatCurrency(stats.savings)}</span>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-gray-100 flex flex-col gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Analisa</span>
              <span className="text-lg font-black text-gray-900 tracking-tighter">{stats.total} Barang</span>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Pengaturan</h4>
          
          <div className="bg-gray-50 rounded-[40px] p-2 flex flex-col gap-1">
            {menuItems.map((item, i) => (
              <button 
                key={i}
                onClick={item.action}
                className="w-full flex items-center justify-between p-5 bg-white rounded-[32px] group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                    <item.icon size={20} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={cn(
                      "text-sm font-black",
                      (item as any).danger ? "text-red-600" : "text-gray-900"
                    )}>{item.label}</span>
                    {item.sub && <span className="text-[10px] text-gray-400 font-bold">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Gamification / Badge */}
        <div className="mt-4 p-8 bg-accent rounded-[40px] flex items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy size={100} />
          </div>
          <div className="flex-1 flex flex-col gap-1 relative z-10">
            <h4 className="text-lg font-black text-gray-900 leading-tight">Terus Analisa & Selamatkan Bumi! 🌍</h4>
            <p className="text-[11px] text-gray-800 font-bold opacity-70 leading-relaxed pr-8">
              Kamu telah membantu mengurangi limbah elektronik secara signifikan bulan ini. Mantap!
            </p>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center text-center gap-6 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
              
              <div className="w-20 h-20 rounded-[24px] bg-primary flex items-center justify-center text-white shadow-2xl animate-bounce">
                <Cpu size={40} />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Re-Vibe v1.0.0</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Fix it. Don't Waste it.</p>
              </div>

              <div className="flex flex-col w-full gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Powered By</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-900">Gemini 2.5 Flash</span>
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Competition</span>
                  <span className="text-[10px] font-black text-primary">#JuaraVibeCoding</span>
                </div>
              </div>

              <button 
                onClick={() => setShowAbout(false)}
                className="w-full bg-gray-900 text-white font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition-transform"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
