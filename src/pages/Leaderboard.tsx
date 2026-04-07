import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, TrendingUp, RefreshCw } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [studentRanking, setStudentRanking] = useState<any[]>([]);
  const [classRanking, setClassRanking] = useState<any[]>([]);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const attSnap = await getDocs(collection(db, 'attendance'));

        const usersMap = new Map();
        const classesMap = new Map();

        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.role === 'élève') {
            usersMap.set(doc.id, { ...data, id: doc.id, presents: 0, retards: 0, absents: 0, total: 0 });
            if (data.classe) {
              if (!classesMap.has(data.classe)) {
                classesMap.set(data.classe, { name: data.classe, presents: 0, retards: 0, absents: 0, total: 0 });
              }
            }
          }
        });

        attSnap.forEach(doc => {
          const data = doc.data();
          const user = usersMap.get(data.user_id);
          if (user) {
            user.total++;
            if (data.statut === 'Présent') user.presents++;
            if (data.statut === 'Retard') user.retards++;
            
            const classData = classesMap.get(user.classe);
            if (classData) {
              classData.total++;
              if (data.statut === 'Présent') classData.presents++;
              if (data.statut === 'Retard') classData.retards++;
            }
          }
        });

        // Calculate scores
        // Score formula: (Presents * 10) + (Retards * 5) - (Absents * 10)
        // For simplicity here, we just use presence rate
        const calculateScore = (item: any) => {
          if (item.total === 0) return 0;
          return Math.round(((item.presents + (item.retards * 0.5)) / item.total) * 100);
        };

        const students = Array.from(usersMap.values())
          .filter(u => u.total > 0)
          .map(u => ({ ...u, score: calculateScore(u) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        const classes = Array.from(classesMap.values())
          .filter(c => c.total > 0)
          .map(c => ({ ...c, score: calculateScore(c) }))
          .sort((a, b) => b.score - a.score);

        setStudentRanking(students);
        setClassRanking(classes);
      } catch (err) {
        console.error("Erreur lors du calcul du classement:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Classement de Ponctualité</h1>
        <p className="text-sm text-gray-500 mt-1">Les élèves et les classes les plus disciplinés</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Classes Ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              Top Classes
            </h2>
          </div>
          <div className="p-0">
            {classRanking.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {classRanking.map((cls, index) => (
                  <div key={cls.name} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{cls.name}</h3>
                      <p className="text-xs text-gray-500">{cls.total} pointages</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-indigo-600">{cls.score}%</div>
                      <p className="text-xs text-gray-500">Ponctualité</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">Aucune donnée disponible</div>
            )}
          </div>
        </div>

        {/* Students Ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Medal className="text-emerald-500" size={20} />
              Top Élèves
            </h2>
          </div>
          <div className="p-0">
            {studentRanking.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {studentRanking.map((student, index) => (
                  <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
                      {student.prenom?.[0] || student.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {student.prenom || student.nom ? `${student.prenom || ''} ${student.nom || ''}`.trim() : student.email?.split('@')[0] || 'Utilisateur'}
                      </h3>
                      <p className="text-xs text-gray-500">{student.classe}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600">{student.score}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">Aucune donnée disponible</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
