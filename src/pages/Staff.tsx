import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Users, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Scale,
  Briefcase,
  MapPin,
  Calendar,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface StaffUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  lastSeen?: any;
  photo?: string;
  department?: string;
  position?: string;
  contact?: string;
  address?: string;
  gender?: string;
  age?: number;
}

export default function Staff() {
  const { t, tData, language } = useLanguage();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  useEffect(() => {
    // Specifically query for 'personnel administratif'
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['personnel administratif', 'cuisinier'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffUser[];
      
      // Sort by name
      staffData.sort((a, b) => {
        const nameA = `${a.nom || ''} ${a.prenom || ''}`.trim().toLowerCase();
        const nameB = `${b.nom || ''} ${b.prenom || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStaff(staffData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching administrative staff:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStaff = staff.filter(member => {
    const fullName = `${member.prenom || ''} ${member.nom || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || member.email?.toLowerCase().includes(search);
  });

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel administratif ?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      console.error("Error deleting staff member:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Scale size={24} />
            </div>
            {t('admin_staff')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestion et annuaire des membres de l'administration
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                <th className="w-1/3 px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Membre</th>
                <th className="w-1/4 px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="w-1/4 px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Département</th>
                <th className="w-24 px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="w-32 px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Chargement du personnel...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Users size={40} className="text-gray-300" />
                      <p className="text-sm font-medium">Aucun membre du personnel administratif trouvé.</p>
                      <p className="text-xs text-gray-400">Assurez-vous que les utilisateurs ont le rôle "personnel administratif".</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photo ? (
                          <img src={member.photo} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase">
                            {member.prenom?.[0] || 'U'}{member.nom?.[0] || ''}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {member.prenom} {member.nom}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono truncate leading-none mt-1">ID: {member.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 min-w-0 text-xs">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {(member.phone || member.contact) && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 truncate">
                            <Phone size={12} className="shrink-0" />
                            <span className="truncate">{member.phone || member.contact}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium truncate">{member.position || 'Cadre Administratif'}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{member.department || 'Administration Centrale'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        member.status === 'online' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {member.status === 'online' ? 'En ligne' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedStaff(member)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          title="Voir détails"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Detail Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20"
            >
              <div className="relative h-40 bg-gradient-to-br from-indigo-500 to-purple-600">
                <button 
                  onClick={() => setSelectedStaff(null)}
                  className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all backdrop-blur-md"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <div className="px-8 pb-10">
                <div className="relative -mt-20 mb-8 flex justify-center">
                  <div className="relative">
                    {selectedStaff.photo ? (
                      <img 
                        src={selectedStaff.photo} 
                        alt="" 
                        className="w-40 h-40 rounded-[2rem] border-8 border-white dark:border-gray-800 object-cover shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-[2rem] border-8 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-5xl font-black shadow-2xl">
                        {selectedStaff.prenom?.[0] || 'U'}{selectedStaff.nom?.[0] || ''}
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border-4 border-white dark:border-gray-800 bg-green-500 shadow-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      {selectedStaff.prenom} {selectedStaff.nom}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                       <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-widest rounded-full">
                        {selectedStaff.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-100 dark:border-gray-600/50 transition-all hover:shadow-md">
                      <Briefcase className="text-indigo-500 mb-2" size={20} />
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Département</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedStaff.department || 'Administration Centrale'}</p>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-100 dark:border-gray-600/50 transition-all hover:shadow-md">
                      <Shield className="text-purple-500 mb-2" size={20} />
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Poste</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedStaff.position || 'Cadre Administratif'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                        <Mail size={18} className="text-indigo-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Email professionnel</p>
                        <p className="text-sm font-bold">{selectedStaff.email}</p>
                      </div>
                    </div>
                    {(selectedStaff.phone || selectedStaff.contact) && (
                      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                          <Phone size={18} className="text-green-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Téléphone</p>
                          <p className="text-sm font-bold">{selectedStaff.phone || selectedStaff.contact}</p>
                        </div>
                      </div>
                    )}
                    {selectedStaff.address && (
                      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                          <MapPin size={18} className="text-red-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Adresse</p>
                          <p className="text-sm font-bold truncate max-w-[250px]">{selectedStaff.address}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedStaff(null)}
                    className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[2rem] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-none"
                  >
                    Fermer la fiche
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
