import React from 'react';
import { RepairDecision } from '../types';
import { CheckCircle2, XCircle, AlertCircle, Wrench, Sprout, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AnalysisViewProps {
  analysis: RepairDecision;
  imageUrl: string;
  onBack: () => void;
}

export function AnalysisView({ analysis, imageUrl, onBack }: AnalysisViewProps) {
  const isRepair = analysis.decision === 'REPAIR';
  
  return (
    <div className="flex flex-col gap-6 pb-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors px-6 mt-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Kembali</span>
      </button>

      <div className="px-6">
        <div className="relative rounded-2xl overflow-hidden aspect-square shadow-md">
          <img src={imageUrl} alt="Barang Rusak" className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold shadow-sm">
            Hasil Analisis
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 flex flex-col gap-6"
      >
        <div className={cn(
          "p-6 rounded-3xl border-2 flex flex-col gap-4",
          isRepair ? "bg-green-50 border-secondary/20" : "bg-red-50 border-destructive/20"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              isRepair ? "bg-secondary text-white" : "bg-destructive text-white"
            )}>
              {isRepair ? 'REKOMENDASI: PERBAIKI' : 'REKOMENDASI: BELI BARU'}
            </span>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-xs">Akurasi AI:</span>
              <span className="text-xs font-bold">{(analysis.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <p className="text-lg font-semibold leading-tight text-gray-800">
            {analysis.reasoning}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoCard 
            icon={<Wrench className="w-5 h-5 text-primary" />}
            title="Saran Biaya Servis"
            value={analysis.estimatedRepairCost}
          />
          <InfoCard 
            icon={<ShoppingBag className="w-5 h-5 text-accent" />}
            title="Harga Baru"
            value={analysis.estimatedNewCost}
          />
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-xl">
              <Sprout className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Dampak Lingkungan</h4>
              <p className="text-xs text-gray-500">Nilai keberlanjutan barang Anda</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed italic">
            "{analysis.sustainabilityImpact}"
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function InfoCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{title}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}
