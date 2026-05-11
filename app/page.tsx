"use client";

import React from 'react';
import { Header } from '@/src/components/Header';
import { Home as HomeContent } from '@/src/components/Home';
import { InstallPrompt } from '@/src/components/InstallPrompt';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  const handleCapture = (file: File) => {
    // In a real app we'd set this to store and navigate
    // For now leading to upload
    router.push('/upload');
  };

  return (
    <>
      <Header />
      <HomeContent onCapture={handleCapture} />
      <InstallPrompt />
    </>
  );
}
