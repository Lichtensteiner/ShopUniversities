import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, RefreshCw, AlertTriangle, ShieldCheck, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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
    if (!isFirebaseConfigured || !currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribeAttendance: () => void;

    const fetchInitialDataAndSubscribe = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Fetch all users (only once, as they change less frequently)
        const usersSnap = await getDocs(collection(db, 'users'));
        let totalUsers = 0;
        const usersMap = new Map();
        const classCountMap = new Map();
        
        // User distribution stats
        let teacherCount = 0;
        let studentCount = 0;
        let staffCount = 0;
        const studentLevelsMap = new Map();
        
        usersSnap.forEach(doc => {
          const data = doc.data();
          totalUsers++;
          usersMap.set(doc.id, data);
          
          const role = data.role?.toLowerCase() || '';
          if (role === 'enseignant') {
            teacherCount++;
          } else if (role === 'élève' || role === 'eleve') {
            studentCount++;
            // Group students by level (e.g., "6ème A" -> "6ème")
            const className = data.classe || 'Non classé';
            const level = className.split(' ')[0];
            studentLevelsMap.set(level, (studentLevelsMap.get(level) || 0) + 1);
          } else if (role === 'admin' || role === 'personnel') {
            staffCount++;
          }
          
          const className = data.classe || 'Personnel';
          classCountMap.set(className, (classCountMap.get(className) || 0) + 1);
        });

        setUserDistribution([
          { name: 'Enseignants', value: teacherCount, color: '#8b5cf6' },
          { name: 'Élèves', value: studentCount, color: '#3b82f6' },
          { name: 'Personnel', value: staffCount, color: '#ef4444' }
        ]);

        setStudentLevelData(
          Array.from(studentLevelsMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        // 2. Setup date range for the current week
        const currentWeekDays: string[] = [];
        const todayObj = new Date();
        const currentDay = todayObj.getDay();
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(todayObj);
        monday.setDate(todayObj.getDate() + distanceToMonday);
        
        for (let i = 0; i < 5; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          currentWeekDays.push(d.toISOString().split('T')[0]);
        }

        const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

        // 3. Subscribe to real-time attendance data for the current week
        const attQueryWeek = query(collection(db, 'attendance'), where('date', '>=', currentWeekDays[0]));
        
        unsubscribeAttendance = onSnapshot(attQueryWeek, (snapshot) => {
          let presentsToday = 0;
          let retardsToday = 0;
          
          const weeklyStatsMap = new Map();
          currentWeekDays.forEach((date, index) => {
            weeklyStatsMap.set(date, { name: dayNames[index], presents: 0, retards: 0, absents: totalUsers });
          });

          const studentRetardsMap = new Map();
          const classPresenceMap = new Map();

          snapshot.forEach(doc => {
            const data = doc.data();
            if (usersMap.has(data.user_id)) {
              
              // Stats for today
              if (data.date === today) {
                if (data.statut === 'Présent') presentsToday++;
                if (data.statut === 'Retard') retardsToday++;
                
                // Class presence for today
                if (data.statut === 'Présent' || data.statut === 'Retard') {
                  const user = usersMap.get(data.user_id);
                  const className = user.classe || 'Personnel';
                  classPresenceMap.set(className, (classPresenceMap.get(className) || 0) + 1);
                }
              }

              // Weekly chart data
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

              // Discipline logic (Retards count for the week)
              if (data.statut === 'Retard') {
                studentRetardsMap.set(data.user_id, (studentRetardsMap.get(data.user_id) || 0) + 1);
              }
            }
          });

          const absentsToday = totalUsers - (presentsToday + retardsToday);
          setStats({ 
            presents: presentsToday, 
            retards: retardsToday, 
            absents: absentsToday > 0 ? absentsToday : 0, 
            total: totalUsers 
          });

          setWeeklyData(Array.from(weeklyStatsMap.values()));

          // Generate alerts
          const newAlerts: any[] = [];
          studentRetardsMap.forEach((count, userId) => {
            if (count >= 3) {
              const user = usersMap.get(userId);
              if (user) {
                const userName = user.prenom || user.nom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : user.email?.split('@')[0] || 'Utilisateur';
                newAlerts.push({
                  id: userId,
                  name: userName,
                  count,
                  message: `L'élève ${userName} a accumulé ${count} retards cette semaine.`
                });
              }
            }
          });
          setAlerts(newAlerts);

          // Calculate distribution by class (percentage of total students)
          const classChartData: any[] = [];
          const totalStudents = studentCount || 1; // Avoid division by zero
          
          classCountMap.forEach((countInClass, className) => {
            // Only include classes (not personnel) in this specific chart
            if (className !== 'Personnel') {
              const percentage = Math.round((countInClass / totalStudents) * 100);
              classChartData.push({ name: className, value: countInClass, percentage });
            }
          });

          setClassData(classChartData.sort((a, b) => b.value - a.value).slice(0, 6)); // Top 6 classes
          setLoading(false);
        }, (error) => {
          console.error("Erreur lors de la récupération en temps réel des statistiques:", error);
          setLoading(false);
        });

      } catch (err) {
        console.error("Erreur d'initialisation des statistiques:", err);
        setLoading(false);
      }
    };

    fetchInitialDataAndSubscribe();

    return () => {
      if (unsubscribeAttendance) {
        unsubscribeAttendance();
      }
    };
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('dashboard')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('overview_attendance_today')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <UserX size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('absents')}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.absents}</h3>
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
