import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, MessageCircle, GraduationCap, UserPlus, Search, ChevronRight, Mail, Trash2, X, MapPin, Phone, Briefcase, Ban } from 'lucide-react';
import { deleteDoc } from 'firebase/firestore';

interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  email: string;
  photo?: string;
  classe?: string;
  status?: 'online' | 'offline';
  contact?: string;
  address?: string;
  gender?: string;
  age?: number;
  matricule?: string;
  biographie?: string;
}

interface DirectoryProps {
  onNavigate?: (tab: string, params?: any) => void;
}

export default function Directory({ onNavigate }: DirectoryProps) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'staff' | 'students'>('staff');
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('enseignant');
  const [viewUser, setViewUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();

    // Set up real-time listener for all users to get status updates
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];

      const staffUsers = allUsers.filter(u => ['admin', 'enseignant', 'personnel administratif'].includes(u.role));
      const studentUsers = allUsers.filter(u => u.role === 'élève');
      
      setStaff(staffUsers);
      setStudents(studentUsers);
    });

    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];

      const staffUsers = allUsers.filter(u => ['admin', 'enseignant', 'personnel administratif'].includes(u.role));
      const studentUsers = allUsers.filter(u => u.role === 'élève');
      
      setStaff(staffUsers);
      setStudents(studentUsers);

      // Extract unique classes
      const uniqueClasses = Array.from(new Set(studentUsers.map(s => s.classe).filter(Boolean))) as string[];
      setClasses(uniqueClasses.sort());
      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = (userId: string) => {
    if (onNavigate) {
      onNavigate('messaging', { userId });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      alert("Utilisateur supprimé avec succès.");
      if (viewUser?.id === userId) {
        setViewUser(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      alert("Une erreur est survenue lors de la suppression.");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    try {
      await addDoc(collection(db, 'invitations'), {
        email: inviteEmail,
        role: inviteRole,
        invitedBy: currentUser?.id,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      alert(`Invitation envoyée à ${inviteEmail} en tant que ${inviteRole}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('enseignant');
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      alert("Une erreur est survenue lors de l'envoi de l'invitation.");
    }
  };

  const filteredStaff = staff.filter(user => 
    `${user.prenom} ${user.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(user => 
    user.classe === selectedClass &&
    (`${user.prenom} ${user.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Répertoire</h1>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'staff' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Personnel
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'students' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Élèves
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un nom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {activeTab === 'staff' ? (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center"
            >
              <UserPlus size={20} />
              <span>Inviter</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-1 sm:flex-none justify-center">
                <UserPlus size={20} />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
              <button className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors" title="Diplômes">
                <GraduationCap size={20} />
              </button>
            </div>
          )}
        </div>

        {activeTab === 'students' && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto whitespace-nowrap custom-scrollbar">
            <div className="flex gap-2">
              {classes.map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedClass === cls
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {cls}
                </button>
              ))}
              {classes.length === 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">Aucune classe trouvée</span>
              )}
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement...</div>
          ) : (
            (activeTab === 'staff' ? filteredStaff : filteredStudents).map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0 w-full">
                  <div className="relative shrink-0">
                    {user.photo ? (
                      <img src={user.photo} alt={user.nom} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg uppercase">
                        {user.prenom?.[0] || user.email?.[0] || 'U'}
                      </div>
                    )}
                    {user.status === 'online' && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {user.prenom || user.nom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : user.email?.split('@')[0] || 'Utilisateur'}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="capitalize shrink-0">{user.role}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1 min-w-0"><Mail size={14} className="shrink-0" /> <span className="truncate">{user.email}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end sm:justify-start w-full sm:w-auto mt-2 sm:mt-0">
                  <button 
                    onClick={() => setViewUser(user)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    title="Voir profil"
                  >
                    <User size={20} />
                  </button>
                  <button 
                    onClick={() => handleStartConversation(user.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    title="Lancer une conversation"
                  >
                    <MessageCircle size={20} />
                  </button>
                  {currentUser?.role === 'admin' && (
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer l'utilisateur"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          
          {!loading && (activeTab === 'staff' ? filteredStaff : filteredStudents).length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Aucun utilisateur trouvé.
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-600" />
                Inviter un membre du personnel
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                &times;
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@ecole.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rôle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="enseignant">Enseignant</option>
                    <option value="personnel administratif">Personnel administratif</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profil Utilisateur</h3>
              </div>
              <button onClick={() => setViewUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                {viewUser.photo ? (
                  <img src={viewUser.photo} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-gray-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl uppercase shadow-lg border-4 border-white dark:border-gray-800">
                    {viewUser.prenom?.[0]}{viewUser.nom?.[0]}
                  </div>
                )}
                <div className="text-center md:text-left">
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{viewUser.prenom} {viewUser.nom}</h4>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                      {viewUser.role}
                    </span>
                    {viewUser.classe && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-mono">
                        {viewUser.classe}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-3 flex items-center justify-center md:justify-start gap-2 text-sm">
                    <Mail size={14} />
                    {viewUser.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} />
                    Informations
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{viewUser.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                      <span className="text-gray-500">Rôle</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200 capitalize">{viewUser.role}</span>
                    </div>
                    {viewUser.contact && (
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                        <span className="text-gray-500">Contact</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">{viewUser.contact}</span>
                      </div>
                    )}
                    {viewUser.address && (
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                        <span className="text-gray-500">Adresse</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">{viewUser.address}</span>
                      </div>
                    )}
                    {viewUser.gender && (
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                        <span className="text-gray-500">Genre</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200 capitalize">{viewUser.gender}</span>
                      </div>
                    )}
                    {viewUser.age && (
                      <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-700/50">
                        <span className="text-gray-500">Âge</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">{viewUser.age} ans</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={14} />
                    Actions
                  </h5>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        handleStartConversation(viewUser.id);
                        setViewUser(null);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full"
                    >
                      <MessageCircle size={18} />
                      Lancer une conversation
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteUser(viewUser.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-full"
                      >
                        <Trash2 size={18} />
                        Supprimer l'utilisateur
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
