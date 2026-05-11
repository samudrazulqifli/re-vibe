"use client";

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check visits
    const visits = parseInt(localStorage.getItem('revibe_visits') || '0');
    const newVisits = visits + 1;
    localStorage.setItem('revibe_visits', newVisits.toString());

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt if it's 2nd visit or more
      if (newVisits >= 2 && !localStorage.getItem('revibe_install_dismissed')) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback for testing or if the event already fired (approximate)
    if (newVisits >= 2 && !localStorage.getItem('revibe_install_dismissed')) {
        // We delay slightly to make it less intrusive
        const timer = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback info for iOS
      alert("Untuk menginstall di iOS: Tap ikon 'Share' di browser kamu dan pilih 'Add to Home Screen' 📱");
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('revibe_install_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 border border-blue-100 flex items-center justify-between"
          id="install-prompt"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Download size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Pasang Re-Vibe</p>
              <p className="text-xs text-gray-500">Akses lebih cepat & offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold"
              id="install-button"
            >
              Pasang
            </button>
            <button 
              onClick={handleDismiss}
              className="p-2 text-gray-400"
              id="dismiss-install"
            >
              <X size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
