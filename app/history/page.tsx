"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { BottomNav } from '@/src/components/layout/BottomNav';
import { useRouter } from 'next/navigation';
import { getHistory, deleteAnalysis } from '@/src/lib/history';
import { AnalysisRecord } from '@/src/lib/types';
import { useAuth } from '@/src/lib/firebase/auth-context';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  Wrench, 
  BookOpen, 
  ShoppingBag, 
  ChevronRight,
  Camera,
  History,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Image from 'next/image';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'service' | 'diy' | 'buy'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);
    getHistory(user.uid)
      .then((rows) => { if (!cancelled) setHistory(rows); })
      .catch((e) => { console.error(e); toast.error('Gagal memuat riwayat'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(ts));
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || item.selectedAction === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [history, searchQuery, activeFilter]);

  const filters = [
    { id: 'all', label: 'Semua', icon: LayoutGrid },
    { id: 'service', label: 'Servis', icon: Wrench },
    { id: 'diy', label: 'DIY', icon: BookOpen },
    { id: 'buy', label: 'Beli Baru', icon: ShoppingBag },
  ];

  if (isLoading) return null;

  return (
    <div className="flex-1 bg-white min-h-screen flex flex-col pb-24">
      <TopBar title="Riwayat Analisa" hideBack />

      <div className="p-6 flex flex-col gap-6">
        {/* Search & Filter */}
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-[20px] py-4 pl-14 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              placeholder="Cari barang..."
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2",
                  activeFilter === f.id 
                    ? "bg-gray-900 text-white border-gray-900 shadow-lg" 
                    : "bg-white text-gray-400 border-gray-100"
                )}
              >
                <f.icon size={12} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex flex-col gap-4">
          {filteredHistory.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/history/${item.id}`)}
                  className="bg-white rounded-[32px] border border-gray-100 p-4 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden relative shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.itemName}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(item.timestamp)}
                      </span>
                      <StatusBadge type={item.selectedAction as any} />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 truncate">{item.itemName}</h4>
                    <p className="text-[10px] text-gray-500 font-bold line-clamp-1">
                      {item.damageTypes.join(', ')}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                <History size={48} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black text-gray-900">Belum ada analisa</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed px-12">
                  Wah, kamu belum pernah menganalisa kerusakan barang. Yuk mulai peduli lingkungan!
                </p>
              </div>
              <button 
                onClick={() => router.push('/upload')}
                className="bg-primary text-white font-black px-8 py-4 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              >
                Mulai Analisa Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button 
        onClick={() => router.push('/upload')}
        className="fixed bottom-32 right-6 w-16 h-16 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center shadow-primary/40 active:scale-90 transition-transform z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Camera size={28} />
      </button>

      <BottomNav />
    </div>
  );
}

function StatusBadge({ type }: { type: 'service' | 'diy' | 'buy' }) {
  const config = {
    service: { label: 'Di-service', color: 'bg-primary text-white' },
    diy: { label: 'DIY', color: 'bg-accent text-gray-900' },
    buy: { label: 'Beli Baru', color: 'bg-gray-900 text-white' },
  };

  const c = config[type] || { label: 'Analisa', color: 'bg-gray-100 text-gray-400' };

  return (
    <span className={cn(
      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
      c.color
    )}>
      {c.label}
    </span>
  );
}
