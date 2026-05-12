// src/components/auth/AuthGuard.tsx
"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/lib/firebase/auth-context';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/welcome', '/onboarding', '/login'];

function hasSeenWelcome(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rv-welcome-seen') === '1';
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(path);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace(hasSeenWelcome() ? '/login' : '/welcome');
    } else if (user && isPublic) {
      router.replace('/');
    }
  }, [loading, user, isPublic, router]);

  if (loading || (!user && !isPublic) || (user && isPublic)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
