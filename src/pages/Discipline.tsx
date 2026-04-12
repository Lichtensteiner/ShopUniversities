import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, addDoc, serverTimestamp, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Ban, 
  Clock, 
  User, 
  Calendar,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Sanction {
  id: string;
  studentId: string;
  studentName: string;
  type: 'warning' | 'detention' | 'exclusion' | 'expulsion' | 'other';
  reason: string;
  date: any;
  duration?: string;
  status: 'active' | 'completed' | 'cancelled';
  recordedBy: string;
  recordedByName: string;
}

const Discipline: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSanction, setNewSanction] = useState({
    studentId: '',
    type: 'warning' as const,
    reason: '',
    duration: '',
  });

  useEffect(() => {
    if (!currentUser || !['admin', 'enseignant', 'personnel administratif'].includes(currentUser.role)) return;

    const unsubscribe = onSnapshot(collection(db, 'sanctions'), (snap) => {
      const sanctionData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sanction[];
      
      sanctionData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setSanctions(sanctionData);
      setLoading(false);
    });

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'élève'));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchStudents();
    return () => unsubscribe();
  }, [currentUser]);

  const filteredSanctions = sanctions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || s.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddSanction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const student = students.find(s => s.id === newSanction.studentId);
      await addDoc(collection(db, 'sanctions'), {
        ...newSanction,
        studentName: student ? `${student.prenom} ${student.nom}` : 'Inconnu',
        date: serverTimestamp(),
        status: 'active',
        recordedBy: currentUser.id,
        recordedByName: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim()
      });
      setShowAddModal(false);
      setNewSanction({
        studentId: '',
        type: 'warning',
        reason: '',
        duration: '',
      });
    } catch (error) {
      console.error("Error saving sanction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSanction = async (id: string) => {
    if (window.confirm("Supprimer cette sanction ?")) {
      try {
        await deleteDoc(doc(db, 'sanctions', id));
      } catch (error) {
        console.error("Error deleting sanction:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'detention': return <Clock size={16} className="text-orange-500" />;
      case 'exclusion': return <Ban size={16} className="text-red-500" />;
      case 'expulsion': return <XCircle size={16} className="text-red-700" />;
      default: return <ShieldAlert size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-red-600" />
            {t('discipline')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Suivi disciplinaire et sanctions</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
        >
          <Plus size={18} />
          Nouvelle sanction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un élève ou un motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={20} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Toutes les sanctions</option>
            <option value="warning">Avertissement</option>
            <option value="detention">Heure de colle</option>
            <option value="exclusion">Exclusion temporaire</option>
            <option value="expulsion">Exclusion définitive</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      {/* Sanctions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Chargement...</div>
        ) : filteredSanctions.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
            <ShieldAlert size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucune sanction</h3>
            <p className="text-gray-500 dark:text-gray-400">Le dossier disciplinaire est vide.</p>
          </div>
        ) : (
          filteredSanctions.map((sanction) => (
            <motion.div
              key={sanction.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(sanction.status)}`}>
                  {getTypeIcon(sanction.type)}
                  {sanction.type}
                </div>
                <button 
                  onClick={() => handleDeleteSanction(sanction.id)}
                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {sanction.studentName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{sanction.studentName}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {sanction.date?.toDate ? sanction.date.toDate().toLocaleDateString(language) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{sanction.reason}"</p>
              </div>

              {sanction.duration && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Clock size={14} />
                  <span>Durée: {sanction.duration}</span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <User size={10} />
                  <span>Par {sanction.recordedByName}</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {sanction.status}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Sanction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle sanction</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddSanction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Élève</label>
                  <select
                    required
                    value={newSanction.studentId}
                    onChange={(e) => setNewSanction({...newSanction, studentId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Sélectionner un élève</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                    <select
                      value={newSanction.type}
                      onChange={(e) => setNewSanction({...newSanction, type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="warning">Avertissement</option>
                      <option value="detention">Heure de colle</option>
                      <option value="exclusion">Exclusion temporaire</option>
                      <option value="expulsion">Exclusion définitive</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durée (si applicable)</label>
                    <input
                      type="text"
                      value={newSanction.duration}
                      onChange={(e) => setNewSanction({...newSanction, duration: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Ex: 2 heures, 3 jours..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif détaillé</label>
                  <textarea
                    required
                    rows={4}
                    value={newSanction.reason}
                    onChange={(e) => setNewSanction({...newSanction, reason: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    placeholder="Expliquez la raison de la sanction..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer la sanction'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discipline;
