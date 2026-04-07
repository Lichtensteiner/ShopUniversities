import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { Clock, User, Mail, Shield, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import UserActivityModal from '../components/UserActivityModal';

interface ConnectionLog {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  timestamp: string;
}

export default function RecentConnections() {
  const { t, tData } = useLanguage();
  const [connections, setConnections] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'connections'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ConnectionLog));
      setConnections(logs);
      setLoading(false);
    }, (error) => {
      console.error("Erreur lors de la récupération des connexions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'enseignant': return 'bg-blue-100 text-blue-700';
      case 'élève': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('recent_connections')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('recent_connections_desc')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : connections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('no_connections')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">{t('user')}</th>
                  <th className="px-6 py-4">{t('contact')}</th>
                  <th className="px-6 py-4">{t('role')}</th>
                  <th className="px-6 py-4">{t('datetime')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {connections.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedUserId(log.user_id)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                          {log.prenom?.[0] || log.email?.[0] || 'U'}
                        </div>
                        <span className="font-medium text-gray-900">
                          {log.prenom || log.nom ? `${log.prenom || ''} ${log.nom || ''}`.trim() : log.email?.split('@')[0] || 'Utilisateur'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} />
                        {log.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(log.role)}`}>
                        {tData(log.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                        <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUserId && (
        <UserActivityModal 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </div>
  );
}
