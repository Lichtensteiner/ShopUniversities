import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { recordAuditLog } from '../services/auditService';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { 
  Vote, 
  CheckSquare, 
  Plus, 
  Users, 
  Trophy, 
  BarChart3,
  Clock,
  ChevronRight,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { deleteDoc } from 'firebase/firestore';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'poll' | 'election';
  options: { id: string; label: string; votes: number }[];
  voters: string[];
  status: 'active' | 'closed';
  createdAt: any;
  endDate?: string;
}

export default function Surveys() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { notifySuccess, notifyError, notifyDelete } = useNotification();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    title: '',
    description: '',
    type: 'poll' as 'poll' | 'election',
    optionsText: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'personnel administratif';

  useEffect(() => {
    const q = query(collection(db, 'surveys'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSurveys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Survey[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = newSurvey.optionsText.split('\n').filter(o => o.trim()).map((o, i) => ({
      id: `opt_${i}`,
      label: o.trim(),
      votes: 0
    }));

    if (!newSurvey.title || options.length < 2) return;

    try {
      await addDoc(collection(db, 'surveys'), {
        title: newSurvey.title,
        description: newSurvey.description,
        type: newSurvey.type,
        options,
        voters: [],
        status: 'active',
        createdAt: serverTimestamp()
      });

      if (currentUser) {
        await recordAuditLog({
          userId: currentUser.id,
          userName: `${currentUser.prenom} ${currentUser.nom}`,
          userRole: currentUser.role,
          action: "Lancement de consultation",
          details: `Titre: ${newSurvey.title}, Type: ${newSurvey.type}`,
          category: 'management'
        });
      }

      setShowCreate(false);
      setNewSurvey({ title: '', description: '', type: 'poll', optionsText: '' });
    } catch (error) {
      console.error("Error creating survey:", error);
    }
  };

  const handleVote = async (survey: Survey, optionId: string) => {
    if (survey.voters.includes(currentUser?.id || '')) {
      notifyError("Vous avez déjà voté !");
      return;
    }

    try {
      const updatedOptions = survey.options.map(opt => 
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );

      await updateDoc(doc(db, 'surveys', survey.id), {
        options: updatedOptions,
        voters: arrayUnion(currentUser?.id)
      });
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const closeSurvey = async (id: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'surveys', id), { status: 'closed' });
      
      if (currentUser) {
        const survey = surveys.find(s => s.id === id);
        await recordAuditLog({
          userId: currentUser.id,
          userName: `${currentUser.prenom} ${currentUser.nom}`,
          userRole: currentUser.role,
          action: "Clôture de consultation",
          details: `Consultation clôturée: ${survey?.title || id}`,
          category: 'management'
        });
      }
    } catch (error) {
      console.error("Error closing survey:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette consultation ?")) return;
    try {
      const surveyToDelete = surveys.find(s => s.id === id);
      await deleteDoc(doc(db, 'surveys', id));

      if (currentUser) {
        await recordAuditLog({
          userId: currentUser.id,
          userName: `${currentUser.prenom} ${currentUser.nom}`,
          userRole: currentUser.role,
          action: "Suppression de consultation",
          details: `Consultation supprimée: ${surveyToDelete?.title || id}`,
          category: 'management'
        });
      }
    } catch (error) {
      console.error("Error deleting survey:", error);
    }
  };

  const getWinner = (options: { id: string; label: string; votes: number }[]) => {
    if (options.length === 0) return null;
    return options.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Vote size={24} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {t('surveys')} & Élections
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium leading-relaxed">
            Exprimez votre voix dans la vie de l'établissement. Participez aux sondages d'opinion et élisez vos représentants en toute transparence.
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Lancer un vote
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : surveys.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {surveys.sort((a, b) => {
              // Active first, then by date
              if (a.status === 'active' && b.status === 'closed') return -1;
              if (a.status === 'closed' && b.status === 'active') return 1;
              return 0;
            }).map((survey) => {
              const totalVotes = survey.options.reduce((sum, opt) => sum + opt.votes, 0);
              const hasVoted = survey.voters.includes(currentUser?.id || '');
              const isClosed = survey.status === 'closed';
              const winner = isClosed ? getWinner(survey.options) : null;

              return (
                <motion.div
                  key={survey.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative flex flex-col bg-white dark:bg-gray-800 p-8 rounded-[3rem] border transition-all duration-300 ${
                    isClosed 
                      ? 'border-gray-100 dark:border-gray-700 opacity-90' 
                      : 'border-indigo-50 dark:border-indigo-900/30 shadow-xl shadow-indigo-50 dark:shadow-none'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        survey.type === 'election' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {survey.type === 'election' ? <Users size={12} /> : <BarChart3 size={12} />}
                        {survey.type === 'election' ? 'Élection' : 'Sondage'}
                      </div>
                      
                      {isClosed && (
                        <div className="px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Clock size={12} />
                          Terminé
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isClosed && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          En cours
                        </span>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(survey.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-3 tracking-tight italic">
                      {survey.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium line-clamp-3 hover:line-clamp-none transition-all">
                      {survey.description}
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3.5 mb-8">
                    {survey.options.map((option) => {
                      const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                      const isWinner = winner?.id === option.id;

                      return (
                        <div key={option.id} className="relative">
                          <button
                            onClick={() => handleVote(survey, option.id)}
                            disabled={isClosed || hasVoted}
                            className={`w-full group relative z-10 px-6 py-4 rounded-2xl border transition-all flex items-center justify-between overflow-hidden ${
                              hasVoted || isClosed
                                ? (isWinner ? 'border-indigo-500 bg-indigo-50/10' : 'border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30')
                                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-500 hover:bg-indigo-50/5 dark:hover:bg-indigo-900/10 shadow-sm active:scale-[0.98]'
                            } disabled:cursor-not-allowed`}
                          >
                            <div className="flex items-center gap-3 relative z-20">
                              <span className={`font-bold text-sm ${
                                isWinner ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {option.label}
                              </span>
                              {isWinner && <Trophy size={14} className="text-indigo-600" />}
                            </div>

                            {(hasVoted || isClosed) && (
                              <div className="flex items-center gap-3 relative z-20">
                                <span className={`text-xs font-black ${
                                  isWinner ? 'text-indigo-600' : 'text-gray-400'
                                }`}>
                                  {percentage}%
                                </span>
                                {isWinner && <ShieldCheck size={16} className="text-indigo-600" />}
                              </div>
                            )}
                            
                            {/* Progress Fill */}
                            {(hasVoted || isClosed) && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`absolute inset-y-0 left-0 z-0 transition-colors ${
                                  isWinner ? 'bg-indigo-500/10' : 'bg-gray-500/10'
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary & Actions */}
                  <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Users size={14} className="text-gray-300" />
                        <span>{survey.voters.length} {survey.voters.length > 1 ? 'participants' : 'participant'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <CheckSquare size={14} className="text-gray-300" />
                        <span>{totalVotes} {totalVotes > 1 ? 'votes' : 'vote'}</span>
                      </div>
                    </div>

                    {isAdmin && !isClosed && (
                      <button 
                        onClick={() => closeSurvey(survey.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Clôturer le vote
                      </button>
                    )}
                  </div>

                  {/* Trophy for winner overlay */}
                  {isClosed && winner && (
                    <div className="absolute top-8 right-8 animate-bounce">
                      <Trophy size={32} className="text-indigo-500 opacity-20" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/30 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-700 text-center px-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-3xl flex items-center justify-center mb-6">
            <Vote size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Aucun vote en cours</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm font-medium leading-relaxed mb-8">
            Les consultations et élections apparaîtront ici dès qu'elles seront lancées par l'administration.
          </p>
          {isAdmin && (
            <button 
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-indigo-200"
            >
              <Plus size={20} />
              Lancer la première consultation
            </button>
          )}
        </div>
      )}

      {/* Create Survey Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl max-w-2xl w-full p-8 md:p-12 border border-white/20 relative z-10"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight italic">Nouvelle Consultation</h2>
                  <p className="text-sm text-gray-400 font-medium mt-1 uppercase tracking-widest">Lancez un sondage ou une élection</p>
                </div>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
                >
                  <XCircle size={28} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Configuration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewSurvey({...newSurvey, type: 'poll'})}
                      className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all group ${
                        newSurvey.type === 'poll' 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                          : 'border-gray-50 dark:border-gray-700 text-gray-400 grayscale hover:grayscale-0'
                      }`}
                    >
                      <BarChart3 size={28} />
                      <span className="text-xs font-black uppercase tracking-widest">Sondage Express</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSurvey({...newSurvey, type: 'election'})}
                      className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all group ${
                        newSurvey.type === 'election' 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' 
                          : 'border-gray-50 dark:border-gray-700 text-gray-400 grayscale hover:grayscale-0'
                      }`}
                    >
                      <Users size={28} />
                      <span className="text-xs font-black uppercase tracking-widest">Élection Délégués</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newSurvey.title}
                      onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold placeholder:text-gray-400"
                      placeholder="Quel est le titre de cette consultation ?"
                    />
                  </div>

                  <div className="relative">
                    <textarea
                      value={newSurvey.description}
                      onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-6 py-5 text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none font-medium h-28 resize-none placeholder:text-gray-400"
                      placeholder="Décrivez les enjeux et le contexte du vote..."
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Options (une par ligne)</label>
                    <textarea
                      required
                      value={newSurvey.optionsText}
                      onChange={(e) => setNewSurvey({ ...newSurvey, optionsText: e.target.value })}
                      className="w-full bg-indigo-50/30 dark:bg-indigo-900/10 border-2 border-indigo-50 dark:border-indigo-900/30 border-dashed rounded-2xl px-6 py-5 text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none font-mono h-36 resize-none placeholder:text-gray-400"
                      placeholder="Option 1&#10;Option 2&#10;Option 3..."
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black shadow-2xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all text-xl mt-4"
                >
                  Lancer officiellement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
