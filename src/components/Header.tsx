import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <RefreshCw className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-primary">Re-Vibe</h1>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-500">BH</span>
      </div>
    </header>
  );
}
