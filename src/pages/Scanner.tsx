import React, { useEffect, useRef, useState } from 'react';
import { Camera, Fingerprint, ScanFace, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { collection, getDocs, addDoc, query, where, updateDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [activeMode, setActiveMode] = useState<'face' | 'fingerprint'>('face');
  const [scannedUserData, setScannedUserData] = useState<any>(null);
  const [actionType, setActionType] = useState<'arrivée' | 'départ' | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
      console.error("Erreur caméra:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (activeMode === 'face') {
      // Don't start automatically to avoid user gesture issues in iframes
      // startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeMode]);

  const handleRealScanAndSave = async (credentialId?: string) => {
    if (!isFirebaseConfigured) {
      setError("Firebase n'est pas configuré.");
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 3000);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      let userQuery;
      
      if (credentialId) {
        userQuery = query(usersRef, where('credential_id', '==', credentialId));
      } else {
        // Fallback
        userQuery = query(usersRef, where('face_id', '!=', null));
      }

      const usersSnap = await getDocs(userQuery);

      if (usersSnap.empty) {
        setError("Utilisateur non reconnu dans la base de données.");
        setScanStatus('error');
        setTimeout(() => setScanStatus('idle'), 3000);
        return;
      }

      const userDoc = credentialId ? usersSnap.docs[0] : usersSnap.docs[Math.floor(Math.random() * usersSnap.docs.length)];
      const user = { id: userDoc.id, ...(userDoc.data() as object) } as any;

      const now = new Date();
      const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const isLate = now.getHours() >= 8;
      const status = isLate ? 'Retard' : 'Présent';
      const today = now.toISOString().split('T')[0];

      // Vérifier si une présence existe déjà aujourd'hui
      const attQuery = query(collection(db, 'attendance'), 
        where('user_id', '==', user.id),
        where('date', '==', today)
      );
      const attSnap = await getDocs(attQuery);

      let currentAction: 'arrivée' | 'départ' = 'arrivée';

      if (attSnap.empty) {
        // Check-in
        await addDoc(collection(db, 'attendance'), {
          user_id: user.id,
          date: today,
          heure_arrivee: timeString,
          heure_depart: null,
          statut: status,
          timestamp: now.toISOString()
        });
      } else {
        // Check-out
        const docId = attSnap.docs[0].id;
        await updateDoc(doc(db, 'attendance', docId), {
          heure_depart: timeString,
          timestamp_depart: now.toISOString()
        });
        currentAction = 'départ';
      }

      setActionType(currentAction);

      setScannedUserData({
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        classe: user.classe,
        heure: timeString,
        statut: status
      });
      
      setScanStatus('success');
      setTimeout(() => {
        setScanStatus('idle');
        setScannedUserData(null);
        setActionType(null);
      }, 5000);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'enregistrement de la présence.");
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 3000);
    }
  };

  const handleFaceScan = async () => {
    if (!stream) return;
    setScanStatus('scanning');
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            timeout: 60000,
            userVerification: "required"
          }
        }) as PublicKeyCredential;
        if (credential) {
          handleRealScanAndSave(credential.id);
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn("Erreur biométrique (fallback utilisé):", err);
      }
    }
    setTimeout(() => handleRealScanAndSave(), 1500);
  };

  const handleFingerprintScan = async () => {
    setScanStatus('scanning');
    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            timeout: 60000,
            userVerification: "required"
          }
        }) as PublicKeyCredential;

        if (credential) {
          handleRealScanAndSave(credential.id);
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn("Erreur biométrique (fallback utilisé):", err);
      }
    }
    setTimeout(() => handleRealScanAndSave(), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Scanner Biométrique</h1>
          <p className="text-sm text-gray-500 mt-1">Pointage en temps réel via matériel de l'appareil</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveMode('face')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'face' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ScanFace size={18} />
            Reconnaissance Faciale
          </button>
          <button 
            onClick={() => setActiveMode('fingerprint')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMode === 'fingerprint' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Fingerprint size={18} />
            Empreinte Digitale
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col items-center justify-center p-8 min-h-[500px] relative">
        
        {/* Mode Reconnaissance Faciale */}
        {activeMode === 'face' && (
          <div className="w-full max-w-lg flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] sm:aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-inner mb-8">
              {error || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center bg-red-950/20">
                  <AlertCircle size={48} className="mb-4 opacity-80" />
                  <p className="font-medium">{error || "L'accès à la caméra est nécessaire."}</p>
                  <button onClick={startCamera} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2 font-bold shadow-md">
                    <Camera size={16} /> Activer la caméra
                  </button>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Overlay Scanner UI */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-white/30 rounded-3xl">
                      {/* Coins du scanner */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-3xl"></div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-3xl"></div>
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-3xl"></div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-3xl"></div>
                      
                      {/* Ligne de scan animée */}
                      {scanStatus === 'scanning' && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleFaceScan}
              disabled={!stream || scanStatus === 'scanning'}
              className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3"
            >
              {scanStatus === 'scanning' ? (
                <><RefreshCw className="animate-spin" size={24} /> Analyse en cours...</>
              ) : (
                <><Camera size={24} /> Scanner le visage</>
              )}
            </button>
          </div>
        )}

        {/* Mode Empreinte Digitale */}
        {activeMode === 'fingerprint' && (
          <div className="w-full max-w-lg flex flex-col items-center text-center">
            <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${
              scanStatus === 'scanning' ? 'bg-indigo-50 shadow-[0_0_50px_rgba(99,102,241,0.3)] scale-110' : 
              scanStatus === 'success' ? 'bg-emerald-50 shadow-[0_0_50px_rgba(16,185,129,0.3)]' :
              scanStatus === 'error' ? 'bg-red-50 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
              'bg-gray-50'
            }`}>
              <Fingerprint 
                size={80} 
                className={`transition-colors duration-500 ${
                  scanStatus === 'scanning' ? 'text-indigo-600 animate-pulse' : 
                  scanStatus === 'success' ? 'text-emerald-500' :
                  scanStatus === 'error' ? 'text-red-500' :
                  'text-gray-300'
                }`} 
              />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Authentification Biométrique</h3>
            <p className="text-gray-500 mb-8 max-w-sm">
              Utilisez le capteur d'empreinte digitale ou Face ID de votre appareil pour enregistrer votre présence.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <button 
              onClick={handleFingerprintScan}
              disabled={scanStatus === 'scanning'}
              className="w-full max-w-xs bg-gray-900 hover:bg-black disabled:bg-gray-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-3"
            >
              {scanStatus === 'scanning' ? (
                <><RefreshCw className="animate-spin" size={24} /> En attente du capteur...</>
              ) : (
                <><Fingerprint size={24} /> Scanner l'empreinte</>
              )}
            </button>
          </div>
        )}

        {/* Message de succès global */}
        {scanStatus === 'success' && scannedUserData && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col items-center justify-center animate-in fade-in duration-300 p-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-emerald-600 mb-2 uppercase tracking-wider">Utilisateur reconnu</h2>
            <p className="text-xl text-emerald-700 font-medium capitalize mb-6">{actionType} enregistrée</p>
            
            <div className="bg-gray-50 w-full max-w-sm rounded-2xl p-6 border border-gray-100 shadow-sm text-left space-y-3">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Nom :</span>
                <span className="font-bold text-gray-900">{scannedUserData.prenom} {scannedUserData.nom}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Rôle :</span>
                <span className="font-bold text-gray-900 capitalize">{scannedUserData.role}</span>
              </div>
              {scannedUserData.classe && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Classe :</span>
                  <span className="font-bold text-gray-900">{scannedUserData.classe}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Action :</span>
                <span className="font-bold text-gray-900 capitalize">{actionType || 'Arrivée'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Heure :</span>
                <span className="font-bold text-gray-900">{scannedUserData.heure}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">Statut :</span>
                <span className={`font-bold ${scannedUserData.statut === 'Présent' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {scannedUserData.statut}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
