import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LogOut, Clock, CheckCircle2, AlertCircle, RefreshCw, Bell, X, Info, Castle, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  title?: string;
  message: string;
  read?: boolean;
  timestamp: string;
  type?: 'info' | 'warning' | 'success';
}

export default function StudentDashboard() {
  const { currentUser, logout } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotificationState, setSelectedNotificationState] = useState<Notification | null>(null);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.modal === 'notification') {
        // We shouldn't really enter this state from a pop, but just in case
      } else {
        setSelectedNotificationState(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectedNotification = selectedNotificationState;
  const setSelectedNotification = (notif: Notification | null) => {
    setSelectedNotificationState(notif);
    if (notif) {
      window.history.pushState({ modal: 'notification' }, '');
    } else {
      // If we are closing it programmatically (not via back button), we should ideally go back
      // But to keep it simple and avoid messing up history if they click "Close":
      if (window.history.state?.modal === 'notification') {
        window.history.back();
      }
    }
  };

  const [house, setHouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const attQuery = query(collection(db, 'attendance'), where('user_id', '==', currentUser.id));
        const attSnap = await getDocs(attQuery);
        const attData = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        attData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAttendance(attData);

        if (currentUser.house_id) {
          const houseDoc = await getDoc(doc(db, 'houses', currentUser.house_id));
          if (houseDoc.exists()) {
            setHouse({ id: houseDoc.id, ...houseDoc.data() });
          }
        }
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (!currentUser) return;
    const notifQuery = query(collection(db, 'notifications'), where('user_id', '==', currentUser.id));
    const unsubscribeNotifs = onSnapshot(notifQuery, (snap) => {
      const notifData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(notifData);
    });

    return () => unsubscribeNotifs();
  }, [currentUser]);

  const handleNotificationClick = async (notif: Notification) => {
    setSelectedNotification(notif);
    if (!notif.read) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la notification:", error);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setSelectedNotification(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {currentUser?.photo ? (
              <img src={currentUser.photo} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-bold uppercase">
                {currentUser?.prenom?.[0] || currentUser?.email?.[0] || 'U'}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentUser?.prenom || currentUser?.nom ? `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim() : currentUser?.email?.split('@')[0] || 'Utilisateur'}
              </h1>
              <p className="text-gray-500 capitalize">{currentUser?.role} {currentUser?.classe && `- Classe: ${currentUser.classe}`}</p>
              {house && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border" style={{ backgroundColor: `${house.color}15`, color: house.color, borderColor: `${house.color}30` }}>
                  {house.logo.startsWith('http') ? (
                    <img src={house.logo} alt={house.nom_maison} className="w-4 h-4 object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{house.logo}</span>
                  )}
                  {house.nom_maison} ({house.total_points} pts)
                </div>
              )}
            </div>
          </div>
          <button onClick={logout} className="p-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Déconnexion">
            <LogOut size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Mon historique de présence</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <RefreshCw className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : attendance.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                  <AlertCircle size={32} className="text-gray-300" />
                  <p>Aucun pointage enregistré pour le moment.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attendance.map(record => (
                    <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          record.statut === 'Présent' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 capitalize">
                            {new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock size={14} />
                            <span>Arrivée : <span className="font-mono font-medium text-gray-700">{record.heure_arrivee}</span></span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                        record.statut === 'Présent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {record.statut}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell size={20} className="text-indigo-600" />
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="animate-spin text-indigo-600" size={24} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                  <Bell size={24} className="text-gray-300" />
                  <p className="text-sm">Aucune notification.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${notif.read ? 'bg-white' : 'bg-indigo-50/30'}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.read ? 'bg-transparent' : 'bg-indigo-500'}`}></div>
                        <div className="flex-1">
                          {notif.title && <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{notif.title}</p>}
                          <p className={`text-sm line-clamp-2 ${notif.read ? 'text-gray-500' : 'text-gray-800'}`}>{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up sm:animate-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedNotification.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  selectedNotification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {selectedNotification.type === 'warning' ? <AlertTriangle size={20} /> :
                   selectedNotification.type === 'success' ? <CheckCircle size={20} /> :
                   <Info size={20} />}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedNotification.title || 'Notification'}
                </h3>
              </div>
              <button onClick={() => setSelectedNotification(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{selectedNotification.message}</p>
              <p className="text-sm text-gray-400 mt-6 flex items-center gap-1.5">
                <Clock size={14} />
                {new Date(selectedNotification.timestamp).toLocaleString(undefined, {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={() => deleteNotification(selectedNotification.id)}
                className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
