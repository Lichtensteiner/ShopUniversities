import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, db, storage } from '../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Lock, Mail, Shield, BookOpen, Fingerprint, AlertCircle, CheckCircle2, RefreshCw, Briefcase, Target, Calendar, Edit2, Save, Camera, Plus, X } from 'lucide-react';
import { resizeImage } from '../lib/imageUtils';

export default function Profile() {
  const { currentUser } = useAuth();
  const { t, tData } = useLanguage();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [biographie, setBiographie] = useState(currentUser?.biographie || '');
  const [matieres, setMatieres] = useState<string[]>(currentUser?.matieres || (currentUser?.matiere ? [currentUser.matiere] : []));
  const [newMatiere, setNewMatiere] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingMatieres, setIsEditingMatieres] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingMatieres, setSavingMatieres] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  if (!currentUser) {
    return null;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      setSuccess("Votre mot de passe a été mis à jour avec succès.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Le mot de passe actuel est incorrect.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Trop de tentatives. Veuillez réessayer plus tard.");
      } else {
        setError("Erreur lors de la mise à jour du mot de passe.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBio = async () => {
    if (!currentUser) return;
    setSavingBio(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        biographie: biographie
      });
      setIsEditingBio(false);
      // Note: currentUser will be updated via onSnapshot in AuthContext
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la biographie:", err);
      alert("Erreur lors de la mise à jour de la biographie.");
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveMatieres = async () => {
    if (!currentUser) return;
    setSavingMatieres(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        matieres: matieres,
        matiere: matieres.length > 0 ? matieres[0] : null // Keep for backward compatibility
      });
      setIsEditingMatieres(false);
    } catch (err) {
      console.error("Erreur lors de la mise à jour des matières:", err);
      alert("Erreur lors de la mise à jour des matières.");
    } finally {
      setSavingMatieres(false);
    }
  };

  const addMatiere = () => {
    if (newMatiere.trim() && !matieres.includes(newMatiere.trim())) {
      setMatieres([...matieres, newMatiere.trim()]);
      setNewMatiere('');
    }
  };

  const removeMatiere = (matiere: string) => {
    setMatieres(matieres.filter(m => m !== matiere));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (type === 'photo') setUploadingPhoto(true);
    else setUploadingCover(true);
    setError('');
    setSuccess('');

    try {
      // Resize image before uploading
      const maxWidth = type === 'photo' ? 400 : 1200;
      const maxHeight = type === 'photo' ? 400 : 600;
      const resizedBlob = await resizeImage(file, maxWidth, maxHeight);

      const storageRef = ref(storage, `users/${currentUser.id}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, resizedBlob);
      const downloadURL = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, { [type]: downloadURL });
      setSuccess(`Votre ${type === 'photo' ? 'photo de profil' : 'photo de couverture'} a été mise à jour.`);
    } catch (err) {
      console.error(err);
      setError(`Erreur lors de l'upload de la ${type === 'photo' ? 'photo' : 'couverture'}.`);
    } finally {
      if (type === 'photo') setUploadingPhoto(false);
      else setUploadingCover(false);
    }
  };

  const roleDetails = {
    'admin': {
      title: "Administrateur Système",
      description: "En tant qu'administrateur, vous avez le contrôle total sur la plateforme ShopUniversities. Votre rôle est crucial pour le bon fonctionnement et la sécurité de l'établissement.",
      missions: [
        "Gestion complète des utilisateurs (élèves, enseignants, personnel)",
        "Configuration des paramètres globaux du système",
        "Supervision des présences et résolution des anomalies",
        "Génération et analyse des rapports statistiques",
        "Gestion des bornes de pointage et de la sécurité biométrique"
      ]
    },
    'enseignant': {
      title: "Enseignant",
      description: "En tant qu'enseignant, vous êtes au cœur du dispositif pédagogique. Vous assurez le suivi de vos classes et la validation des présences.",
      missions: [
        "Gestion de l'appel en classe et validation des présences",
        "Suivi de l'assiduité des élèves de vos cours",
        "Consultation des emplois du temps et des listes de classes",
        "Communication avec l'administration concernant les absences"
      ]
    },
    'élève': {
      title: "Élève / Étudiant",
      description: "En tant qu'élève, cette plateforme vous permet de suivre votre assiduité et de valider votre présence aux cours de manière autonome.",
      missions: [
        "Pointage biométrique ou par QR code aux bornes de l'établissement",
        "Consultation de votre historique de présence et de vos statistiques",
        "Visualisation de votre emploi du temps et de vos classes",
        "Justification des absences et retards auprès de l'administration"
      ]
    },
    'personnel administratif': {
      title: "Personnel Administratif",
      description: "En tant que membre de l'administration, vous assurez le suivi quotidien de la vie scolaire et la gestion des flux d'élèves.",
      missions: [
        "Contrôle des accès et supervision des bornes de pointage",
        "Gestion des retards, absences et justifications des élèves",
        "Assistance aux élèves et enseignants sur l'utilisation du système",
        "Suivi administratif des dossiers scolaires et édition de rapports"
      ]
    }
  };

  const currentRoleInfo = roleDetails[currentUser.role as keyof typeof roleDetails] || roleDetails['élève'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mon Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            {/* Cover Photo */}
            <div className="h-32 bg-indigo-600 relative group overflow-hidden">
              {currentUser.cover ? (
                <img src={currentUser.cover} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              )}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'cover')} disabled={uploadingCover} />
                {uploadingCover ? <RefreshCw className="text-white animate-spin" /> : <Camera className="text-white" />}
              </label>
            </div>

            <div className="p-6 text-center border-b border-gray-100 bg-gray-50/50 relative pt-14">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 group">
                {currentUser.photo ? (
                  <img src={currentUser.photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm bg-white" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl uppercase border-4 border-white shadow-sm bg-white">
                    {currentUser.prenom?.[0] || currentUser.email?.[0] || 'U'}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'photo')} disabled={uploadingPhoto} />
                  {uploadingPhoto ? <RefreshCw className="text-white animate-spin" /> : <Camera className="text-white" />}
                </label>
              </div>
              
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {currentUser.prenom || currentUser.nom ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() : currentUser.email?.split('@')[0] || 'Utilisateur'}
              </h2>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize mt-2 ${
                currentUser.role === 'élève' ? 'bg-blue-100 text-blue-700' :
                currentUser.role === 'enseignant' ? 'bg-purple-100 text-purple-700' :
                currentUser.role === 'admin' ? 'bg-red-100 text-red-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {tData(currentUser.role)}
              </span>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="text-gray-400" size={18} />
                <div className="flex-1 overflow-hidden">
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="font-medium text-gray-900 truncate">{currentUser.email}</p>
                </div>
              </div>
              
              {currentUser.matricule && (
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="text-gray-400" size={18} />
                  <div>
                    <p className="text-gray-500 text-xs">{t('id_number')}</p>
                    <p className="font-mono text-gray-900">{currentUser.matricule}</p>
                  </div>
                </div>
              )}

              {currentUser.role === 'élève' && currentUser.classe && (
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="text-gray-400" size={18} />
                  <div>
                    <p className="text-gray-500 text-xs">{t('class')}</p>
                    <p className="font-medium text-gray-900">{currentUser.classe}</p>
                  </div>
                </div>
              )}

              {currentUser.date_creation && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="text-gray-400" size={18} />
                  <div>
                    <p className="text-gray-500 text-xs">Membre depuis</p>
                    <p className="font-medium text-gray-900">
                      {new Date(currentUser.date_creation).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-xs mb-2">{t('biometric_status')}</p>
                {currentUser.face_id && currentUser.fingerprint_id ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl text-sm font-medium">
                    <Fingerprint size={16} />
                    {t('registration_complete')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-xl text-sm font-medium">
                    <AlertCircle size={16} />
                    {t('registration_incomplete')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security / Password Change and Role Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Role & Missions Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Briefcase size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Rôle et Missions</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold text-gray-900">Biographie</h3>
                  {!isEditingBio ? (
                    <button 
                      onClick={() => setIsEditingBio(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                    >
                      <Edit2 size={14} /> Modifier
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setIsEditingBio(false);
                          setBiographie(currentUser.biographie || '');
                        }}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                        disabled={savingBio}
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingBio ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Enregistrer
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingBio ? (
                  <textarea
                    value={biographie}
                    onChange={(e) => setBiographie(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] text-sm"
                    placeholder="Parlez-nous un peu de vous..."
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[80px]">
                    {currentUser.biographie ? (
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{currentUser.biographie}</p>
                    ) : (
                      <p className="text-gray-400 text-sm italic">Aucune biographie renseignée.</p>
                    )}
                  </div>
                )}
              </div>

              {currentUser.role === 'enseignant' && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-semibold text-gray-900">{t('subjects')}</h3>
                    {!isEditingMatieres ? (
                      <button 
                        onClick={() => setIsEditingMatieres(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                      >
                        <Edit2 size={14} /> Modifier
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setIsEditingMatieres(false);
                            setMatieres(currentUser.matieres || (currentUser.matiere ? [currentUser.matiere] : []));
                          }}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                          disabled={savingMatieres}
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleSaveMatieres}
                          disabled={savingMatieres}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingMatieres ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          Enregistrer
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingMatieres ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMatiere}
                          onChange={(e) => setNewMatiere(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMatiere())}
                          placeholder="Ajouter une matière (ex: Mathématiques)"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addMatiere}
                          className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matieres.map(m => (
                          <span key={m} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                            {m}
                            <button onClick={() => removeMatiere(m)} className="text-indigo-400 hover:text-indigo-600">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(currentUser.matieres || (currentUser.matiere ? [currentUser.matiere] : [])).length > 0 ? (
                        (currentUser.matieres || (currentUser.matiere ? [currentUser.matiere] : [])).map((m: string) => (
                          <span key={m} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {m}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm italic">Aucune matière renseignée.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-md font-semibold text-gray-900 mb-2">{currentRoleInfo.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {currentRoleInfo.description}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
                  <Target size={18} className="text-indigo-600" />
                  <h4>Vos missions principales</h4>
                </div>
                <ul className="space-y-3">
                  {currentRoleInfo.missions.map((mission, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                      <span>{mission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Lock size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Sécurité et Mot de passe</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm border border-emerald-100 flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">Au moins 6 caractères.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : null}
                  Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
