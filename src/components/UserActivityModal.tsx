import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, User, Mail, Shield, X, Calendar, Hash, BookOpen, Activity, LogIn, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConnectionLog {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  timestamp: string;
}

interface UserDetails {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  matricule?: string;
  classe?: string;
  date_creation?: string;
}

interface AttendanceLog {
  id: string;
  date: string;
  heure_arrivee: string;
  heure_depart?: string;
  statut: string;
  timestamp: string;
}

export default function UserActivityModal({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { t, tData } = useLanguage();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [connections, setConnections] = useState<ConnectionLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as UserDetails);
        }

        // Fetch recent connections
        let connData: ConnectionLog[] = [];
        try {
          const connQ = query(
            collection(db, 'connections'),
            where('user_id', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
          const connSnap = await getDocs(connQ);
          connData = connSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConnectionLog));
        } catch (e: any) {
          if (e.message?.includes('requires an index')) {
            console.warn("Index manquant pour les connexions. Récupération sans tri côté serveur.");
            const connQ = query(
              collection(db, 'connections'),
              where('user_id', '==', userId),
              limit(50)
            );
            const connSnap = await getDocs(connQ);
            connData = connSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConnectionLog));
            connData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            connData = connData.slice(0, 10);
          } else {
            throw e;
          }
        }
        setConnections(connData);

        // Fetch recent attendance
        let attData: AttendanceLog[] = [];
        try {
          const attQ = query(
            collection(db, 'attendance'),
            where('user_id', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
          const attSnap = await getDocs(attQ);
          attData = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog));
        } catch (e: any) {
          if (e.message?.includes('requires an index')) {
            console.warn("Index manquant pour les présences. Récupération sans tri côté serveur.");
            const attQ = query(
              collection(db, 'attendance'),
              where('user_id', '==', userId),
              limit(50)
            );
            const attSnap = await getDocs(attQ);
            attData = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog));
            attData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            attData = attData.slice(0, 10);
          } else {
            throw e;
          }
        }
        setAttendance(attData);

      } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl uppercase">
              {user.prenom?.[0] || user.email?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.prenom || user.nom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : user.email?.split('@')[0] || 'Utilisateur'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Mail size={14} />
                {user.email}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Informations de base */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-indigo-500" />
              Informations du profil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Shield size={14} />
                  Rôle
                </div>
                <div className="font-medium text-gray-900 capitalize">{tData(user.role)}</div>
              </div>
              {user.matricule && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Hash size={14} />
                    Matricule
                  </div>
                  <div className="font-medium text-gray-900">{user.matricule}</div>
                </div>
              )}
              {user.classe && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <BookOpen size={14} />
                    Classe
                  </div>
                  <div className="font-medium text-gray-900">{user.classe}</div>
                </div>
              )}
              {user.date_creation && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar size={14} />
                    Inscrit le
                  </div>
                  <div className="font-medium text-gray-900">
                    {new Date(user.date_creation).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Activités récentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Historique des connexions */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LogIn size={16} className="text-emerald-500" />
                Dernières connexions
              </h3>
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aucune connexion récente</p>
                ) : (
                  connections.map(conn => (
                    <div key={conn.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                      <div className="mt-0.5 bg-emerald-100 text-emerald-600 p-1.5 rounded-full">
                        <Activity size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Connexion réussie</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {new Date(conn.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Historique des présences */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-500" />
                Dernières présences
              </h3>
              <div className="space-y-3">
                {attendance.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aucune présence enregistrée</p>
                ) : (
                  attendance.map(att => (
                    <div key={att.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                      <div className={`mt-0.5 p-1.5 rounded-full ${
                        att.statut === 'Présent' ? 'bg-emerald-100 text-emerald-600' :
                        att.statut === 'Retard' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {att.statut === 'Absent' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {att.date}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            att.statut === 'Présent' ? 'bg-emerald-50 text-emerald-700' :
                            att.statut === 'Retard' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {att.statut}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          Arrivée: {att.heure_arrivee} {att.heure_depart ? `| Départ: ${att.heure_depart}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
