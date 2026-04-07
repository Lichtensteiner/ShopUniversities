import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, User } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Trophy, Shield, AlertTriangle, Plus, Edit2, Trash2, Star, Award, Flag, Medal, Save, RefreshCw } from 'lucide-react';

export interface House {
  id: string;
  nom_maison: string;
  logo: string;
  total_points: number;
  color: string;
  responsable_id?: string;
  description?: string;
}

export interface HousePointHistory {
  id: string;
  student_id: string;
  teacher_id: string;
  house_id: string;
  type: 'gain' | 'penalty';
  category: string;
  reason: string;
  points: number;
  icon: string;
  timestamp: string;
}

export default function Houses() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'classement' | 'attribuer' | 'historique' | 'affiche' | 'gestion'>('affiche');
  
  const [houses, setHouses] = useState<House[]>([]);
  const [history, setHistory] = useState<HousePointHistory[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeHouses = onSnapshot(collection(db, 'houses'), (snap) => {
      const housesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as House));
      housesData.sort((a, b) => b.total_points - a.total_points);
      setHouses(housesData);
    });

    const unsubscribeHistory = onSnapshot(query(collection(db, 'house_points_history')), (snap) => {
      const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HousePointHistory));
      historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(historyData);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'élève')), (snap) => {
      const usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setStudents(usersData);
    });

    const unsubscribeTeachers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'enseignant')), (snap) => {
      const teachersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setTeachers(teachersData);
      setLoading(false);
    });

    return () => {
      unsubscribeHouses();
      unsubscribeHistory();
      unsubscribeUsers();
      unsubscribeTeachers();
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Système des Maisons</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('classement')}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'classement' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Classement
          </button>
          {currentUser?.role !== 'élève' && (
            <button
              onClick={() => setActiveTab('attribuer')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'attribuer' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Attribuer des points
            </button>
          )}
          <button
            onClick={() => setActiveTab('historique')}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'historique' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Historique
          </button>
          <button
            onClick={() => setActiveTab('affiche')}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'affiche' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Affiche du Système
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('gestion')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'gestion' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Gestion des Maisons
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'classement' && <ClassementTab houses={houses} teachers={teachers} />}
          {activeTab === 'attribuer' && currentUser?.role !== 'élève' && <AttribuerTab houses={houses} students={students} />}
          {activeTab === 'historique' && <HistoriqueTab history={history} houses={houses} students={students} currentUser={currentUser} />}
          {activeTab === 'affiche' && <AfficheTab houses={houses} />}
          {activeTab === 'gestion' && currentUser?.role === 'admin' && <GestionTab houses={houses} teachers={teachers} />}
        </div>
      </div>
    </div>
  );
}

// --- TABS COMPONENTS ---

