import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, RefreshCw, Trash2, Edit2, X, Check } from 'lucide-react';
import { collection, getDocs, onSnapshot, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Attendance() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ statut: '', heure_arrivee: '', heure_depart: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribeAttendance: () => void;

    const fetchInitialDataAndSubscribe = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersMap = new Map();
        usersSnap.forEach(doc => {
          const data = doc.data();
          // Si enseignant, on ne garde que les élèves de sa classe
          if (currentUser.role === 'enseignant' && data.classe !== currentUser.classe) {
            return;
          }
          usersMap.set(doc.id, { id: doc.id, ...data });
        });

        unsubscribeAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
          const attData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                user: usersMap.get(data.user_id)
              } as any;
            })
            .filter((record: any) => record.user); // Ne garder que les présences des utilisateurs autorisés
          
          // Sort by timestamp descending
          attData.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          
          setAttendance(attData);
          setLoading(false);
        }, (error) => {
          console.error("Erreur lors de la récupération en temps réel des présences:", error);
          setLoading(false);
        });

      } catch (err) {
        console.error("Erreur d'initialisation des présences:", err);
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

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'attendance', id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (record: any) => {
    setEditingId(record.id);
    setEditForm({
      statut: record.statut || 'Présent',
      heure_arrivee: record.heure_arrivee || '',
      heure_depart: record.heure_depart || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'attendance', id), {
        statut: editForm.statut,
        heure_arrivee: editForm.heure_arrivee,
        heure_depart: editForm.heure_depart
      });

      // Mettre à jour le rapport correspondant si existant
      const record = attendance.find(r => r.id === id);
      if (record && record.user_id) {
        const dateObj = new Date(record.date);
        const dayOfWeek = dateObj.getDay();
        const diffToMonday = dateObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(dateObj.setDate(diffToMonday));
        monday.setHours(0, 0, 0, 0);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        
        const weekString = `Semaine du ${monday.toLocaleDateString('fr-FR')} au ${friday.toLocaleDateString('fr-FR')}`;
        
        const reportQuery = query(collection(db, 'reports'), 
          where('user_id', '==', record.user_id), 
          where('semaine', '==', weekString)
        );
        const reportSnap = await getDocs(reportQuery);
        
        if (!reportSnap.empty) {
          const reportDoc = reportSnap.docs[0];
          const reportData = reportDoc.data();
          
          const newTableau = reportData.tableau_presence.map((t: any) => {
            if (t.date === record.date) {
              return {
                ...t,
                heure_arrivee: editForm.heure_arrivee || '-',
                heure_depart: editForm.heure_depart || '-',
                statut: editForm.statut
              };
            }
            return t;
          });
          
          let presence = 0;
          let retards = 0;
          let absences = 0;
          newTableau.forEach((t: any) => {
            if (t.statut === 'Présent') presence++;
            if (t.statut === 'Retard') retards++;
            if (t.statut === 'Absent') absences++;
          });

          let analyse = t('perfect_attendance');
          if (absences > 0) analyse = `Attention, ${absences} absence(s) enregistrée(s) cette semaine.`;
          else if (retards > 0) analyse = `Présence régulière mais ${retards} retard(s) à corriger.`;

          await updateDoc(doc(db, 'reports', reportDoc.id), {
            tableau_presence: newTableau,
            resume: { jours_presence: presence, retards, absences },
            analyse
          });
        }
      }

      setEditingId(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Présent': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Retard': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = record.user?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          record.user?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.user?.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Tous' || record.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('attendance_register')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('view_biometric_history')}</p>
        </div>
        <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
          <Download size={18} />
          {t('export_csv')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('search_by_name')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
              >
                <option value="Tous">{t('all_statuses')}</option>
                <option value="Présent">{t('present')}</option>
                <option value="Retard">{t('late')}</option>
                <option value="Absent">{t('absent')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">{t('date')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('user')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('role')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('arrival')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('departure')}</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">{t('status')}</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
                    <p className="text-gray-500">{t('loading_attendance')}</p>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {t('no_records_found')} {!isFirebaseConfigured && t('please_configure_firebase')}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  editingId === record.id ? (
                    <tr key={record.id} className="bg-indigo-50/30 border-b border-indigo-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{record.user?.nom} {record.user?.prenom}</div>
                        <div className="text-xs text-gray-500">{record.user?.classe || record.user?.matricule || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 capitalize">{record.user?.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="time" 
                          value={editForm.heure_arrivee}
                          onChange={(e) => setEditForm({...editForm, heure_arrivee: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="time" 
                          value={editForm.heure_depart}
                          onChange={(e) => setEditForm({...editForm, heure_depart: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select 
                          value={editForm.statut}
                          onChange={(e) => setEditForm({...editForm, statut: e.target.value})}
                          className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="Présent">{t('present')}</option>
                          <option value="Retard">{t('late')}</option>
                          <option value="Absent">{t('absent')}</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveEdit(record.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" disabled={actionLoading === record.id}>
                            {actionLoading === record.id ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" disabled={actionLoading === record.id}>
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={record.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{record.user?.nom} {record.user?.prenom}</div>
                        <div className="text-xs text-gray-500">{record.user?.classe || record.user?.matricule || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 capitalize">{record.user?.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        {record.heure_arrivee ? (
                          <span className="font-mono text-gray-700">{record.heure_arrivee}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.heure_depart ? (
                          <span className="font-mono text-gray-700">{record.heure_depart}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.statut)}`}>
                          {record.statut === 'Présent' ? t('present') : record.statut === 'Retard' ? t('late') : record.statut === 'Absent' ? t('absent') : record.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {confirmDeleteId === record.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600 font-medium mr-1">{t('delete_question')}</span>
                            <button onClick={() => handleDelete(record.id)} className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors" disabled={actionLoading === record.id} title={t('confirm')}>
                              {actionLoading === record.id ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" disabled={actionLoading === record.id} title={t('cancel')}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(record)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t('edit')}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setConfirmDeleteId(record.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" disabled={actionLoading === record.id} title={t('delete')}>
                              {actionLoading === record.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
