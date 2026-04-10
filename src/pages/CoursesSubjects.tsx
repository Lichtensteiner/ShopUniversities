import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, GraduationCap, ChevronRight, FileText, Search, Filter, Sparkles, Clock, User, X, Send, Trash2, Edit } from 'lucide-react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface CoursesSubjectsProps {
  initialPrepId?: string;
}

export default function CoursesSubjects({ initialPrepId }: CoursesSubjectsProps) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [preparations, setPreparations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedPrep, setSelectedPrep] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'subjects'>('courses');

  useEffect(() => {
    if (initialPrepId && preparations.length > 0) {
      const prep = preparations.find(p => p.id === initialPrepId);
      if (prep) {
        setSelectedPrep(prep);
      }
    }
  }, [initialPrepId, preparations]);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch classes
    let classesQuery;
    if (currentUser.role === 'admin') {
      classesQuery = query(collection(db, 'classes'));
    } else {
      classesQuery = query(
        collection(db, 'classes'),
        where('enseignants_ids', 'array-contains', currentUser.id)
      );
    }

    const unsubscribeClasses = onSnapshot(classesQuery, (snap) => {
      const classesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesData);
    });

    // Fetch preparations
    let prepsQuery;
    if (currentUser.role === 'admin') {
      prepsQuery = query(collection(db, 'preparations'));
    } else {
      prepsQuery = query(
        collection(db, 'preparations'),
        where('authorId', '==', currentUser.id)
      );
    }

    const unsubscribePreps = onSnapshot(prepsQuery, (snap) => {
      const preps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid requiring a composite index
      preps.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setPreparations(preps);
      setLoading(false);
    });

    return () => {
      unsubscribeClasses();
      unsubscribePreps();
    };
  }, [currentUser]);

  const filteredPreps = preparations.filter(prep => {
    const matchesSearch = prep.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         prep.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassId === 'all' || prep.grade === selectedClassId; // Using grade as a proxy for class/level
    return matchesSearch && matchesClass;
  });

  // Group by subject
  const groupedPreps = filteredPreps.reduce((acc: any, prep) => {
    const subject = prep.subject || 'Autre';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(prep);
    return acc;
  }, {});

  const handleDeletePrep = async (e: React.MouseEvent, prepId: string) => {
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) {
      try {
        await deleteDoc(doc(db, 'preparations', prepId));
        if (selectedPrep?.id === prepId) setSelectedPrep(null);
      } catch (error) {
        console.error("Error deleting preparation:", error);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleStartEdit = () => {
    if (selectedPrep) {
      setEditContent(selectedPrep.content);
      setEditTopic(selectedPrep.topic);
      setIsEditing(true);
    }
  };

  const handleUpdatePrep = async () => {
    if (!selectedPrep) return;
    try {
      await updateDoc(doc(db, 'preparations', selectedPrep.id), {
        content: editContent,
        topic: editTopic
      });
      setSelectedPrep({ ...selectedPrep, content: editContent, topic: editTopic });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating preparation:", error);
      alert("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={28} />
            {t('courses_subjects')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {currentUser?.role === 'admin' 
              ? 'Supervision de tous les contenus pédagogiques de l\'établissement'
              : 'Gérez vos contenus pédagogiques et préparations IA par classe'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Cours & Préparations
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Matières par Classe
        </button>
      </div>

      {activeTab === 'courses' ? (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un cours, un sujet..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Toutes les classes / niveaux</option>
                {Array.from(new Set(preparations.map(p => p.grade))).filter(Boolean).map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          {Object.keys(groupedPreps).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun cours trouvé</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {currentUser?.role === 'admin' 
                  ? 'Aucune préparation n\'a été générée par les enseignants pour le moment.'
                  : 'Vous n\'avez pas encore de préparations enregistrées. Utilisez l\'Assistant IA pour générer vos premiers cours.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(groupedPreps).map(subject => (
                <div key={subject} className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">{subject}</h2>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {groupedPreps[subject].length} cours
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedPreps[subject].map((prep: any) => (
                      <div 
                        key={prep.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                              <Sparkles size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                              {(currentUser?.role === 'admin' || prep.authorId === currentUser?.id) && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPrep(prep);
                                      setEditContent(prep.content);
                                      setEditTopic(prep.topic);
                                      setIsEditing(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={(e) => handleDeletePrep(e, prep.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded uppercase tracking-wider">
                                {t(prep.type)}
                              </div>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{prep.topic}</h3>
                          <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-4">
                            <GraduationCap size={14} />
                            <span>{prep.grade}</span>
                          </div>

                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={14} />
                              <span>Généré le {new Date(prep.createdAt?.toDate()).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <User size={14} />
                              <span>Par {prep.authorName}</span>
                            </div>
                          </div>

                          <div className="prose dark:prose-invert max-w-none text-xs text-gray-600 dark:text-gray-300 line-clamp-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 italic">
                            {prep.content}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                          <button 
                            onClick={() => setSelectedPrep(prep)}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Voir le cours complet
                          </button>
                          <ChevronRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.nom}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cls.niveau}</p>
              </div>
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matières enseignées</h4>
                {cls.matieres && cls.matieres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cls.matieres.map((m: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium rounded-xl border border-indigo-100 dark:border-indigo-800">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucune matière définie pour cette classe.</p>
                )}
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune classe trouvée.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrep && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex-1 mr-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPrep.topic}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPrep.subject} • {selectedPrep.grade}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button 
                    onClick={handleStartEdit}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Modifier"
                  >
                    <Edit size={20} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedPrep(null);
                    setIsEditing(false);
                  }} 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none custom-scrollbar"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedPrep.content}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdatePrep}
                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Enregistrer les modifications
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedPrep(null)}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('close')}
                  </button>
                  <button
                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Send size={18} />
                    {t('publish_to_class')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
