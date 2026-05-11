"use client";

import React from 'react';
import { Header } from '@/src/components/Header';
import { Home as HomeContent } from '@/src/components/Home';
import { InstallPrompt } from '@/src/components/InstallPrompt';
import { useRouter } from 'next/navigation';
import { useReVibeStore } from '@/src/lib/store';

export default function Page() {
  const router = useRouter();
  const { setPhoto } = useReVibeStore();

  const handleCapture = (file: File) => {
    const url = URL.createObjectURL(file);
    setPhoto(file, url);
    router.push('/upload/preview');
  };

  return (
    <>
      <Header />
      <HomeContent onCapture={handleCapture} />
      <InstallPrompt />
    </>
  );
}
