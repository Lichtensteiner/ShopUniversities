import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, MessageCircle, GraduationCap, UserPlus, Search, ChevronRight, Mail } from 'lucide-react';

interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  email: string;
  photo?: string;
  classe?: string;
  status?: 'online' | 'offline';
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
                    onClick={() => alert('Voir profil')}
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
    </div>
  );
}
