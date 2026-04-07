import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Fingerprint, RefreshCw, Eye, EyeOff, Edit2, Trash2, X, AlertCircle, BellRing, Key, Phone, MapPin, User2, Calendar, GraduationCap, History as HistoryIcon } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, isFirebaseConfigured, firebaseConfig } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';

export default function Users() {
  const { t, tData } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('Tous');
  const [users, setUsers] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewUser, setViewUser] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });
  const [newUser, setNewUser] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'élève',
    classe: '',
    classes: [] as string[],
    matiere: '',
    matieres: [] as string[],
    matricule: '',
    contact: '',
    address: '',
    gender: 'not_specified' as 'male' | 'female' | 'other' | 'not_specified',
    diploma: '',
    experience_years: '',
    age: '',
    house_id: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
      setLoading(false);
    });

    const unsubscribeHouses = onSnapshot(collection(db, 'houses'), (snapshot) => {
      const housesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHouses(housesData);
    });

    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesData);
    });

    return () => {
      unsubscribe();
      unsubscribeHouses();
      unsubscribeClasses();
    };
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password: pass });
    setShowPassword(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.password || newUser.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    setActionLoading(true);
    setError('');
    try {
      // Initialize a secondary Firebase app to create the user without signing out the current admin
      const secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        role: newUser.role,
        classe: newUser.role === 'élève' ? newUser.classe : null,
        classes: newUser.role === 'enseignant' ? newUser.classes : null,
        matiere: newUser.role === 'enseignant' ? (newUser.matieres[0] || null) : null,
        matieres: newUser.role === 'enseignant' ? newUser.matieres : null,
        matricule: newUser.matricule || null,
        contact: newUser.contact || null,
        address: newUser.address || null,
        gender: newUser.gender || 'not_specified',
        diploma: newUser.diploma || null,
        experience_years: newUser.experience_years ? parseInt(newUser.experience_years as string) : null,
        age: newUser.age ? parseInt(newUser.age as string) : null,
        house_id: newUser.role === 'élève' && newUser.house_id ? newUser.house_id : null,
        date_creation: new Date().toISOString()
      }, { merge: true });
      
      // Sign out and clean up the secondary app
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      
      setShowAddUserModal(false);
      setNewUser({ nom: '', prenom: '', email: '', password: '', role: 'élève', classe: '', classes: [], matiere: '', matieres: [], matricule: '', contact: '', address: '', gender: 'not_specified', diploma: '', experience_years: '', age: '', house_id: '' });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else {
        setError("Erreur lors de l'ajout de l'utilisateur.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    
    setActionLoading(true);
    setError('');
    try {
      const userRef = doc(db, 'users', editUser.id);
      await updateDoc(userRef, {
        nom: editUser.nom,
        prenom: editUser.prenom,
        role: editUser.role,
        classe: editUser.role === 'élève' ? editUser.classe : null,
        classes: editUser.role === 'enseignant' ? (editUser.classes || []) : null,
        matiere: editUser.role === 'enseignant' ? (editUser.matieres?.[0] || null) : null,
        matieres: editUser.role === 'enseignant' ? (editUser.matieres || []) : null,
        matricule: editUser.matricule || null,
        contact: editUser.contact || null,
        address: editUser.address || null,
        gender: editUser.gender || 'not_specified',
        diploma: editUser.diploma || null,
        experience_years: editUser.experience_years ? parseInt(editUser.experience_years.toString()) : null,
        age: editUser.age ? parseInt(editUser.age.toString()) : null,
        house_id: editUser.role === 'élève' && editUser.house_id ? editUser.house_id : null
      });
      setEditUser(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la mise à jour de l'utilisateur.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    
    setActionLoading(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'users', deleteUser.id));
      setDeleteUser(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la suppression de l'utilisateur.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'Tous' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationData.title || !notificationData.message) return;
    
    setActionLoading(true);
    setError('');
    try {
      // Send to all filtered users
      const usersToNotify = filteredUsers;
      
      const promises = usersToNotify.map(user => 
        addDoc(collection(db, 'notifications'), {
          user_id: user.id,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          read: false,
          timestamp: new Date().toISOString()
        })
      );
      
      await Promise.all(promises);
      setShowNotificationModal(false);
      setNotificationData({ title: '', message: '', type: 'info' });
      alert(`Notification envoyée avec succès à ${usersToNotify.length} utilisateur(s).`);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de l'envoi de la notification.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('users')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('manage_users')}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowNotificationModal(true)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm flex-1 sm:flex-none"
          >
            <BellRing size={18} />
            <span className="whitespace-nowrap">{t('notify_selection')}</span>
          </button>
          <button 
            onClick={() => setShowAddUserModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm flex-1 sm:flex-none"
          >
            <Plus size={18} />
            <span className="whitespace-nowrap">{t('add_user')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
            >
              <option value="Tous">{t('all')}</option>
              <option value="élève">{tData('élève')}</option>
              <option value="enseignant">{tData('enseignant')}</option>
              <option value="personnel administratif">{tData('personnel administratif')}</option>
              <option value="admin">{tData('admin')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 min-w-[800px]">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">{t('name')} & {t('firstname')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('id_number')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('role')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('contact')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('address')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('gender')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('age')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('diploma')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('experience_years')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('subject')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('class')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('house')}</th>
                <th scope="col" className="px-6 py-4 font-semibold">{t('biometrics')}</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center">
                    <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
                    <p className="text-gray-500">{t('loading_users')}</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                    {t('no_users_found')} {!isFirebaseConfigured && t('configure_firebase')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.photo ? (
                          <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                            {user.prenom?.[0] || user.email?.[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.nom || user.prenom ? `${user.nom || ''} ${user.prenom || ''}`.trim() : user.email?.split('@')[0] || 'Utilisateur'}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {user.matricule || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        user.role === 'élève' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'enseignant' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {tData(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-gray-400" />
                        {user.contact || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate max-w-[120px]" title={user.address}>{user.address || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User2 size={14} className="text-gray-400" />
                        {user.gender ? t(user.gender) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {user.age || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-gray-400" />
                        <span className="truncate max-w-[100px]" title={user.diploma}>{user.diploma || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <HistoryIcon size={14} className="text-gray-400" />
                        {user.experience_years || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.role === 'enseignant' ? (user.matieres?.join(', ') || user.matiere || '-') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.classe || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {user.house_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${houses.find(h => h.id === user.house_id)?.color || '#6b7280'}20`, color: houses.find(h => h.id === user.house_id)?.color || '#6b7280' }}>
                          {houses.find(h => h.id === user.house_id)?.logo?.startsWith('http') ? (
                            <img src={houses.find(h => h.id === user.house_id)?.logo} alt="" className="w-4 h-4 object-cover rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{houses.find(h => h.id === user.house_id)?.logo}</span>
                          )}
                          {houses.find(h => h.id === user.house_id)?.nom_maison}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {user.face_id && user.fingerprint_id ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit text-xs font-medium">
                          <Fingerprint size={14} />
                          {t('registered')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full w-fit text-xs font-medium">
                          <AlertCircle size={14} />
                          {t('missing')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewUser(user)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={t('view_details')}
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => setEditUser({...user})}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteUser(user)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
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

      {/* View Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t('user_details')}</h3>
              <button onClick={() => setViewUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {viewUser.photo ? (
                  <img src={viewUser.photo} alt="" className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl uppercase">
                    {viewUser.prenom?.[0]}{viewUser.nom?.[0]}
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{viewUser.prenom} {viewUser.nom}</h4>
                  <p className="text-sm text-gray-500">{viewUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500 mb-1">{t('role')}</span>
                  <span className="font-medium text-gray-900 capitalize">{tData(viewUser.role)}</span>
                </div>
                {viewUser.role === 'enseignant' && (
                  <div>
                    <span className="block text-gray-500 mb-1">{t('subjects')}</span>
                    <span className="font-medium text-gray-900">{viewUser.matieres?.join(', ') || viewUser.matiere || '-'}</span>
                  </div>
                )}
                <div>
                  <span className="block text-gray-500 mb-1">{t('id_number')}</span>
                  <span className="font-mono text-gray-900">{viewUser.matricule || t('not_defined')}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('contact')}</span>
                  <span className="font-medium text-gray-900">{viewUser.contact || '-'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('address')}</span>
                  <span className="font-medium text-gray-900">{viewUser.address || '-'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('gender')}</span>
                  <span className="font-medium text-gray-900">{viewUser.gender ? t(viewUser.gender) : '-'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('age')}</span>
                  <span className="font-medium text-gray-900">{viewUser.age || '-'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('diploma')}</span>
                  <span className="font-medium text-gray-900">{viewUser.diploma || '-'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">{t('experience_years')}</span>
                  <span className="font-medium text-gray-900">{viewUser.experience_years || '-'}</span>
                </div>
                {viewUser.role === 'élève' && (
                  <>
                    <div>
                      <span className="block text-gray-500 mb-1">{t('class')}</span>
                      <span className="font-medium text-gray-900">{viewUser.classe || t('not_defined')}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">{t('house')}</span>
                      <span className="font-medium text-gray-900">
                        {viewUser.house_id && houses.find(h => h.id === viewUser.house_id) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${houses.find(h => h.id === viewUser.house_id)?.color}20`, color: houses.find(h => h.id === viewUser.house_id)?.color }}>
                            {houses.find(h => h.id === viewUser.house_id)?.logo?.startsWith('http') ? (
                              <img src={houses.find(h => h.id === viewUser.house_id)?.logo} alt="" className="w-4 h-4 object-cover rounded-full" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{houses.find(h => h.id === viewUser.house_id)?.logo}</span>
                            )}
                            {houses.find(h => h.id === viewUser.house_id)?.nom_maison}
                          </span>
                        ) : t('not_defined')}
                      </span>
                    </div>
                  </>
                )}
                {viewUser.role === 'enseignant' && (
                  <div className="col-span-2">
                    <span className="block text-gray-500 mb-1">Classes assignées</span>
                    <div className="flex flex-wrap gap-2">
                      {viewUser.classes && viewUser.classes.length > 0 ? (
                        viewUser.classes.map((c: string) => (
                          <span key={c} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-xs">Aucune classe assignée</span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <span className="block text-gray-500 mb-1">{t('registration_date')}</span>
                  <span className="font-medium text-gray-900">
                    {viewUser.date_creation ? new Date(viewUser.date_creation).toLocaleDateString() : t('unknown')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-gray-500 mb-1">{t('biometric_status')}</span>
                  {viewUser.face_id && viewUser.fingerprint_id ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <Fingerprint size={16} /> {t('registration_complete')}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle size={16} /> {t('registration_incomplete')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setViewUser(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t('edit_user')}</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                    <input
                      type="text"
                      required
                      value={editUser.nom}
                      onChange={(e) => setEditUser({...editUser, nom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstname')}</label>
                    <input
                      type="text"
                      required
                      value={editUser.prenom}
                      onChange={(e) => setEditUser({...editUser, prenom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('id_number')}</label>
                  <input
                    type="text"
                    value={editUser.matricule || ''}
                    onChange={(e) => setEditUser({...editUser, matricule: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact')}</label>
                    <input
                      type="text"
                      value={editUser.contact || ''}
                      onChange={(e) => setEditUser({...editUser, contact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
                    <input
                      type="text"
                      value={editUser.address || ''}
                      onChange={(e) => setEditUser({...editUser, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('gender')}</label>
                    <select
                      value={editUser.gender || 'not_specified'}
                      onChange={(e) => setEditUser({...editUser, gender: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                      <option value="not_specified">{t('not_specified')}</option>
                      <option value="male">{t('male')}</option>
                      <option value="female">{t('female')}</option>
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('age')}</label>
                    <input
                      type="number"
                      value={editUser.age || ''}
                      onChange={(e) => setEditUser({...editUser, age: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('diploma')}</label>
                    <input
                      type="text"
                      value={editUser.diploma || ''}
                      onChange={(e) => setEditUser({...editUser, diploma: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('experience_years')}</label>
                    <input
                      type="number"
                      value={editUser.experience_years || ''}
                      onChange={(e) => setEditUser({...editUser, experience_years: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                  >
                    <option value="élève">{tData('élève')}</option>
                    <option value="enseignant">{tData('enseignant')}</option>
                    <option value="personnel administratif">{tData('personnel administratif')}</option>
                    <option value="admin">{tData('admin')}</option>
                  </select>
                </div>

                {editUser.role === 'élève' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('class')}</label>
                      <select
                        required
                        value={editUser.classe || ''}
                        onChange={(e) => setEditUser({...editUser, classe: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="">Sélectionner une classe</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.nom}>{cls.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('house_optional')}</label>
                      <select
                        value={editUser.house_id || ''}
                        onChange={(e) => setEditUser({...editUser, house_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="">{t('no_house')}</option>
                        {houses.map(house => (
                          <option key={house.id} value={house.id}>{house.nom_maison}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {editUser.role === 'enseignant' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjects')} (séparés par des virgules)</label>
                      <input
                        type="text"
                        value={editUser.matieres?.join(', ') || editUser.matiere || ''}
                        onChange={(e) => setEditUser({...editUser, matieres: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})}
                        placeholder="Ex: Mathématiques, Français..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Classes assignées</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50">
                      {classes.map(cls => (
                        <label key={cls.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={(editUser.classes || []).includes(cls.nom)}
                            onChange={(e) => {
                              const currentClasses = editUser.classes || [];
                              if (e.target.checked) {
                                setEditUser({...editUser, classes: [...currentClasses, cls.nom]});
                              } else {
                                setEditUser({...editUser, classes: currentClasses.filter((c: string) => c !== cls.nom)});
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{cls.nom}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 italic">Cochez les classes où cet enseignant intervient.</p>
                  </div>
                </>
              )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center gap-2 disabled:bg-indigo-400"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('delete_user_confirm')}</h3>
              <p className="text-gray-500 text-sm">
                {t('delete_user_warning')} <strong>{deleteUser.prenom} {deleteUser.nom}</strong> ?
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center gap-3">
              <button 
                onClick={() => setDeleteUser(null)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium text-sm transition-colors flex items-center gap-2 disabled:bg-red-400"
              >
                {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{t('send_notification')}</h2>
              <button 
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl text-sm mb-4">
                {t('notification_target_info').replace('{count}', filteredUsers.length.toString())}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('title')}</label>
                <input 
                  type="text" 
                  required
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder={t('notification_title_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('message')}</label>
                <textarea 
                  required
                  rows={4}
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                  placeholder={t('notification_message_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('type')}</label>
                <select 
                  value={notificationData.type}
                  onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="info">{t('info')}</option>
                  <option value="warning">{t('warning')}</option>
                  <option value="success">{t('success')}</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={18} className="animate-spin" /> : <BellRing size={18} />}
                  {t('send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t('add_user')}</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                    <input
                      type="text"
                      required
                      value={newUser.nom}
                      onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstname')}</label>
                    <input
                      type="text"
                      required
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">{t('password')}</label>
                    <button 
                      type="button" 
                      onClick={generatePassword}
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Key size={12} /> {t('generate')}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('id_number')}</label>
                  <input
                    type="text"
                    value={newUser.matricule}
                    onChange={(e) => setNewUser({...newUser, matricule: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact')}</label>
                    <input
                      type="text"
                      value={newUser.contact}
                      onChange={(e) => setNewUser({...newUser, contact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
                    <input
                      type="text"
                      value={newUser.address}
                      onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('gender')}</label>
                    <select
                      value={newUser.gender}
                      onChange={(e) => setNewUser({...newUser, gender: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                      <option value="not_specified">{t('not_specified')}</option>
                      <option value="male">{t('male')}</option>
                      <option value="female">{t('female')}</option>
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('age')}</label>
                    <input
                      type="number"
                      value={newUser.age}
                      onChange={(e) => setNewUser({...newUser, age: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('diploma')}</label>
                    <input
                      type="text"
                      value={newUser.diploma}
                      onChange={(e) => setNewUser({...newUser, diploma: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('experience_years')}</label>
                    <input
                      type="number"
                      value={newUser.experience_years}
                      onChange={(e) => setNewUser({...newUser, experience_years: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                  >
                    <option value="élève">{tData('élève')}</option>
                    <option value="enseignant">{tData('enseignant')}</option>
                    <option value="personnel administratif">{tData('personnel administratif')}</option>
                    <option value="admin">{tData('admin')}</option>
                  </select>
                </div>

                {newUser.role === 'élève' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('class')}</label>
                      <select
                        required
                        value={newUser.classe}
                        onChange={(e) => setNewUser({...newUser, classe: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="">Sélectionner une classe</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.nom}>{cls.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('house_optional')}</label>
                      <select
                        value={newUser.house_id || ''}
                        onChange={(e) => setNewUser({...newUser, house_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="">{t('no_house')}</option>
                        {houses.map(house => (
                          <option key={house.id} value={house.id}>{house.nom_maison}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {newUser.role === 'enseignant' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjects')} (séparés par des virgules)</label>
                      <input
                        type="text"
                        value={newUser.matieres?.join(', ') || newUser.matiere || ''}
                        onChange={(e) => setNewUser({...newUser, matieres: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})}
                        placeholder="Ex: Mathématiques, Français..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Classes assignées</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50">
                      {classes.map(cls => (
                        <label key={cls.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={(newUser.classes || []).includes(cls.nom)}
                            onChange={(e) => {
                              const currentClasses = newUser.classes || [];
                              if (e.target.checked) {
                                setNewUser({...newUser, classes: [...currentClasses, cls.nom]});
                              } else {
                                setNewUser({...newUser, classes: currentClasses.filter((c: string) => c !== cls.nom)});
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{cls.nom}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center gap-2 disabled:bg-indigo-400"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
