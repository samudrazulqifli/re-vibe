"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { TopBar } from '@/src/components/layout/TopBar';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  Star,
  Info,
  DollarSign
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

interface ProductSuggestion {
  name: string;
  estimatedPrice: string;
  brand: string;
  reason: string;
}

interface ProductData {
  productQuery: string;
  tokopediaUrl: string;
  shopeeUrl: string;
  lazadaUrl: string;
  blibliUrl: string;
  productSuggestions: ProductSuggestion[];
}

export default function ShopPage() {
  const router = useRouter();
  const { currentAnalysis, recommendation } = useReVibeStore();
  
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'tokopedia' | 'shopee' | 'lazada' | 'blibli'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });

  useEffect(() => {
    if (!currentAnalysis || !recommendation) {
      router.push('/upload');
      return;
    }

    setPriceRange({
      min: recommendation.newProductPriceMin,
      max: recommendation.newProductPriceMax
    });

    const fetchData = async () => {
      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: currentAnalysis.itemName,
            itemCategory: currentAnalysis.itemCategory,
            priceMin: recommendation.newProductPriceMin,
            priceMax: recommendation.newProductPriceMax
          })
        });

        if (!response.ok) throw new Error('Failed to load product suggestions');
        const data = await response.json();
        setProductData(data);
        setSearchQuery(data.productQuery);
      } catch (err) {
        console.error('Products fetch error:', err);
        toast.error('Gagal memuat saran produk.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentAnalysis, recommendation, router]);

  const tabs = [
    { id: 'all', label: 'Semua', color: 'bg-gray-900' },
    { id: 'tokopedia', label: 'Tokopedia', color: 'bg-[#03AC0E]' },
    { id: 'shopee', label: 'Shopee', color: 'bg-[#EE4D2D]' },
    { id: 'lazada', label: 'Lazada', color: 'bg-[#0F146D]' },
    { id: 'blibli', label: 'Blibli', color: 'bg-[#0095DA]' },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 bg-white min-h-screen flex flex-col">
        <TopBar title="Mencari Produk..." />
        <div className="p-8 flex flex-col gap-8">
          <div className="h-14 w-full bg-gray-100 animate-pulse rounded-2xl" />
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 w-24 bg-gray-100 animate-pulse rounded-full shrink-0" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 w-full bg-gray-50 animate-pulse rounded-[32px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen pb-32">
      <TopBar title="Cari Pengganti" />

      {/* Search & Tabs */}
      <div className="sticky top-[72px] z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex flex-col gap-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-[20px] py-4 pl-14 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            placeholder="Cari produk..."
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                activeTab === tab.id 
                  ? `${tab.color} text-white border-transparent shadow-lg` 
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'all' ? (
            <motion.div 
              key="all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* Product Suggestion Grid */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 mb-2">Rekomendasi Re-Vibe</h3>
                {productData?.productSuggestions.map((product, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-xl hover:border-primary/20 transition-all border-l-4 border-l-primary"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{product.brand}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full">
                          <TrendingUp size={10} className="text-accent" />
                          <span className="text-[8px] font-black text-accent uppercase">Pilihan Terbaik</span>
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-gray-900 leading-tight">{product.name}</h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">{product.estimatedPrice}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                      <Info size={16} className="text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-gray-600 leading-relaxed italic">
                        "{product.reason}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <a 
                        href={`https://www.tokopedia.com/search?st=product&q=${encodeURIComponent(product.name)}`} 
                        target="_blank"
                        className="bg-[#03AC0E] text-white text-[10px] font-black h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#03AC0E]/20"
                      >
                        Tokopedia
                      </a>
                      <a 
                        href={`https://shopee.co.id/search?keyword=${encodeURIComponent(product.name)}`} 
                        target="_blank"
                        className="bg-[#EE4D2D] text-white text-[10px] font-black h-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#EE4D2D]/20"
                      >
                        Shopee
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* General Platform Search */}
              <div className="flex flex-col gap-4 mt-8">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Cari Langsung di Marketplace</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'tokopedia', label: 'Tokopedia', color: 'bg-[#03AC0E]', url: productData?.tokopediaUrl },
                    { id: 'shopee', label: 'Shopee', color: 'bg-[#EE4D2D]', url: productData?.shopeeUrl },
                    { id: 'lazada', label: 'Lazada', color: 'bg-[#0F146D]', url: productData?.lazadaUrl },
                    { id: 'blibli', label: 'Blibli', color: 'bg-[#0095DA]', url: productData?.blibliUrl },
                  ].map(platform => (
                    <a 
                      key={platform.id}
                      href={platform.url}
                      target="_blank"
                      className={cn(
                        "p-6 rounded-[32px] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-xl",
                        platform.color
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <ShoppingBag size={24} />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{platform.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[60vh] gap-6"
            >
              <div className="flex-1 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className={cn(
                  "w-20 h-20 rounded-[24px] flex items-center justify-center text-white shadow-2xl",
                  activeTab === 'tokopedia' ? 'bg-[#03AC0E]' :
                  activeTab === 'shopee' ? 'bg-[#EE4D2D]' :
                  activeTab === 'lazada' ? 'bg-[#0F146D]' : 'bg-[#0095DA]'
                )}>
                  <ShoppingBag size={40} />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Buka di {tabs.find(t => t.id === activeTab)?.label}</h3>
                  <p className="text-sm text-gray-500 font-medium px-8 leading-relaxed">
                    Marketplace ini lebih aman dibuka langsung di aplikasi atau tab baru untuk pengalaman belanja terbaik.
                  </p>
                </div>
                <a 
                  href={
                    activeTab === 'tokopedia' ? productData?.tokopediaUrl :
                    activeTab === 'shopee' ? productData?.shopeeUrl :
                    activeTab === 'lazada' ? productData?.lazadaUrl : productData?.blibliUrl
                  }
                  target="_blank"
                  className={cn(
                    "w-full max-w-xs text-white font-black py-5 rounded-[24px] shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95",
                    activeTab === 'tokopedia' ? 'bg-[#03AC0E]' :
                    activeTab === 'shopee' ? 'bg-[#EE4D2D]' :
                    activeTab === 'lazada' ? 'bg-[#0F146D]' : 'bg-[#0095DA]'
                  )}
                >
                  <ExternalLink size={20} />
                  <span>Buka Sekarang</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Sell Banner */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
        <motion.button 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          onClick={() => router.push('/sell')}
          className="w-full bg-gray-900 text-white p-5 rounded-[32px] flex items-center justify-between shadow-2xl shadow-gray-900/40 group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-primary">
              <DollarSign size={24} />
            </div>
            <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Punya Barang Lama?</span>
              <p className="text-sm font-black tracking-tight">Jual Sekarang di Marketplace</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10 transition-transform group-hover:bg-primary group-hover:text-white">
            <ArrowRight size={20} />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