function ClassementTab({ houses, teachers }: { houses: House[], teachers: User[] }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Top 3 Houses */}
        {houses.slice(0, 3).map((house, index) => {
          const responsable = teachers.find(t => t.id === house.responsable_id);
          return (
          <div key={house.id} className={`relative bg-white rounded-2xl shadow-sm border-2 p-6 text-center transform transition-transform hover:scale-105 ${
            index === 0 ? 'border-yellow-400 order-2 md:order-2 md:-mt-4' : 
            index === 1 ? 'border-gray-300 order-1 md:order-1' : 
            'border-amber-600 order-3 md:order-3'
          }`}>
            <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl ${
              index === 0 ? 'bg-yellow-400' : 
              index === 1 ? 'bg-gray-400' : 
              'bg-amber-600'
            }`}>
              {index + 1}
            </div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl overflow-hidden" style={{ backgroundColor: `${house.color}20`, color: house.color }}>
              {house.logo.startsWith('http') ? (
                <img src={house.logo} alt={house.nom_maison} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                house.logo
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{house.nom_maison}</h3>
            {responsable && <p className="text-sm text-gray-500 mb-2 font-medium">{t('resp')} {responsable.nom} {responsable.prenom}</p>}
            {house.description && <p className="text-xs text-gray-500 mb-3 italic line-clamp-2">{house.description}</p>}
            <div className="text-3xl font-black" style={{ color: house.color }}>
              {house.total_points} <span className="text-sm font-normal text-gray-500">{t('pts')}</span>
            </div>
          </div>
        )})}
      </div>

      {/* Other Houses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('position')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('house')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('points')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {houses.map((house, index) => (
              <tr key={house.id} className={index < 3 ? 'bg-gray-50/50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xl overflow-hidden" style={{ backgroundColor: `${house.color}20`, color: house.color }}>
                      {house.logo.startsWith('http') ? (
                        <img src={house.logo} alt={house.nom_maison} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        house.logo
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{house.nom_maison}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold" style={{ color: house.color }}>
                  {house.total_points} {t('pts')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttribuerTab({ houses, students }: { houses: House[], students: User[] }) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [actionType, setActionType] = useState<'gain' | 'penalty'>('gain');
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [customReason, setCustomReason] = useState('');
  const [customPoints, setCustomPoints] = useState(1);
  const [loading, setLoading] = useState(false);

  const gainRules = [
    { category: t('school_uniform'), icon: '👕👟', rules: [{ reason: t('complete_clean_uniform'), points: 5, icon: '👕' }, { reason: t('clean_shoes'), points: 3, icon: '👟' }] },
    { category: t('discipline'), icon: '🎓🤫', rules: [{ reason: t('respect_teachers'), points: 5, icon: '🎓' }, { reason: t('silence_in_class'), points: 3, icon: '🤫' }] },
    { category: t('behavior'), icon: '🤝⭐', rules: [{ reason: t('help_classmate'), points: 5, icon: '🤝' }, { reason: t('respect_rules'), points: 3, icon: '⭐' }] },
    { category: t('participation'), icon: '⚽📚', rules: [{ reason: t('class_participation'), points: 3, icon: '📚' }, { reason: t('activities_sport_culture'), points: 5, icon: '⚽' }] },
  ];

  const penaltyRules = [
    { category: t('possible_penalties'), icon: '⚠️', rules: [{ reason: t('incorrect_uniform'), points: -3, icon: '👕❌' }, { reason: t('lateness'), points: -2, icon: '⏰' }, { reason: t('lack_of_respect'), points: -5, icon: '🚫' }] }
  ];

  const rules = actionType === 'gain' ? gainRules : penaltyRules;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !currentUser) return;

    const student = students.find(s => s.id === selectedStudent);
    if (!student || !student.house_id) {
      alert(t('student_no_house_alert'));
      return;
    }

    const house = houses.find(h => h.id === student.house_id);
    if (!house) return;

    const pointsToApply = selectedRule ? selectedRule.rule.points : (actionType === 'gain' ? Math.abs(customPoints) : -Math.abs(customPoints));
    const reasonToApply = selectedRule ? selectedRule.rule.reason : customReason;
    const categoryToApply = selectedRule ? selectedRule.category : 'Autre';
    const iconToApply = selectedRule ? selectedRule.rule.icon : (actionType === 'gain' ? '✨' : '⚠️');

    if (!reasonToApply) {
      alert(t('select_rule_reason_alert'));
      return;
    }

    setLoading(true);
    try {
      // 1. Add history record
      await addDoc(collection(db, 'house_points_history'), {
        student_id: student.id,
        teacher_id: currentUser.id,
        house_id: house.id,
        type: actionType,
        category: categoryToApply,
        reason: reasonToApply,
        points: pointsToApply,
        icon: iconToApply,
        timestamp: new Date().toISOString()
      });

      // 2. Update house total points
      await updateDoc(doc(db, 'houses', house.id), {
        total_points: (house.total_points || 0) + pointsToApply
      });

      // 3. Send notification to student
      await addDoc(collection(db, 'notifications'), {
        user_id: student.id,
        title: actionType === 'gain' ? t('house_points_won') : t('house_points_lost'),
        message: `${pointsToApply > 0 ? '+' : ''}${pointsToApply} ${t('points_for_house')} ${house.nom_maison} : ${reasonToApply}`,
        type: actionType === 'gain' ? 'success' : 'warning',
        timestamp: new Date().toISOString(),
        read: false
      });

      alert(t('points_assigned_success'));
      setSelectedStudent('');
      setSelectedRule(null);
      setCustomReason('');
      setCustomPoints(1);
    } catch (error) {
      console.error("Error adding points:", error);
      alert(t('error_assigning_points'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('student')}</label>
        <select
          required
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">{t('select_student')}</option>
          {students.map(student => {
            const house = houses.find(h => h.id === student.house_id);
            return (
              <option key={student.id} value={student.id}>
                {student.nom} {student.prenom} {house ? `(${house.nom_maison})` : t('no_house')}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_type')}</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => { setActionType('gain'); setSelectedRule(null); }}
            className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
              actionType === 'gain' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <Trophy size={20} />
            {t('reward_gain')}
          </button>
          <button
            type="button"
            onClick={() => { setActionType('penalty'); setSelectedRule(null); }}
            className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
              actionType === 'penalty' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50'
            }`}
          >
            <AlertTriangle size={20} />
            {t('sanction_penalty')}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('reason')}</label>
        <div className="space-y-4">
          {rules.map((category, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                <span>{category.icon}</span> {category.category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.rules.map((rule, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => { setSelectedRule({ category: category.category, rule }); setCustomReason(''); }}
                    className={`text-left px-4 py-3 rounded-lg border flex justify-between items-center transition-colors ${
                      selectedRule?.rule === rule 
                        ? (actionType === 'gain' ? 'border-emerald-500 bg-emerald-100' : 'border-red-500 bg-red-100') 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <span>{rule.icon}</span> {rule.reason}
                    </span>
                    <span className={`text-sm font-bold ${actionType === 'gain' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {rule.points > 0 ? '+' : ''}{rule.points}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">{t('other_custom')}</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('custom_reason')}
                  value={customReason}
                  onChange={(e) => { setCustomReason(e.target.value); setSelectedRule(null); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customPoints}
                  onChange={(e) => { setCustomPoints(parseInt(e.target.value) || 1); setSelectedRule(null); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !selectedStudent || (!selectedRule && !customReason)}
        className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        {loading ? t('saving') : t('save_points')}
      </button>
    </form>
  );
}

function HistoriqueTab({ history, houses, students, currentUser }: { history: HousePointHistory[], houses: House[], students: User[], currentUser: User | null }) {
  const { t } = useLanguage();
  // Filter history based on role
  const filteredHistory = currentUser?.role === 'élève' 
    ? history.filter(h => h.student_id === currentUser.id)
    : history;

  return (
    <div className="space-y-4">
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t('no_points_history')}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('house')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reason')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('points')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => {
                const student = students.find(s => s.id === record.student_id);
                const house = houses.find(h => h.id === record.house_id);
                const date = new Date(record.timestamp);
                
                return (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student ? `${student.nom} ${student.prenom}` : 'Élève inconnu'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {house ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${house.color}20`, color: house.color }}>
                          {house.logo.startsWith('http') ? (
                            <img src={house.logo} alt={house.nom_maison} className="w-4 h-4 object-cover rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{house.logo}</span>
                          )}
                          {house.nom_maison}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                          {record.icon && <span>{record.icon}</span>}
                          {record.reason}
                        </span>
                        {record.category && <span className="text-xs text-gray-500">{record.category}</span>}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${record.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {record.points > 0 ? '+' : ''}{record.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AfficheTab({ houses }: { houses: House[] }) {
  const sortedHouses = [...houses].sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 bg-gray-50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm">
      {/* HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-indigo-900 uppercase tracking-tight">
          Système des Maisons
        </h1>
        <p className="text-sm sm:text-lg font-medium text-indigo-600 uppercase tracking-widest">
          École Internationale du Centre Pédagogique
        </p>
      </div>

      {/* HOUSES ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {sortedHouses.map((house, index) => (
          <div key={house.id} className="bg-white rounded-2xl p-4 flex flex-col items-center text-center shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: house.color }}></div>
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
              #{index + 1}
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner" style={{ backgroundColor: `${house.color}20` }}>
              {house.logo.startsWith('http') ? (
                <img src={house.logo} alt={house.nom_maison} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : (
                house.logo
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{house.nom_maison}</h3>
            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{house.description || 'Maison de l\'école'}</p>
            <div className="mt-auto bg-gray-50 px-4 py-1 rounded-full border border-gray-200">
              <span className="font-black text-lg" style={{ color: house.color }}>{house.total_points}</span>
              <span className="text-xs text-gray-500 ml-1 font-medium uppercase">pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* ATTRIBUTION DES POINTS */}
          <div className="bg-blue-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md transform -rotate-3">
                <Trophy size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-blue-900 uppercase tracking-tight">Attribution des Points</h2>
            </div>
            
            <div className="space-y-5">
              <div className="bg-white/60 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-base sm:text-lg"><span>👕👟</span> Tenue Scolaire</h3>
                <ul className="space-y-2 text-blue-900 font-medium">
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>👕</span> Tenue complète et propre</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+5</span></li>
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>👟</span> Chaussures propres</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+3</span></li>
                </ul>
              </div>
              
              <div className="bg-white/60 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-base sm:text-lg"><span>🎓🤫</span> Discipline</h3>
                <ul className="space-y-2 text-blue-900 font-medium">
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>🎓</span> Respect des enseignants</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+5</span></li>
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>🤫</span> Silence en classe</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+3</span></li>
                </ul>
              </div>

              <div className="bg-white/60 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-base sm:text-lg"><span>🤝⭐</span> Comportement</h3>
                <ul className="space-y-2 text-blue-900 font-medium">
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>🤝</span> Aide à un camarade</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+5</span></li>
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>⭐</span> Respect des règles</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+3</span></li>
                </ul>
              </div>

              <div className="bg-white/60 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-base sm:text-lg"><span>⚽📚</span> Participation</h3>
                <ul className="space-y-2 text-blue-900 font-medium">
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>📚</span> Participation en classe</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+3</span></li>
                  <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-2 text-sm sm:text-base"><span>⚽</span> Activités (sport/culture)</span> <span className="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg text-sm self-end sm:self-auto">+5</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* RECOMPENSES */}
          <div className="bg-emerald-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-emerald-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md transform rotate-3">
                <Medal size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-900 uppercase tracking-tight">Récompenses</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-emerald-100">
                <div className="text-2xl mb-1">🏁</div>
                <div className="font-bold text-emerald-900 text-sm">Hebdo</div>
                <div className="text-xs text-emerald-700">Drapeau hissé</div>
              </div>
              <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-emerald-100">
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-bold text-emerald-900 text-sm">Mensuel</div>
                <div className="text-xs text-emerald-700">Trophée du mois</div>
              </div>
              <div className="bg-white p-3 rounded-2xl text-center shadow-sm border border-emerald-100">
                <div className="text-2xl mb-1">👑</div>
                <div className="font-bold text-emerald-900 text-sm">Annuel</div>
                <div className="text-xs text-emerald-700">Coupe de l'école</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* PENALITES */}
          <div className="bg-red-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-red-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md transform rotate-3">
                <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-red-900 uppercase tracking-tight">Pénalités Possibles</h2>
            </div>
            
            <div className="bg-white/60 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <ul className="space-y-3 text-red-900 font-medium">
                <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-3 text-sm sm:text-base"><span>👕❌</span> Tenue incorrecte</span> <span className="font-black text-red-600 bg-red-100 px-3 py-1 rounded-lg text-sm self-end sm:self-auto">-3</span></li>
                <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-3 text-sm sm:text-base"><span>⏰</span> Retard</span> <span className="font-black text-red-600 bg-red-100 px-3 py-1 rounded-lg text-sm self-end sm:self-auto">-2</span></li>
                <li className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm gap-2"><span className="flex items-center gap-3 text-sm sm:text-base"><span>🚫</span> Manque de respect</span> <span className="font-black text-red-600 bg-red-100 px-3 py-1 rounded-lg text-sm self-end sm:self-auto">-5</span></li>
              </ul>
            </div>
          </div>

          {/* REGLEMENT */}
          <div className="bg-orange-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-orange-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md transform -rotate-3">
                <Shield size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-orange-900 uppercase tracking-tight">Règlement</h2>
            </div>
            <ul className="space-y-3 text-orange-900 font-medium">
              <li className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm sm:text-base">Chaque élève appartient à une maison pour toute l'année scolaire.</span>
              </li>
              <li className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm sm:text-base">Les points sont cumulatifs pour la maison.</span>
              </li>
              <li className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm">
                <span className="text-orange-500 mt-0.5">•</span>
                <span className="text-sm sm:text-base">Seuls les enseignants et la direction peuvent attribuer ou retirer des points.</span>
              </li>
            </ul>
          </div>

          {/* BANNER */}
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center shadow-md transform hover:scale-105 transition-transform duration-300">
            <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wide drop-shadow-md">
              La maison qui a le plus de points gagne la Coupe de l'école !
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

function GestionTab({ houses, teachers }: { houses: House[], teachers: User[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState({ nom_maison: '', logo: '', color: '#4F46E5', total_points: 0, responsable_id: '', description: '', animal_nom: '', valeurs: '' });
  const [loading, setLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState<string | null>(null);

  const predefinedHouses = [
    { id: 'elephant', logo: '🐘', nom_maison: 'Maison Éléphant', animal_nom: 'Éléphant d\'Afrique', valeurs: 'Sagesse & Responsabilité', color: '#3B82F6' },
    { id: 'mandrill', logo: '🐒', nom_maison: 'Maison Mandrill', animal_nom: 'Mandrill', valeurs: 'Courage & Énergie', color: '#EF4444' },
    { id: 'grisou', logo: '🦜', nom_maison: 'Maison Grisou', animal_nom: 'Perroquet gris', valeurs: 'Créativité & Communication', color: '#10B981' },
    { id: 'lope', logo: '🦍', nom_maison: 'Maison Lopé', animal_nom: 'Gorille', valeurs: 'Leadership & Solidarité', color: '#F59E0B' },
  ];

  const handleSelectPredefined = (house: typeof predefinedHouses[0]) => {
    setFormData({
      ...formData,
      logo: house.logo,
      nom_maison: house.nom_maison,
      animal_nom: house.animal_nom,
      valeurs: house.valeurs,
      color: house.color,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (!dataToSave.responsable_id) {
        delete (dataToSave as any).responsable_id;
      }
      if (editingHouse) {
        await updateDoc(doc(db, 'houses', editingHouse.id), dataToSave);
      } else {
        await addDoc(collection(db, 'houses'), dataToSave);
      }
      setShowModal(false);
      setEditingHouse(null);
      setFormData({ nom_maison: '', logo: '', color: '#4F46E5', total_points: 0, responsable_id: '', description: '', animal_nom: '', valeurs: '' });
    } catch (error) {
      console.error("Error saving house:", error);
      alert("Erreur lors de l'enregistrement de la maison.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setHouseToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!houseToDelete) return;
    try {
      await deleteDoc(doc(db, 'houses', houseToDelete));
      setShowDeleteModal(false);
      setHouseToDelete(null);
    } catch (error) {
      console.error("Error deleting house:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditingHouse(null); setFormData({ nom_maison: '', logo: '', color: '#4F46E5', total_points: 0, responsable_id: '', description: '', animal_nom: '', valeurs: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Ajouter une maison
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {houses.map(house => {
          const responsable = teachers.find(t => t.id === house.responsable_id);
          return (
          <div key={house.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center relative group">
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingHouse(house); setFormData({ ...house, responsable_id: house.responsable_id || '', description: house.description || '', animal_nom: (house as any).animal_nom || '', valeurs: (house as any).valeurs || '' }); setShowModal(true); }} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-gray-100 rounded-lg">
                <Edit2 size={16} />
              </button>
              <button onClick={() => confirmDelete(house.id)} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-100 rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 overflow-hidden" style={{ backgroundColor: `${house.color}20`, color: house.color }}>
              {house.logo.startsWith('http') ? (
                <img src={house.logo} alt={house.nom_maison} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                house.logo
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{house.nom_maison}</h3>
            {responsable && <p className="text-xs font-medium text-gray-600 mb-1">Resp: {responsable.nom} {responsable.prenom}</p>}
            <p className="text-xs text-gray-500 mb-3">Couleur: <span className="inline-block w-3 h-3 rounded-full ml-1 align-middle" style={{ backgroundColor: house.color }}></span></p>
            {house.description && <p className="text-xs text-gray-500 mb-4 italic line-clamp-2">{house.description}</p>}
            <div className="mt-auto pt-4 border-t w-full">
              <span className="text-2xl font-bold" style={{ color: house.color }}>{house.total_points}</span>
              <span className="text-sm text-gray-500 ml-1">points</span>
            </div>
          </div>
        )})}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingHouse ? 'Modifier la maison' : 'Nouvelle maison'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT COLUMN: SÉLECTION D'ICÔNES */}
                <div className="w-full md:w-5/12">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-full">
                    <h4 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">1. Choisir une icône</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {predefinedHouses.map((ph) => (
                        <button
                          key={ph.id}
                          type="button"
                          onClick={() => handleSelectPredefined(ph)}
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                            formData.logo === ph.logo 
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm transform scale-[1.02]' 
                              : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <span className="text-4xl mb-2">{ph.logo}</span>
                          <span className="font-bold text-gray-900 text-xs text-center">{ph.nom_maison}</span>
                          <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">{ph.valeurs}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: FORM FIELDS */}
                <div className="w-full md:w-7/12 space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">2. Informations de la maison</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nom de la maison</label>
                      <input
                        type="text"
                        required
                        value={formData.nom_maison}
                        onChange={(e) => setFormData({...formData, nom_maison: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Animal</label>
                      <input
                        type="text"
                        value={formData.animal_nom}
                        onChange={(e) => setFormData({...formData, animal_nom: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valeurs</label>
                    <input
                      type="text"
                      value={formData.valeurs}
                      onChange={(e) => setFormData({...formData, valeurs: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                      readOnly
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Couleur</label>
                      <input
                        type="color"
                        required
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-full h-[38px] px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Points initiaux</label>
                      <input
                        type="number"
                        required
                        value={formData.total_points}
                        onChange={(e) => setFormData({...formData, total_points: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                      <select
                        value={formData.responsable_id}
                        onChange={(e) => setFormData({...formData, responsable_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Aucun</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.nom} {teacher.prenom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (Optionnelle)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Description de la maison..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.logo}
                  className="px-5 py-2 text-sm bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md text-center shadow-xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-500 mb-6">
              Êtes-vous sûr de vouloir supprimer cette maison ? Cette action est irréversible.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setHouseToDelete(null);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
