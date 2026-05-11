"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  hideBack?: boolean;
  rightAction?: React.ReactNode;
  actions?: React.ReactNode;
}

export function TopBar({ title, showBack = true, hideBack = false, rightAction, actions }: TopBarProps) {
  const router = useRouter();
  const shouldShowBack = showBack && !hideBack;

  return (
    <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-50 px-6 py-4 flex items-center justify-between mx-auto w-full max-w-full">
      <div className="flex items-center gap-3">
        {shouldShowBack && (
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-900" />
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>
      {(rightAction || actions) && <div>{rightAction || actions}</div>}
    </div>
  );
}
