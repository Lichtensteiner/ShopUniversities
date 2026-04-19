import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  FileText, 
  TrendingUp, 
  Award, 
  BookOpen,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Search,
  X,
  UserCircle,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  coefficient: number;
  date: any;
  title: string;
  comment?: string;
  classId: string;
  type?: 'interrogation' | 'evaluation';
}

const Grades: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [viewingGrade, setViewingGrade] = useState<Grade | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [newGrade, setNewGrade] = useState({
    studentId: '',
    subject: '',
    title: '',
    score: '',
    maxScore: '20',
    coefficient: '1',
    comment: '',
    classId: '',
    type: 'interrogation' as 'interrogation' | 'evaluation'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'élève')));
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    if (currentUser?.role === 'enseignant' || currentUser?.role === 'admin') {
      fetchStudents();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let gradesQuery;
    if (currentUser.role === 'élève') {
      gradesQuery = query(
        collection(db, 'grades'),
        where('studentId', '==', currentUser.id)
      );
    } else if (currentUser.role === 'enseignant') {
      // For teachers, we might want to show grades they've given or for their classes
      // For now, let's just show all grades if they are admin or teacher
      gradesQuery = query(
        collection(db, 'grades')
      );
    } else {
      gradesQuery = query(
        collection(db, 'grades')
      );
    }

    const unsubscribe = onSnapshot(gradesQuery, (snapshot) => {
      const gradesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Grade[];
      
      // Sort client-side to avoid requiring composite indexes
      gradesData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setGrades(gradesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching grades:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const subjects = Array.from(new Set(grades.map(g => g.subject)));

  const filteredGrades = grades.filter(grade => {
    const matchesSubject = selectedSubject === 'all' || grade.subject === selectedSubject;
    const matchesSearch = grade.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         grade.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const calculateAverage = (subjectGrades: Grade[]) => {
    if (subjectGrades.length === 0) return 0;
    const totalWeightedScore = subjectGrades.reduce((acc, g) => acc + (g.score / g.maxScore * 20) * g.coefficient, 0);
    const totalCoefficients = subjectGrades.reduce((acc, g) => acc + g.coefficient, 0);
    return totalWeightedScore / totalCoefficients;
  };

  const generalAverage = calculateAverage(grades);

  const handleDeleteGrade = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;
    try {
      await deleteDoc(doc(db, 'grades', id));
    } catch (error) {
      console.error("Error deleting grade:", error);
    }
  };

  const handleEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setNewGrade({
      studentId: grade.studentId,
      subject: grade.subject,
      title: grade.title,
      score: grade.score.toString(),
      maxScore: grade.maxScore.toString(),
      coefficient: grade.coefficient.toString(),
      comment: grade.comment || '',
      classId: grade.classId,
      type: grade.type || 'interrogation'
    });
    setShowAddModal(true);
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const student = students.find(s => s.id === newGrade.studentId);
      const gradeData = {
        ...newGrade,
        score: parseFloat(newGrade.score),
        maxScore: parseFloat(newGrade.maxScore),
        coefficient: parseFloat(newGrade.coefficient),
        studentName: student ? `${student.prenom} ${student.nom}` : 'Inconnu',
        teacherId: currentUser.id,
        updatedAt: serverTimestamp()
      };

      if (editingGrade) {
        await updateDoc(doc(db, 'grades', editingGrade.id), gradeData);
      } else {
        await addDoc(collection(db, 'grades'), {
          ...gradeData,
          date: serverTimestamp()
        });
      }
      
      setShowAddModal(false);
      setEditingGrade(null);
      setNewGrade({
        studentId: '',
        subject: '',
        title: '',
        score: '',
        maxScore: '20',
        coefficient: '1',
        comment: '',
        classId: '',
        type: 'interrogation'
      });
    } catch (error) {
      console.error("Error saving grade:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-indigo-600" />
            {t('grades')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {currentUser?.role === 'élève' ? 'Consultez vos résultats académiques' : 'Gérez les notes des élèves'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <Download size={18} />
            Exporter PDF
          </button>
          {currentUser?.role === 'enseignant' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus size={18} />
              Saisir des notes
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              +0.5
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Moyenne Générale</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {generalAverage.toFixed(2)}/20
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Award size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Meilleure Note</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {grades.length > 0 ? Math.max(...grades.map(g => (g.score / g.maxScore * 20))).toFixed(1) : '0'}/20
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <BookOpen size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Évaluations</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {grades.length}
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Progression</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Stable
          </h3>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher une évaluation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={20} />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Toutes les matières</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grades List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Élève</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classe</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matière</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Évaluation</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Note</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Coef.</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Moyenne Classe</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Chargement des notes...
                  </td>
                </tr>
              ) : filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucune note trouvée.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {grade.date?.toDate ? grade.date.toDate().toLocaleDateString(language) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                          {grade.studentName?.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{grade.studentName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {grade.classId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-medium">
                        {grade.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{grade.title}</div>
                      {grade.comment && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{grade.comment}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold ${grade.score / grade.maxScore >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {grade.score}/{grade.maxScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                      {grade.coefficient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                      12.5/20
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingGrade(grade)}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {(currentUser?.role === 'enseignant' || currentUser?.role === 'admin') && (
                          <>
                            <button 
                              onClick={() => handleEditGrade(grade)}
                              className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteGrade(grade.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Grade Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg">
                    {editingGrade ? <Edit2 size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      {editingGrade ? 'Modifier l\'Évaluation' : 'Nouvelle Évaluation'}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {editingGrade ? 'Mettre à jour les notes et détails' : 'Saisie des notes et calcul automatique'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingGrade(null);
                  }} 
                  className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form id="add-grade-form" onSubmit={handleAddGrade} className="p-4 sm:p-6 space-y-6">
                  {/* Section 1: Élève et Matière */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
                      <UserCircle size={14} />
                      Informations de base
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Élève</label>
                        <select
                          required
                          value={newGrade.studentId}
                          onChange={(e) => setNewGrade({...newGrade, studentId: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                        >
                          <option value="">Sélectionner un élève</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Matière</label>
                        <input
                          type="text"
                          required
                          value={newGrade.subject}
                          onChange={(e) => setNewGrade({...newGrade, subject: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="Ex: Mathématiques"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Classe</label>
                        <input
                          type="text"
                          required
                          value={newGrade.classId}
                          onChange={(e) => setNewGrade({...newGrade, classId: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="Ex: 6ème A"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Détails de l'évaluation */}
                  <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
                      <TrendingUp size={14} />
                      Résultats & Type
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Type d'évaluation</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewGrade({...newGrade, type: 'interrogation', coefficient: '1'})}
                            className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${newGrade.type === 'interrogation' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                          >
                            Interrogation
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewGrade({...newGrade, type: 'evaluation', coefficient: '2'})}
                            className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${newGrade.type === 'evaluation' ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                          >
                            Évaluation
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Help Section */}
                      <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        {newGrade.type === 'interrogation' ? (
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Section Interrogation</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Contrôle rapide servant à vérifier les bases. Coefficient par défaut: 1. Idéal pour les classes de 6ème à Terminale.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                              <Award size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Section Évaluation Période</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Devoir surveillé ou examen de fin de période. Coefficient par défaut: 2. Précisez la classe pour une meilleure visibilité.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Titre de l'évaluation</label>
                        <input
                          type="text"
                          required
                          value={newGrade.title}
                          onChange={(e) => setNewGrade({...newGrade, title: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="Ex: Contrôle n°1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Note ({newGrade.maxScore})</label>
                        <input
                          type="number"
                          step="0.25"
                          required
                          value={newGrade.score}
                          onChange={(e) => setNewGrade({...newGrade, score: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-indigo-100 dark:border-indigo-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xl font-black text-indigo-600 dark:text-indigo-400 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Note Max</label>
                        <input
                          type="number"
                          required
                          value={newGrade.maxScore}
                          onChange={(e) => setNewGrade({...newGrade, maxScore: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-1">Commentaire (optionnel)</label>
                    <textarea
                      rows={2}
                      value={newGrade.comment}
                      onChange={(e) => setNewGrade({...newGrade, comment: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-xs sm:text-sm"
                      placeholder="Éloge ou axes d'amélioration..."
                    />
                  </div>
                </form>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingGrade(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="add-grade-form"
                    disabled={isSaving}
                    className="flex-[2] px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Enregistrer</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* View Grade Modal */}
      <AnimatePresence>
        {viewingGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${viewingGrade.type === 'evaluation' ? 'bg-purple-600' : 'bg-indigo-600'} text-white`}>
                    <Eye size={20} />
                  </div>
                  <h2 className="text-xl font-bold dark:text-white">Détails de la note</h2>
                </div>
                <button onClick={() => setViewingGrade(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-sm text-gray-500 uppercase font-black">Score Final</span>
                  <span className={`text-2xl font-black ${viewingGrade.score / viewingGrade.maxScore >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                    {viewingGrade.score}/{viewingGrade.maxScore}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Élève</p>
                    <p className="font-bold dark:text-white">{viewingGrade.studentName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Matière</p>
                    <p className="font-bold dark:text-white">{viewingGrade.subject}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Type</p>
                    <p className="font-bold dark:text-white capitalize">{viewingGrade.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Coefficient</p>
                    <p className="font-bold dark:text-white">{viewingGrade.coefficient}</p>
                  </div>
                </div>
                {viewingGrade.comment && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Commentaire</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg italic">
                      "{viewingGrade.comment}"
                    </p>
                  </div>
                ) }
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setViewingGrade(null)} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-all">
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Grades;
