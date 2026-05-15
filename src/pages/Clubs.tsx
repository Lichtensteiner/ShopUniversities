import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Search, 
  Settings, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Info,
  Layers,
  Award,
  X,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Club {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  category: string;
  members: string[];
  createdAt: any;
}

const Clubs: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discovery' | 'management'>('discovery');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClubForEdit, setSelectedClubForEdit] = useState<Club | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  // New club form
  const [newClub, setNewClub] = useState({
    name: '',
    description: '',
    leaderId: '',
    category: 'Culturel'
  });
  const [editClubForm, setEditClubForm] = useState({
    name: '',
    description: '',
    leaderId: '',
    category: 'Culturel'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClubForMembers, setSelectedClubForMembers] = useState<Club | null>(null);
  const [membersDetails, setMembersDetails] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Search users to add to club
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchText.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearchingUsers(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['élève', 'enseignant', 'eleve'])
        );
        const snap = await getDocs(q);
        const results = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => 
            (u.prenom?.toLowerCase().includes(userSearchText.toLowerCase()) || 
             u.nom?.toLowerCase().includes(userSearchText.toLowerCase()) ||
             u.email?.toLowerCase().includes(userSearchText.toLowerCase())) &&
            !selectedClubForMembers?.members.includes(u.id)
          );
        setSearchResults(results.slice(0, 5));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [userSearchText, selectedClubForMembers]);

  // Fetch members details when a club is selected
  useEffect(() => {
    const fetchMembersDetails = async () => {
      if (!selectedClubForMembers || !selectedClubForMembers.members || selectedClubForMembers.members.length === 0) {
        setMembersDetails([]);
        return;
      }

      setLoadingMembers(true);
      try {
        const membersData: any[] = [];
        // Firestore doesn't support 'in' queries with more than 30 elements easily
        const memberIds = selectedClubForMembers.members.slice(0, 30);
        const q = query(collection(db, 'users'), where('__name__', 'in', memberIds));
        const snap = await getDocs(q);
        snap.forEach(doc => membersData.push({ id: doc.id, ...doc.data() }));
        setMembersDetails(membersData);
      } catch (error) {
        console.error("Error fetching members details:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembersDetails();
  }, [selectedClubForMembers]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Club[];
      setClubs(clubsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTeachers = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'enseignant'));
      const snap = await getDocs(q);
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    if (currentUser?.role === 'admin') {
      fetchTeachers();
    }
  }, [currentUser]);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsSaving(true);
    try {
      const leader = teachers.find(t => t.id === newClub.leaderId);
      await addDoc(collection(db, 'clubs'), {
        ...newClub,
        leaderId: newClub.leaderId,
        leaderName: leader ? `${leader.prenom} ${leader.nom}` : 'Inconnu',
        members: [],
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewClub({ name: '', description: '', leaderId: '', category: 'Culturel' });
    } catch (error) {
      console.error("Error creating club:", error);
      alert("Erreur lors de la création du club");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (club: Club) => {
    setSelectedClubForEdit(club);
    setEditClubForm({
      name: club.name,
      description: club.description,
      leaderId: club.leaderId,
      category: club.category
    });
  };

  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubForEdit || currentUser?.role !== 'admin') return;

    setIsSaving(true);
    try {
      const leader = teachers.find(t => t.id === editClubForm.leaderId);
      const clubRef = doc(db, 'clubs', selectedClubForEdit.id);
      await updateDoc(clubRef, {
        ...editClubForm,
        leaderName: leader ? `${leader.prenom} ${leader.nom}` : 'Inconnu',
      });
      setSelectedClubForEdit(null);
    } catch (error) {
      console.error("Error updating club:", error);
      alert("Erreur lors de la mise à jour du club");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce club ?")) return;
    try {
      await deleteDoc(doc(db, 'clubs', id));
    } catch (error) {
      console.error("Error deleting club:", error);
    }
  };

  const handleJoinLeaveClub = async (club: Club) => {
    if (!currentUser) return;
    
    // Teachers cannot join by themselves, only admin can add them
    if (currentUser.role === 'enseignant') {
      alert("En tant qu'enseignant, vous devez être ajouté manuellement par un administrateur.");
      return;
    }

    const isMember = club.members?.includes(currentUser.id);
    const clubRef = doc(db, 'clubs', club.id);
    
    try {
      if (isMember) {
        await updateDoc(clubRef, {
          members: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(clubRef, {
          members: arrayUnion(currentUser.id)
        });
      }
    } catch (error) {
      console.error("Error joining/leaving club:", error);
    }
  };

  const handleAddMemberToClub = async (userId: string) => {
    if (!selectedClubForMembers || currentUser?.role !== 'admin') return;

    try {
      const clubRef = doc(db, 'clubs', selectedClubForMembers.id);
      await updateDoc(clubRef, {
        members: arrayUnion(userId)
      });
      
      // Update local state for immediate feedback
      const updatedMembers = [...(selectedClubForMembers.members || []), userId];
      setSelectedClubForMembers({
        ...selectedClubForMembers,
        members: updatedMembers
      });
      setUserSearchText('');
      setSearchResults([]);
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Erreur lors de l'ajout du membre");
    }
  };

  const handleRemoveMemberFromClub = async (userId: string) => {
    if (!selectedClubForMembers || currentUser?.role !== 'admin') return;
    if (!window.confirm("Retirer ce membre du club ?")) return;

    try {
      const clubRef = doc(db, 'clubs', selectedClubForMembers.id);
      await updateDoc(clubRef, {
        members: arrayRemove(userId)
      });
      
      // Update local state
      const updatedMembers = selectedClubForMembers.members.filter(id => id !== userId);
      setSelectedClubForMembers({
        ...selectedClubForMembers,
        members: updatedMembers
      });
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="text-indigo-600" />
            Clubs Scolaires
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Découvrez et rejoignez les activités périscolaires.</p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Plus size={20} />
            Créer un Club
          </button>
        )}
      </div>

      {/* Stats/Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Clubs</p>
              <p className="text-2xl font-bold dark:text-white">{clubs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Membres Actifs</p>
              <p className="text-2xl font-bold dark:text-white">
                {clubs.reduce((acc, c) => acc + (c.members?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mes Engagements</p>
              <p className="text-2xl font-bold dark:text-white">
                {clubs.filter(c => c.members?.includes(currentUser?.id || '') || c.leaderId === currentUser?.id).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher un club..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      {/* View Toggle for Management */}
      <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('discovery')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'discovery' 
              ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Découverte
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'management' 
              ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Tableau de Bord
        </button>
      </div>

      {/* Clubs View */}
      {activeTab === 'discovery' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode='popLayout'>
            {filteredClubs.map((club) => {
              const isMember = club.members?.includes(currentUser?.id || '');
              const isLeader = club.leaderId === currentUser?.id;

              return (
                <motion.div
                  key={club.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-md transition-all"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-full uppercase tracking-wider">
                        {club.category}
                      </span>
                      {currentUser?.role === 'admin' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick(club)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClub(club.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        {club.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {club.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 py-3 border-y border-gray-50 dark:border-gray-700/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                        {club.leaderName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Responsable</p>
                        <p className="text-sm font-medium dark:text-gray-200">{club.leaderName}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setSelectedClubForMembers(club)}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors group/members"
                      >
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover/members:bg-indigo-50 dark:group-hover/members:bg-indigo-900/30 transition-colors">
                          <Users size={18} className="group-hover/members:text-indigo-600" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Membres</span>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover/members:text-indigo-600">{club.members?.length || 0} inscrits</span>
                        </div>
                      </button>

                      <div className="flex gap-2">
                        {isLeader ? (
                          <span className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Settings size={16} />
                            Gérant
                          </span>
                        ) : (currentUser?.role === 'enseignant') ? (
                          <span className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-400 rounded-xl text-xs font-medium italic">
                            Ajout via admin
                          </span>
                        ) : (
                          <button
                            onClick={() => handleJoinLeaveClub(club)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                              isMember 
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 shadow-sm' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none'
                            }`}
                          >
                            {isMember ? <UserMinus size={18} /> : <UserPlus size={18} />}
                            {isMember ? 'Quitter' : 'Rejoindre'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Management Table View */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-5">Nom du Club</th>
                  <th className="px-6 py-5">Catégorie</th>
                  <th className="px-6 py-5">Responsable</th>
                  <th className="px-6 py-5">Inscriptions</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredClubs.map((club) => (
                  <tr key={club.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {club.name[0].toUpperCase()}
                        </div>
                        <span className="font-bold dark:text-white capitalize">{club.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {club.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold dark:text-gray-200">{club.leaderName}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Enseignant Référent</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-500">
                              U
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                          {club.members?.length || 0} inscrits
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedClubForMembers(club)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                        >
                          <Users size={16} />
                          Voir
                        </button>
                        {currentUser?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => handleEditClick(club)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                              title="Modifier"
                            >
                              <Settings size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClub(club.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Club Modal */}
      {selectedClubForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Modifier le Club</h2>
              <button onClick={() => setSelectedClubForEdit(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateClub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du Club</label>
                <input
                  type="text"
                  required
                  value={editClubForm.name}
                  onChange={(e) => setEditClubForm({...editClubForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  value={editClubForm.category}
                  onChange={(e) => setEditClubForm({...editClubForm, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Culturel">Culturel</option>
                  <option value="Sportif">Sportif</option>
                  <option value="Scientifique">Scientifique</option>
                  <option value="Artistique">Artistique</option>
                  <option value="Citoyen">Citoyen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enseignant Responsable</label>
                <select
                  required
                  value={editClubForm.leaderId}
                  onChange={(e) => setEditClubForm({...editClubForm, leaderId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Sélectionner un enseignant</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={editClubForm.description}
                  onChange={(e) => setEditClubForm({...editClubForm, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedClubForEdit(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Mise à jour...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Créer un Nouveau Club</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du Club</label>
                <input
                  type="text"
                  required
                  value={newClub.name}
                  onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Club de Robotique"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
                <select
                  value={newClub.category}
                  onChange={(e) => setNewClub({...newClub, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Culturel">Culturel</option>
                  <option value="Sportif">Sportif</option>
                  <option value="Scientifique">Scientifique</option>
                  <option value="Artistique">Artistique</option>
                  <option value="Citoyen">Citoyen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enseignant Responsable</label>
                <select
                  required
                  value={newClub.leaderId}
                  onChange={(e) => setNewClub({...newClub, leaderId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Sélectionner un enseignant</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  required
                  value={newClub.description}
                  onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  placeholder="De quoi s'agit-il ?"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Création...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* View Members Modal */}
      {selectedClubForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-indigo-600">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Membres du Club</h2>
                  <p className="text-indigo-100 text-sm">{selectedClubForMembers.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.role === 'admin' && (
                  <div className="relative mr-4">
                    <div className="flex items-center bg-white/10 rounded-xl px-3 py-1.5 border border-white/20">
                      <Search size={16} className="text-white/60 mr-2" />
                      <input
                        type="text"
                        placeholder="Ajouter un membre..."
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        className="bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40 w-48"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-[60] overflow-hidden">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => handleAddMemberToClub(user.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                              {user.prenom?.[0]}{user.nom?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold dark:text-white truncate">{user.prenom} {user.nom}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
                            </div>
                            <Plus size={14} className="text-indigo-600" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button 
                  onClick={() => setSelectedClubForMembers(null)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  <p className="text-gray-500 font-medium">Chargement des membres...</p>
                </div>
              ) : membersDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        <th className="px-6 py-3">Élève</th>
                        <th className="px-6 py-3">Classe / Niveau</th>
                        <th className="px-6 py-3">Rôle</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {membersDetails.map((member) => (
                        <tr key={member.id} className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors group">
                          <td className="px-6 py-4 rounded-l-2xl">
                            <div className="flex items-center gap-3">
                              {member.photoURL ? (
                                <img src={member.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-gray-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {member.prenom?.[0]}{member.nom?.[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white capitalize leading-none">{member.prenom} {member.nom}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-tighter">Matricule: {member.id.substring(0, 8).toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400">
                              {member.classe || member.grade || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              member.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {member.role === 'enseignant' ? 'Référent' : 'Membre'}
                            </span>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {currentUser?.role === 'admin' && (
                                <button 
                                  onClick={() => handleRemoveMemberFromClub(member.id)}
                                  className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all"
                                  title="Retirer du club"
                                >
                                  <UserMinus size={16} />
                                </button>
                              )}
                              <button className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all">
                                <FileText size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <Users size={40} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aucun membre pour le moment</h3>
                    <p className="text-gray-500">Encouragez les élèves à rejoindre ce club !</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm font-medium text-gray-500">
              <div className="flex gap-4">
                <span className="flex items-center gap-2"><CalendarIcon size={14} /> Réunion hebdomadaire</span>
                <span className="flex items-center gap-2"><Award size={14} /> Excellence Académique</span>
              </div>
              <button 
                onClick={() => setSelectedClubForMembers(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Clubs;
