import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWA } from '../hooks/usePWA';

export default function PWAPrompt() {
  const { isInstallable, installApp, isStandalone } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after a delay if installable and not standalone and not dismissed
    if (isInstallable && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isInstallable, isStandalone, dismissed]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-500/20">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Smartphone size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black flex items-center justify-center md:justify-start gap-2 uppercase tracking-tight">
                  <Sparkles size={16} className="text-indigo-200" />
                  Edu-Nify sur votre Smartphone
                </h3>
                <p className="text-sm font-medium text-indigo-100">
                  Installez l'application pour un accès rapide et une expérience fluide.
                </p>
              </div>
            </div>
            
            <div className="flex w-full md:w-auto items-center gap-3">
              <button
                onClick={installApp}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-indigo-600 shadow-lg hover:bg-indigo-50 transition-all active:scale-95"
              >
                <Download size={18} />
                INSTALLER MAINTENANT
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
                title="Plus tard"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
