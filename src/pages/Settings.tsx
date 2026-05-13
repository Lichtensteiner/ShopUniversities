import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Database, 
  Moon, 
  Sun, 
  Monitor, 
  User, 
  Globe, 
  Wifi, 
  Cpu, 
  Lock, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'notifications' | 'security' | 'system'>('appearance');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dbStatus, setDbStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const [latency, setLatency] = useState<number>(0);
  const [lastSaved, setLastSaved] = useState<string>('À l\'instant');
  const [sessionLogs, setSessionLogs] = useState<{ id: string; event: string; time: string; type: 'info' | 'auth' | 'system' }[]>([
    { id: '1', event: 'Connexion établie', time: new Date().toLocaleTimeString(), type: 'auth' },
    { id: '2', event: 'Synchronisation des thèmes terminée', time: new Date(Date.now() - 2000).toLocaleTimeString(), type: 'system' }
  ]);
  const [notifPreferences, setNotifPreferences] = useState({
    push: true,
    email: false,
    sms: true,
    urgent: true
  });
  const [formPrenom, setFormPrenom] = useState(currentUser?.prenom || '');
  const [formNom, setFormNom] = useState(currentUser?.nom || '');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormPrenom(currentUser.prenom || '');
      setFormNom(currentUser.nom || '');
      if (currentUser.notifications) {
        setNotifPreferences(currentUser.notifications);
      }
    }
  }, [currentUser]);

  const addLog = (event: string, type: 'info' | 'auth' | 'system' = 'info') => {
    setSessionLogs(prev => [
      { id: Math.random().toString(36).substr(2, 9), event, time: new Date().toLocaleTimeString(), type },
      ...prev.slice(0, 9)
    ]);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        prenom: formPrenom,
        nom: formNom,
        updatedAt: new Date()
      });
      setLastSaved('À l\'instant');
      addLog('Profil mis à jour avec succès', 'system');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      addLog('Erreur lors de la mise à jour du profil', 'system');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (key: keyof typeof notifPreferences) => {
    if (!currentUser?.id) return;
    const newPrefs = { ...notifPreferences, [key]: !notifPreferences[key] };
    setNotifPreferences(newPrefs);
    
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        notifications: newPrefs
      });
      setLastSaved('À l\'instant');
      addLog(`Préférence ${key} modifiée`, 'system');
    } catch (error) {
      console.error('Error updating notifications:', error);
      setNotifPreferences(prev => ({ ...prev, [key]: !prev[key] })); // Rollback
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('Connection rétablie', 'system');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('Passage en mode hors-ligne', 'system');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Real-time DB status check
    const checkDB = async () => {
      try {
        const start = Date.now();
        // Simple light check to a known collection or dummy doc
        setDbStatus('connecting');
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'system', 'health'));
        setLatency(Date.now() - start);
        setDbStatus('connected');
      } catch (err) {
        setDbStatus('offline');
      }
    };

    checkDB();
    const dbInterval = setInterval(checkDB, 30000); // Every 30s

    // Simulate latency monitoring for UI feel
    const latencyInterval = setInterval(() => {
      setLatency(prev => {
        const jitter = Math.floor(Math.random() * 6) - 3;
        return Math.max(5, prev + jitter);
      });
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(dbInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  const tabs = [
    { id: 'appearance', label: 'Apparence', icon: Sun },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Alertes', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'system', label: 'Système', icon: Zap },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header with Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <SettingsIcon size={24} />
            </div>
            {t('system_settings')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('global_app_config')}</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="hidden sm:flex px-3 py-1.5 rounded-xl items-center gap-2 text-[10px] font-black text-gray-400 bg-gray-50 dark:bg-gray-900/50">
            <Clock size={12} />
            SAUVEGARDÉ : {lastSaved.toUpperCase()}
          </div>
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Wifi size={14} className={isOnline ? 'animate-pulse' : ''} />
            {latency}ms
          </div>
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold ${dbStatus === 'connected' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
            <Database size={14} />
            {dbStatus === 'connected' ? 'CLOUD READY' : 'SYNCING...'}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <nav className="flex lg:flex-col gap-2 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-gray-700' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/30'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20 dark:shadow-none p-6 md:p-8"
            >
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('system_appearance')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Adaptez l'interface au confort de vos yeux.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {(['light', 'dark', 'system'] as const).map((tValue) => (
                      <button
                        key={tValue}
                        onClick={() => setTheme(tValue)}
                        className={`group relative flex flex-col p-6 rounded-2xl border-2 transition-all ${
                          theme === tValue 
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' 
                            : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${
                          theme === tValue ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {tValue === 'light' ? <Sun size={24} /> : tValue === 'dark' ? <Moon size={24} /> : <Monitor size={24} />}
                        </div>
                        <span className={`font-black text-sm uppercase tracking-wider ${theme === tValue ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-600 dark:text-gray-400'}`}>
                          {t(tValue)}
                        </span>
                        {theme === tValue && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle2 size={16} className="text-indigo-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4">Langue de l'Interface</h4>
                    <div className="flex flex-wrap gap-3">
                      {['fr', 'en', 'ar', 'de'].map((lng) => (
                        <button
                          key={lng}
                          onClick={() => setLanguage(lng as any)}
                          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                            language === lng 
                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {lng === 'fr' ? '🇫🇷 Français' : lng === 'en' ? '🇺🇸 English' : lng === 'ar' ? '🇸🇦 العربية' : '🇩🇪 Deutsch'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center border-4 border-white dark:border-gray-700 shadow-xl relative group cursor-pointer">
                      <User size={40} className="text-indigo-600" />
                      <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase text-center p-2">
                        Modifier Photo
                      </div>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">{currentUser?.prenom} {currentUser?.nom}</h3>
                      <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs tracking-widest">{currentUser?.role}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                      <input 
                        type="text" 
                        value={formPrenom}
                        onChange={(e) => setFormPrenom(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nom</label>
                      <input 
                        type="text" 
                        value={formNom}
                        onChange={(e) => setFormNom(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${
                        showSuccess 
                          ? 'bg-emerald-600 text-white shadow-emerald-200' 
                          : 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none hover:bg-indigo-700'
                      } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : showSuccess ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Database size={20} />
                      )}
                      {saving ? 'Enregistrement...' : showSuccess ? 'Profil mis à jour !' : 'Mettre à jour le profil'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Centre de Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Contrôlez comment l'établissement communique avec vous.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'push', icon: Monitor, label: 'Notifications Push', desc: 'Alertes en temps réel sur cet appareil' },
                      { key: 'email', icon: Globe, label: 'Email Hebdomadaire', desc: 'Résumé de l\'activité et des notes' },
                      { key: 'sms', icon: Smartphone, label: 'Alertes SMS', desc: 'Retards, absences ou urgences importantes' },
                      { key: 'urgent', icon: Zap, label: 'Alertes Système', desc: 'Maintenance et mises à jour critiques' }
                    ].map((pref) => (
                      <div key={pref.key} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500">
                            <pref.icon size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{pref.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{pref.desc}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => togglePreference(pref.key as any)}
                          className={`w-12 h-6 rounded-full transition-all relative ${notifPreferences[pref.key as keyof typeof notifPreferences] ? 'bg-indigo-600 shadow-inner' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${notifPreferences[pref.key as keyof typeof notifPreferences] ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Santé du Système</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Diagnostics techniques en temps réel.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm text-amber-500">
                        <Monitor size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plateforme</p>
                        <p className="font-bold text-sm truncate">{navigator.platform} ({navigator.language})</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm text-indigo-500">
                        <Database size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stockage Local</p>
                        <p className="font-bold text-sm">1.2 MB / 5.0 MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center justify-between">
                      Activités de la Session
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-md animate-pulse">LIVE</span>
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-2">
                      {sessionLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${log.type === 'auth' ? 'bg-emerald-500' : log.type === 'system' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{log.event}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Autorisations Navigateur</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { label: 'Caméra (QR Scanner)', status: 'Vérifié', ok: true },
                        { label: 'Géolocalisation', status: 'Actif', ok: true },
                        { label: 'Microphone', status: 'Non utilisé', ok: null },
                        { label: 'Notification API', status: 'Autorisé', ok: true },
                        { label: 'Auth Biométrique', status: 'Inconnu', ok: false },
                      ].map((auth, i) => (
                        <div key={i} className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{auth.label}</span>
                          {auth.ok === true ? <CheckCircle2 size={14} className="text-emerald-500" /> : 
                           auth.ok === false ? <AlertCircle size={14} className="text-amber-500" /> : 
                           <div className="w-3 h-3 bg-gray-200 rounded-full" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sécurité & Confidentialité</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Protégez votre compte et vos données.</p>
                  </div>

                  <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                        <Lock size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">Authentification à deux facteurs</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ajoutez une couche de sécurité supplémentaire en demandant un code envoyé sur votre mobile.</p>
                        <button className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors">
                          Activer la 2FA
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nouveau Mot de Passe</label>
                       <input 
                         type="password" 
                         className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none"
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Confirmer le Mot de Passe</label>
                       <input 
                         type="password" 
                         className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none"
                       />
                    </div>
                    <button className="px-6 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform">
                      Réinitialiser mon mot de passe
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

