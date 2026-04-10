import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight,
  User as UserIcon,
  Castle,
  MessageSquare
} from 'lucide-react';

interface Child {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  matricule: string;
  photo?: string;
  house_id?: string;
}

export default function ParentDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childAttendance, setChildAttendance] = useState<any[]>([]);
  const [childHouse, setChildHouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linkingChild, setLinkingChild] = useState(false);
  const [matriculeToLink, setMatriculeToLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser?.children_ids || currentUser.children_ids.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const childrenData: Child[] = [];
        for (const childId of currentUser.children_ids) {
          const childDoc = await getDoc(doc(db, 'users', childId));
          if (childDoc.exists()) {
            childrenData.push({ id: childDoc.id, ...childDoc.data() } as Child);
          }
        }
        setChildren(childrenData);
        if (childrenData.length > 0 && !selectedChild) {
          setSelectedChild(childrenData[0]);
        }
      } catch (err) {
        console.error("Error fetching children:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [currentUser]);

  useEffect(() => {
    const fetchChildDetails = async () => {
      if (!selectedChild) return;
      
      setLoading(true);
      try {
        // Fetch attendance
        const attQuery = query(collection(db, 'attendance'), where('user_id', '==', selectedChild.id));
        const attSnap = await getDocs(attQuery);
        const attData = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        attData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setChildAttendance(attData);

        // Fetch house
        if (selectedChild.house_id) {
          const houseDoc = await getDoc(doc(db, 'houses', selectedChild.house_id));
          if (houseDoc.exists()) {
            setChildHouse({ id: houseDoc.id, ...houseDoc.data() });
          } else {
            setChildHouse(null);
          }
        } else {
          setChildHouse(null);
        }
      } catch (err) {
        console.error("Error fetching child details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChildDetails();
  }, [selectedChild]);

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    
    if (!matriculeToLink.trim()) return;

    try {
      const q = query(collection(db, 'users'), where('matricule', '==', matriculeToLink.trim()), where('role', '==', 'élève'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLinkError("Aucun élève trouvé avec ce matricule.");
        return;
      }

      const childDoc = querySnapshot.docs[0];
      const childId = childDoc.id;

      if (currentUser?.children_ids?.includes(childId)) {
        setLinkError("Cet enfant est déjà lié à votre compte.");
        return;
      }

      await updateDoc(doc(db, 'users', currentUser!.id), {
        children_ids: arrayUnion(childId)
      });

      setLinkSuccess("Enfant lié avec succès !");
      setMatriculeToLink('');
      setLinkingChild(false);
      
      // Refresh children list (handled by currentUser dependency in useEffect)
    } catch (err) {
      console.error("Error linking child:", err);
      setLinkError("Une erreur est survenue lors de la liaison.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('parent_dashboard')}</h1>
          <p className="text-gray-500 dark:text-gray-400">Suivez la scolarité de vos enfants en temps réel</p>
        </div>
        <button 
          onClick={() => setLinkingChild(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          {t('link_child')}
        </button>
      </div>

      {linkingChild && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('link_child')}</h2>
            <form onSubmit={handleLinkChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('child_matricule')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={matriculeToLink}
                    onChange={(e) => setMatriculeToLink(e.target.value)}
                    placeholder="Ex: 2023-001"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              {linkError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{linkError}</p>}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setLinkingChild(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  {t('confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Children Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            {t('my_children')}
          </h2>
          <div className="space-y-2">
            {children.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-sm text-gray-500">{t('no_student_in_class')}</p>
              </div>
            ) : (
              children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selectedChild?.id === child.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {child.photo ? (
                    <img src={child.photo} alt={child.prenom} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedChild?.id === child.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                      {child.prenom[0]}
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold truncate">{child.prenom} {child.nom}</p>
                    <p className={`text-xs truncate ${selectedChild?.id === child.id ? 'text-indigo-100' : 'text-gray-500'}`}>{child.classe}</p>
                  </div>
                  <ChevronRight size={18} className={selectedChild?.id === child.id ? 'text-white' : 'text-gray-400'} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Child Details */}
        <div className="lg:col-span-3 space-y-6">
          {selectedChild ? (
            <>
              {/* Child Header Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {selectedChild.photo ? (
                      <img src={selectedChild.photo} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-4 border-indigo-50 dark:border-indigo-900/30" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-2xl font-bold uppercase">
                        {selectedChild.prenom[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedChild.prenom} {selectedChild.nom}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium">
                          {selectedChild.classe}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium">
                          Matricule: {selectedChild.matricule}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {childHouse && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                      <div className="w-12 h-12 flex items-center justify-center text-2xl bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        {childHouse.logo.startsWith('http') ? (
                          <img src={childHouse.logo} alt={childHouse.nom_maison} className="w-8 h-8 object-cover rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          childHouse.logo
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('house')}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{childHouse.nom_maison}</p>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{childHouse.total_points} pts</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Présences</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {childAttendance.filter(a => a.statut === 'Présent').length}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400 rounded-lg">
                      <Clock size={20} />
                    </div>
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Retards</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {childAttendance.filter(a => a.statut === 'Retard').length}
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Points Maison</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    {childHouse?.total_points || 0}
                  </p>
                </div>
              </div>

              {/* Attendance History */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">Historique de présence</h3>
                </div>
                {loading ? (
                  <div className="p-12 flex justify-center">
                    <RefreshCw className="animate-spin text-indigo-600" size={32} />
                  </div>
                ) : childAttendance.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Aucun pointage enregistré pour cet enfant.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {childAttendance.map(record => (
                      <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            record.statut === 'Présent' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white capitalize">
                              {new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Arrivée à {record.heure_arrivee}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          record.statut === 'Présent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                        }`}>
                          {record.statut}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserIcon size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sélectionnez un enfant</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Choisissez l'un de vos enfants dans la liste de gauche pour voir ses détails ou liez-en un nouveau.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
