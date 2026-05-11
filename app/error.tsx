"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={40} />
      </div>
      
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Aduh! Terjadi Kesalahan
      </h2>
      
      <p className="text-gray-500 mb-8 max-w-xs">
        Maaf ya, sistem kami sedang mengalami kendala teknis. Jangan panik, barangmu tetap aman!
      </p>

      <div className="flex flex-col w-full gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          Coba Lagi
        </button>
        
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
        >
          <Home size={18} />
          Kembali ke Beranda
        </Link>
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-xl w-full border border-gray-100">
        <p className="text-[10px] text-gray-400 font-mono text-left overflow-auto max-h-24">
          Error Log: {error.message || "Unknown error"}
        </p>
      </div>
    </div>
  );
}
