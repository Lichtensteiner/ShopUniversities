import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, ScanFace, CheckCircle2, AlertCircle, Camera, ChevronLeft, UserPlus, LogIn, ShieldCheck, RefreshCw } from 'lucide-react';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';

type Screen = 'auth_choice' | 'register_step1' | 'register_step2' | 'scan_choice' | 'scanner' | 'result';
type ScanMode = 'face' | 'fingerprint';

export default function MobileApp() {
  const { t } = useLanguage();
  const [currentScreen, setCurrentScreenState] = useState<Screen>('auth_choice');

  useEffect(() => {
    // Initialize history state
    window.history.replaceState({ screen: 'auth_choice' }, '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setCurrentScreenState(event.state.screen);
      } else {
        setCurrentScreenState('auth_choice');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setCurrentScreen = (screen: Screen, replace = false) => {
    setCurrentScreenState(screen);
    if (replace) {
      window.history.replaceState({ screen }, '');
    } else {
      window.history.pushState({ screen }, '');
    }
  };

  const [scanMode, setScanMode] = useState<ScanMode>('face');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Biometric setup state
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    matricule: '',
    role: 'élève',
    classe: ''
  });

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError("Impossible d'accéder à la caméra.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if ((currentScreen === 'scanner' || currentScreen === 'register_step2') && scanMode === 'face') {
      // Don't start automatically to avoid user gesture issues in iframes
      // startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [currentScreen, scanMode]);

  const handleRegisterStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError("Firebase n'est pas configuré.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newUser = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        matricule: formData.matricule,
        role: formData.role,
        ...(formData.role === 'élève' ? { classe: formData.classe } : {}),
        date_creation: new Date().toISOString(),
        face_id: null,
        fingerprint_id: null
      };

      const docRef = await addDoc(collection(db, 'users'), newUser);
      
      // Update with user_id
      await updateDoc(docRef, { user_id: docRef.id });

      setCurrentUser({
        id: docRef.id,
        user_id: docRef.id,
        ...newUser
      });
      
      setFaceRegistered(false);
      setFingerprintRegistered(false);
      setRegistrationSuccess(false);
      setCurrentScreen('register_step2');
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  const simulateBiometricRegistration = async (type: 'face' | 'fingerprint') => {
    setScanStatus('scanning');
    
    if (type === 'face' && videoRef.current && currentUser) {
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 400;
        const scale = Math.min(1, maxWidth / videoRef.current.videoWidth);
        canvas.width = videoRef.current.videoWidth * scale;
        canvas.height = videoRef.current.videoHeight * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
          if (blob) {
            const storageRef = ref(storage, `users/${currentUser.id}/photo_biometric_${Date.now()}`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            
            const userRef = doc(db, 'users', currentUser.id);
            await updateDoc(userRef, { photo: downloadURL });
          }
        }
      } catch (err) {
        console.error("Erreur capture visage mobile:", err);
      }
    }

    setTimeout(() => {
      setScanStatus('success');
      if (type === 'face') setFaceRegistered(true);
      if (type === 'fingerprint') setFingerprintRegistered(true);
      setTimeout(() => setScanStatus('idle'), 1500);
    }, 1500);
  };

  const handleFinalizeRegistration = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        face_id: `face_${currentUser.id}`,
        fingerprint_id: `print_${currentUser.id}`
      });
      setRegistrationSuccess(true);
      setTimeout(() => {
        setCurrentScreen('auth_choice');
        setFormData({ nom: '', prenom: '', email: '', matricule: '', role: 'élève', classe: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement biométrique.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanPresence = async () => {
    setScanStatus('scanning');
    
    setTimeout(async () => {
      try {
        // Simuler la reconnaissance en prenant un utilisateur au hasard dans la base
        // qui a complété son inscription biométrique
        const usersSnap = await getDocs(collection(db, 'users'));
        const validUsers = usersSnap.docs.filter(doc => {
          const data = doc.data();
          return data.face_id && data.fingerprint_id;
        });

        if (validUsers.length === 0) {
          setScanStatus('error');
          setError("Aucun utilisateur avec données biométriques trouvé.");
          setTimeout(() => setScanStatus('idle'), 3000);
          return;
        }

        const randomDoc = validUsers[Math.floor(Math.random() * validUsers.length)];
        const recognizedUser = { id: randomDoc.id, ...randomDoc.data() } as any;
        setCurrentUser(recognizedUser);

        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const isLate = now.getHours() >= 8;
        const status = isLate ? 'Retard' : 'Présent';
        const today = now.toISOString().split('T')[0];

        await addDoc(collection(db, 'attendance'), {
          user_id: recognizedUser.id,
          date: today,
          heure_arrivee: timeString,
          statut: status,
          timestamp: now.toISOString()
        });

        // Simuler l'envoi d'une notification aux parents
        if (recognizedUser.role === 'élève') {
          console.log(`[NOTIFICATION] Envoi d'un SMS/Email aux parents de ${recognizedUser.prenom} ${recognizedUser.nom} : "Votre enfant est arrivé à l'école à ${timeString} (${status})."`);
          await addDoc(collection(db, 'notifications'), {
            user_id: recognizedUser.id,
            type: 'attendance',
            message: `Votre enfant ${recognizedUser.prenom} ${recognizedUser.nom} est arrivé à l'école à ${timeString} (${status}).`,
            timestamp: now.toISOString(),
            status: 'sent'
          });
        }

        setScanStatus('success');
        setTimeout(() => {
          setScanStatus('idle');
          setCurrentScreen('result');
        }, 1500);

      } catch (err) {
        console.error(err);
        setScanStatus('error');
        setError("Erreur lors de la reconnaissance.");
        setTimeout(() => setScanStatus('idle'), 3000);
      }
    }, 2000);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'auth_choice':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-in fade-in zoom-in duration-300">
            <img src="/logo.jpg" alt="ShopUniversities" className="h-24 object-contain" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">ShopUniversities</h1>
              <p className="text-gray-500">Système de Présence Biométrique</p>
            </div>
            <div className="w-full space-y-4 mt-8">
              <button 
                onClick={() => setCurrentScreen('scan_choice')}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
              >
                <ScanFace size={20} /> Scanner ma présence
              </button>
              <button 
                onClick={() => setCurrentScreen('register_step1')}
                className="w-full bg-white text-indigo-600 border-2 border-indigo-100 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3"
              >
                <UserPlus size={20} /> Créer un compte
              </button>
            </div>
          </div>
        );

      case 'register_step1':
        return (
          <div className="flex flex-col h-full p-6 animate-in slide-in-from-right duration-300 overflow-y-auto">
            <button onClick={() => setCurrentScreen('auth_choice')} className="mb-6 text-gray-500 flex items-center gap-2">
              <ChevronLeft size={20} /> Retour
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Étape 1 : Informations</h2>
            <p className="text-gray-500 mb-6">Saisissez vos informations de base.</p>
            
            <form onSubmit={handleRegisterStep1} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input type="text" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matricule (Optionnel)</label>
                <input type="text" value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500">
                  <option value="élève">Élève</option>
                  <option value="enseignant">Enseignant</option>
                  <option value="personnel administratif">Personnel Administratif</option>
                </select>
              </div>
              {formData.role === 'élève' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                  <input type="text" required value={formData.classe} onChange={e => setFormData({...formData, classe: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 6ème A" />
                </div>
              )}
              <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 mt-8 flex justify-center items-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : t('continue_to_biometrics')}
              </button>
            </form>
          </div>
        );

      case 'register_step2':
        if (registrationSuccess) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('account_created_success')}</h2>
              <p className="text-gray-500">{t('biometrics_recorded_success')}</p>
            </div>
          );
        }

        return (
          <div className="flex flex-col h-full p-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('step2_biometrics')}</h2>
            <p className="text-gray-500 mb-6 text-sm">{t('biometrics_mandatory_desc')}</p>
            
            <div className="flex-1 space-y-6">
              {/* Face Registration */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
                <div className="w-full h-40 bg-gray-900 rounded-xl overflow-hidden relative mb-4">
                  {scanMode === 'face' && !faceRegistered ? (
                    <>
                      {stream ? (
                        <>
                          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                          {scanStatus === 'scanning' && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-2 text-center">
                          <Camera size={24} className="mb-2 opacity-50" />
                          <button 
                            onClick={startCamera}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                          >
                            Activer caméra
                          </button>
                        </div>
                      )}
                    </>
                  ) : faceRegistered ? (
                    <div className="absolute inset-0 bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={48} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <Camera size={32} />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => { setScanMode('face'); simulateBiometricRegistration('face'); }}
                  disabled={faceRegistered || scanStatus === 'scanning'}
                  className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ScanFace size={20} /> {faceRegistered ? t('face_registered') : t('scan_face')}
                </button>
              </div>

              {/* Fingerprint Registration */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  fingerprintRegistered ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  {fingerprintRegistered ? <CheckCircle2 size={32} /> : <Fingerprint size={32} className={scanMode === 'fingerprint' && scanStatus === 'scanning' ? 'animate-pulse text-indigo-500' : ''} />}
                </div>
                <button 
                  onClick={() => { setScanMode('fingerprint'); simulateBiometricRegistration('fingerprint'); }}
                  disabled={fingerprintRegistered || scanStatus === 'scanning'}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Fingerprint size={20} /> {fingerprintRegistered ? t('fingerprint_registered') : t('scan_fingerprint')}
                </button>
              </div>
            </div>

            <button 
              onClick={handleFinalizeRegistration}
              disabled={!faceRegistered || !fingerprintRegistered || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg shadow-lg mt-6 flex justify-center items-center gap-2 transition-colors"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : t('activate_account')}
            </button>
          </div>
        );

      case 'scan_choice':
        return (
          <div className="flex flex-col h-full p-6 animate-in fade-in duration-300">
            <button onClick={() => setCurrentScreen('auth_choice')} className="mb-6 text-gray-500 flex items-center gap-2">
              <ChevronLeft size={20} /> {t('cancel')}
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('clocking')}</h2>
            <p className="text-gray-500 mb-8">{t('choose_scan_method')}</p>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setScanMode('face'); setCurrentScreen('scanner'); }}
                className="bg-indigo-600 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-xl shadow-indigo-200 aspect-square hover:scale-[1.02] transition-transform"
              >
                <ScanFace size={64} className="opacity-90" />
                <span className="font-bold text-xl">{t('facial_recognition')}</span>
              </button>
              <button 
                onClick={() => { setScanMode('fingerprint'); setCurrentScreen('scanner'); }}
                className="bg-gray-900 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-xl shadow-gray-200 aspect-square hover:scale-[1.02] transition-transform"
              >
                <Fingerprint size={64} className="opacity-90" />
                <span className="font-bold text-xl">{t('fingerprint')}</span>
              </button>
            </div>
          </div>
        );

      case 'scanner':
        return (
          <div className="flex flex-col h-full bg-black text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <button onClick={() => setCurrentScreen('scan_choice')} className="absolute top-6 left-6 z-20 text-white flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
              <ChevronLeft size={20} /> {t('cancel')}
            </button>

            {scanMode === 'face' ? (
              <>
                {stream ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-80 border-2 border-white/30 rounded-[3rem] relative">
                        <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-[3rem]"></div>
                        <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-[3rem]"></div>
                        <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-[3rem]"></div>
                        <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-[3rem]"></div>
                        {scanStatus === 'scanning' && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <Camera size={64} className="mb-4 text-gray-700 opacity-50" />
                    <p className="text-gray-400 mb-6">L'accès à la caméra est nécessaire.</p>
                    <button 
                      onClick={startCamera}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold"
                    >
                      Activer la caméra
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${
                  scanStatus === 'scanning' ? 'bg-indigo-900/50 shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-110' : 'bg-gray-900'
                }`}>
                  <Fingerprint size={80} className={scanStatus === 'scanning' ? 'text-indigo-400 animate-pulse' : 'text-gray-600'} />
                </div>
                <p className="text-center text-gray-400">{t('place_finger_on_sensor')}</p>
              </div>
            )}

            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
              {error && <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-xl text-sm text-center backdrop-blur-md">{error}</div>}
              <button 
                onClick={handleScanPresence}
                disabled={scanStatus === 'scanning' || (scanMode === 'face' && !stream)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 backdrop-blur-md"
              >
                {scanStatus === 'scanning' ? t('scanning') : t('scan_now')}
              </button>
            </div>

            {scanStatus === 'success' && (
              <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <CheckCircle2 size={80} className="text-white mb-4" />
                <h2 className="text-3xl font-bold text-white">{t('recognized')}</h2>
              </div>
            )}
          </div>
        );

      case 'result':
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const isLate = now.getHours() >= 8;
        const status = isLate ? t('late') : t('present');

        return (
          <div className="flex flex-col h-full p-6 bg-gray-50 animate-in slide-in-from-bottom duration-500">
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
              
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100 animate-bounce">
                <CheckCircle2 size={40} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('user_recognized')}</h2>
              <p className="text-gray-500 mb-8">{t('presence_recorded_success')}</p>

              <div className="w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gradient-to-b from-indigo-50/50 to-white">
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md mb-4">
                    {currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{currentUser?.nom} {currentUser?.prenom}</h3>
                  <p className="text-indigo-600 font-medium capitalize">{currentUser?.role}</p>
                </div>
                
                <div className="p-6 space-y-4">
                  {currentUser?.matricule && (
                    <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                      <span className="text-gray-500">{t('matricule')}</span>
                      <span className="font-bold text-gray-900 font-mono">{currentUser.matricule}</span>
                    </div>
                  )}
                  {currentUser?.email && (
                    <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                      <span className="text-gray-500">{t('email')}</span>
                      <span className="font-bold text-gray-900 text-sm">{currentUser.email}</span>
                    </div>
                  )}
                  {currentUser?.classe && (
                    <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                      <span className="text-gray-500">{t('class')}</span>
                      <span className="font-bold text-gray-900">{currentUser.classe}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <span className="text-gray-500">{t('time')}</span>
                    <span className="font-bold text-gray-900 font-mono text-lg">{timeString}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t('status')}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setCurrentScreen('auth_choice')}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg mt-8 shadow-lg shadow-gray-200"
              >
                {t('finish')}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Mobile Simulator Frame */}
      <div className="w-full max-w-[400px] h-[800px] max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-gray-900 relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-gray-900 rounded-b-3xl z-50"></div>
        {renderScreen()}
      </div>
    </div>
  );
}
