import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

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
      setShowCreate(false);
      setNewSurvey({ title: '', description: '', type: 'poll', optionsText: '' });
    } catch (error) {
      console.error("Error creating survey:", error);
    }
  };

  const handleVote = async (survey: Survey, optionId: string) => {
    if (survey.voters.includes(currentUser?.id || '')) {
      alert("Vous avez déjà voté !");
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
    await updateDoc(doc(db, 'surveys', id), { status: 'closed' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Vote size={24} />
            </div>
            {t('surveys')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Participez aux décisions de l'établissement et aux élections de délégués.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-purple-200 dark:shadow-none"
          >
            <Plus size={20} />
            Nouveau Sondage
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {surveys.map((survey) => (
            <motion.div
              key={survey.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-6 relative group"
            >
              <div className="flex justify-between items-start">
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  survey.type === 'election' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                }`}>
                  {survey.type === 'election' ? 'Élection délégués' : 'Sondage'}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                  survey.status === 'active' ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${survey.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  {survey.status === 'active' ? 'Ouvert' : 'Clôturé'}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 italic tracking-tighter">{survey.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {survey.description}
                </p>
              </div>

              <div className="space-y-3">
                {survey.options.map((option) => {
                  const totalVotes = survey.options.reduce((sum, opt) => sum + opt.votes, 0);
                  const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                  const hasVoted = survey.voters.includes(currentUser?.id || '');

                  return (
                    <div key={option.id} className="relative group/opt">
                      <button
                        onClick={() => handleVote(survey, option.id)}
                        disabled={survey.status === 'closed' || hasVoted}
                        className={`w-full relative z-10 px-4 py-4 rounded-2xl border-2 transition-all flex items-center justify-between overflow-hidden ${
                          hasVoted 
                          ? 'border-indigo-100 bg-indigo-50/20' 
                          : 'border-gray-50 bg-gray-50/50 hover:border-indigo-500 hover:bg-white'
                        } disabled:cursor-not-allowed`}
                      >
                        <span className="font-bold text-gray-700 dark:text-gray-300 relative z-20 text-sm">{option.label}</span>
                        {hasVoted && (
                          <div className="flex items-center gap-2 relative z-20">
                            <span className="text-xs font-black text-indigo-600">{percentage}%</span>
                            <CheckSquare size={16} className="text-indigo-600" />
                          </div>
                        )}
                        
                        {/* Progress Bar Background */}
                        {hasVoted && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="absolute inset-y-0 left-0 bg-indigo-500/10 z-0"
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{survey.voters.length} participants</span>
                </div>
                {isAdmin && survey.status === 'active' && (
                  <button 
                    onClick={() => closeSurvey(survey.id)}
                    className="text-red-500 hover:underline"
                  >
                    Clôturer
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Survey Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl max-w-xl w-full p-10 border border-white/20"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Nouveau Sondage</h2>
              <button 
                onClick={() => setShowCreate(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XCircle size={28} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Type de consultation</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewSurvey({...newSurvey, type: 'poll'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      newSurvey.type === 'poll' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'
                    }`}
                  >
                    <BarChart3 size={24} />
                    <span className="text-sm font-bold">Sondage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSurvey({...newSurvey, type: 'election'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      newSurvey.type === 'election' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-400'
                    }`}
                  >
                    <Users size={24} />
                    <span className="text-sm font-bold">Élection</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Titre de la consultation</label>
                <input
                  type="text"
                  required
                  value={newSurvey.title}
                  onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-purple-500/20 outline-none font-bold"
                  placeholder="Ex: Choix de la destination du voyage scolaire"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description / Contexte</label>
                <textarea
                  value={newSurvey.description}
                  onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-purple-500/20 outline-none font-medium h-24 resize-none"
                  placeholder="Expliquez l'enjeu du vote..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Options de réponse (une par ligne)</label>
                <textarea
                  required
                  value={newSurvey.optionsText}
                  onChange={(e) => setNewSurvey({ ...newSurvey, optionsText: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-purple-500/20 outline-none font-mono h-32 resize-none"
                  placeholder="Option 1&#10;Option 2&#10;Option 3..."
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-purple-600 text-white rounded-[2rem] font-black shadow-xl shadow-purple-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all text-lg mt-4"
              >
                Lancer la consultation
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
