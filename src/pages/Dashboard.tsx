import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, RefreshCw, AlertTriangle, ShieldCheck, GraduationCap, Heart, Activity, Sparkles, Award, Castle } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { collection, getDocs, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import LiveClock from '../components/LiveClock';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import NewUserAnnouncement from '../components/NewUserAnnouncement';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { t, tData } = useLanguage();
  const [stats, setStats] = useState({ presents: 0, retards: 0, absents: 0, total: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [studentLevelData, setStudentLevelData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Listen to users and attendance simultaneously for live stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (userSnapshot) => {
      const usersMap = new Map();
      let expectedTotal = 0;
      
      const teacherCount = userSnapshot.docs.filter(d => d.data().role === 'enseignant').length;
      const studentCount = userSnapshot.docs.filter(d => d.data().role === 'élève' || d.data().role === 'eleve').length;
      const staffCount = userSnapshot.docs.filter(d => d.data().role === 'admin' || d.data().role === 'personnel').length;
      const parentCount = userSnapshot.docs.filter(d => d.data().role === 'parent').length;

      userSnapshot.forEach(doc => {
        const data = doc.data();
        usersMap.set(doc.id, data);
        // We only expect attendance for Students, Teachers, and Staff
        const role = data.role?.toLowerCase();
        if (role === 'enseignant' || role === 'élève' || role === 'eleve' || role === 'personnel' || role === 'admin') {
          expectedTotal++;
        }
      });

      setUserDistribution([
        { name: 'Enseignants', value: teacherCount, color: '#8b5cf6' },
        { name: 'Élèves', value: studentCount, color: '#3b82f6' },
        { name: 'Personnel', value: staffCount, color: '#ef4444' },
        { name: 'Parents', value: parentCount, color: '#f59e0b' }
      ]);

      // Calculate level distribution for students
      const studentLevelsMap = new Map();
      userSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'élève' || data.role === 'eleve') {
          const level = (data.classe || 'Non classé').split(' ')[0];
          studentLevelsMap.set(level, (studentLevelsMap.get(level) || 0) + 1);
        }
      });
      setStudentLevelData(
        Array.from(studentLevelsMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      // Listen to today's attendance
      const qAtt = query(collection(db, 'attendance'), where('date', '==', today));
      const unsubAtt = onSnapshot(qAtt, (attSnapshot) => {
        let presentsToday = 0;
        let retardsToday = 0;
        
        attSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (usersMap.has(data.user_id)) {
            if (data.statut === 'Présent') presentsToday++;
            if (data.statut === 'Retard') retardsToday++;
          }
        });

        const absentsToday = Math.max(0, expectedTotal - (presentsToday + retardsToday));
        
        setStats({ 
          presents: presentsToday, 
          retards: retardsToday, 
          absents: absentsToday, 
          total: expectedTotal 
        });
      });

      // Listen to current week's attendance for charts and alerts
      const monday = new Date();
      monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
      monday.setHours(0, 0, 0, 0);
      
      const currentWeekDays: string[] = [];
      const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        currentWeekDays.push(d.toISOString().split('T')[0]);
      }

      const qAttWeek = query(collection(db, 'attendance'), where('date', '>=', currentWeekDays[0]));
      const unsubAttWeek = onSnapshot(qAttWeek, (snapshot) => {
        const weeklyStatsMap = new Map();
        currentWeekDays.forEach((date, index) => {
          weeklyStatsMap.set(date, { name: dayNames[index], presents: 0, retards: 0, absents: expectedTotal });
        });

        const studentRetardsMap = new Map();
        const classPresenceMap = new Map();

        snapshot.forEach(doc => {
          const data = doc.data();
          if (usersMap.has(data.user_id)) {
            if (weeklyStatsMap.has(data.date)) {
              const dayStat = weeklyStatsMap.get(data.date);
              if (data.statut === 'Présent') {
                dayStat.presents++;
                dayStat.absents--;
              } else if (data.statut === 'Retard') {
                dayStat.retards++;
                dayStat.absents--;
              }
            }

            if (data.statut === 'Retard') {
              studentRetardsMap.set(data.user_id, (studentRetardsMap.get(data.user_id) || 0) + 1);
            }

            if (data.date === today && (data.statut === 'Présent' || data.statut === 'Retard')) {
              const user = usersMap.get(data.user_id);
              const className = user.classe || 'Personnel';
              classPresenceMap.set(className, (classPresenceMap.get(className) || 0) + 1);
            }
          }
        });

        setWeeklyData(Array.from(weeklyStatsMap.values()));

        // Generate alerts (3+ retards)
        const newAlerts: any[] = [];
        studentRetardsMap.forEach((count, userId) => {
          if (count >= 3) {
            const user = usersMap.get(userId);
            if (user) {
              const userName = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur';
              newAlerts.push({
                id: userId,
                message: `L'élève ${userName} a accumulé ${count} retards cette semaine.`
              });
            }
          }
        });
        setAlerts(newAlerts);

        // Class distribution
        const classChartData: any[] = [];
        const studentOnlyCount = userSnapshot.docs.filter(d => d.data().role === 'élève' || d.data().role === 'eleve').length || 1;
        
        const classCountByTotal = new Map();
        userSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.role === 'élève' || data.role === 'eleve') {
            const className = data.classe || 'Sans classe';
            classCountByTotal.set(className, (classCountByTotal.get(className) || 0) + 1);
          }
        });

        classCountByTotal.forEach((count, className) => {
          const percentage = Math.round((count / studentOnlyCount) * 100);
          classChartData.push({ name: className, value: count, percentage });
        });

        setClassData(classChartData.sort((a, b) => b.value - a.value).slice(0, 6));
        setLoading(false);
      });

      return () => {
        unsubAtt();
        unsubAttWeek();
      };
    });

    return () => unsubUsers();
  }, [currentUser]);

  const [ecoStats, setEcoStats] = useState({ trees: 0, water: 0, paper: 0 });
  const [mood, setMood] = useState<string | null>(null);
  const [houses, setHouses] = useState<any[]>([]);

  const [recommendation, setRecommendation] = useState<any>(null);

  // Real-time wellbeing and competition data
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) return;

    // 1. Fetch User's Daily Mood
    const today = new Date().toISOString().split('T')[0];
    const wellbeingQuery = query(
      collection(db, 'wellbeing_logs'),
      where('userId', '==', currentUser.id),
      where('date', '==', today)
    );

    const unsubscribeWellbeing = onSnapshot(wellbeingQuery, (snapshot) => {
      if (!snapshot.empty) {
        setMood(snapshot.docs[0].data().mood);
      }
    });

    // 2. Fetch Global Eco-Impact
    const unsubscribeEco = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userCount = snapshot.size;
      const paperPerUser = 250;
      const totalPaper = userCount * paperPerUser;
      const treesSaved = (totalPaper / 8333).toFixed(1);
      setEcoStats({
        trees: parseFloat(treesSaved),
        paper: totalPaper,
        water: totalPaper * 10
      });
    });

    // 3. Fetch Houses Competition
    const unsubscribeHouses = onSnapshot(collection(db, 'houses'), (snapshot) => {
      const housesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)).sort((a, b) => (b.points || 0) - (a.points || 0));
      setHouses(housesData);
    });
    
    // 4. AI Recommendation
    const qRec = query(
      collection(db, 'recommendations'),
      where('target', 'in', ['all', currentUser.id, currentUser.role, currentUser.classe || '']),
      limit(1)
    );
    const unsubscribeRec = onSnapshot(qRec, (snapshot) => {
      if (!snapshot.empty) {
        setRecommendation(snapshot.docs[0].data());
      }
    });

    return () => {
      unsubscribeWellbeing();
      unsubscribeEco();
      unsubscribeHouses();
      unsubscribeRec();
    };
  }, [currentUser]);

  const handleMoodSelect = async (selectedMood: string) => {
    if (!currentUser) return;
    setMood(selectedMood);
    
    // Save to Firestore
    try {
      const today = new Date().toISOString().split('T')[0];
      const wellbeingRef = collection(db, 'wellbeing_logs');
      const q = query(wellbeingRef, where('userId', '==', currentUser.id), where('date', '==', today));
      const snapshot = await getDocs(q);

      const { addDoc, updateDoc, doc } = await import('firebase/firestore');

      if (snapshot.empty) {
        await addDoc(wellbeingRef, {
          userId: currentUser.id,
          date: today,
          mood: selectedMood,
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'wellbeing_logs', snapshot.docs[0].id), {
          mood: selectedMood,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving mood:", error);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('dashboard')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('overview_attendance_today')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm self-start sm:self-auto">
          <LiveClock showDate={true} showTime={false} />
        </div>
      </div>

      {/* Modern Insight Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wellbeing Widget - Unique Feature */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Activity size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Bien-être</span>
            </div>
            <h3 className="text-lg font-black mb-1">Comment vas-tu ?</h3>
            <p className="text-xs opacity-80 mb-4">Ton humeur aide à améliorer l'école.</p>
            <div className="flex justify-between gap-2">
              {['😊', '😐', '😔', '😡'].map(m => (
                <button 
                  key={m} 
                  onClick={() => handleMoodSelect(m)}
                  className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 ${mood === m ? 'bg-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 rotate-12 group-hover:scale-125 transition-transform" />
        </div>

        {/* Eco-Impact Widget - Unique Feature */}
        <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Impact Éco</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{ecoStats.trees} <span className="text-xs font-medium text-gray-400">Arbres</span></p>
                <p className="text-[10px] text-gray-500 uppercase font-black">Sauvés par le digital</p>
              </div>
              <Castle size={40} className="text-emerald-100 dark:text-emerald-900/20" />
            </div>
            <div className="h-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* AI Insight Widget */}
        <div className="bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/30 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">IA Recommandation</span>
          </div>
          <div className="space-y-4">
            {recommendation ? (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <GraduationCap size={16} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800 dark:text-gray-200">{recommendation.subject || 'Sujet'}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{recommendation.text || recommendation.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Analyse en cours...</p>
              </div>
            )}
          </div>
        </div>

        {/* House Points Widget */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-800 rounded-xl">
              <Award size={20} className="text-yellow-400" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compétition</span>
          </div>
          <div className="space-y-2">
            {houses.length > 0 ? (
              houses.slice(0, 3).map((house, idx) => (
                <div key={house.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 w-4">{idx + 1}.</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full`} style={{ backgroundColor: house.color || '#666' }}>
                      {house.name}
                    </span>
                  </div>
                  <span className="font-black text-xs">{(house.points || 0).toLocaleString()} pts</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 opacity-50">
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Aucune donnée</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <NewUserAnnouncement />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-800 font-bold">
                <AlertTriangle size={20} />
                <h3>{t('discipline_alerts_current_week')}</h3>
              </div>
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-white p-3 rounded-xl border border-red-100 flex items-center justify-between shadow-sm">
                    <span className="text-gray-800 font-medium">{alert.message}</span>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-lg">{t('action_required')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Effectif Attendu</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('presents')}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.presents}</h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('lates')}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.retards}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <UserX size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('absents')}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.absents}</h3>
              </div>
            </div>
          </div>

          {/* User Statistics Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-gray-900">{t('user_statistics') || 'Statistiques des Utilisateurs'}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Teachers Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-violet-500">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Enseignants</p>
                  <h3 className="text-2xl font-bold text-gray-900">{userDistribution.find(d => d.name === 'Enseignants')?.value || 0}</h3>
                </div>
              </div>

              {/* Students Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Élèves</p>
                  <h3 className="text-2xl font-bold text-gray-900">{userDistribution.find(d => d.name === 'Élèves')?.value || 0}</h3>
                </div>
              </div>

              {/* Staff Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Personnel Administratif</p>
                  <h3 className="text-2xl font-bold text-gray-900">{userDistribution.find(d => d.name === 'Personnel')?.value || 0}</h3>
                </div>
              </div>

              {/* Parents Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-400">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Parents</p>
                  <h3 className="text-2xl font-bold text-gray-900">{userDistribution.find(d => d.name === 'Parents')?.value || 0}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Distribution Chart */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition Globale (%)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [value, 'Utilisateurs']}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Students by Level Chart */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Élèves par Niveau</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentLevelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" name="Nombre d'élèves" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('weekly_evolution')}</h3>
                <TrendingUp size={20} className="text-gray-400" />
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="99%" height={320}>
                  <BarChart data={weeklyData.map(d => ({ ...d, name: tData(d.name) }))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="presents" name={t('presents')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="retards" name={t('lates')} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="absents" name={t('absents')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition par classe (%)</h3>
              {classData.length > 0 ? (
                <>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="99%" height={256}>
                      <PieChart>
                        <Pie
                          data={classData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {classData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value, name, props) => [`${props.payload.percentage}%`, `Part de l'école`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-3">
                    {classData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  {t('no_data_available')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
