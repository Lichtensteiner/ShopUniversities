import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { 
  Utensils, 
  Plus, 
  Calendar, 
  CreditCard, 
  ChefHat, 
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Wallet,
  Coins,
  Edit2,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  id: string;
  day: string;
  starter: string;
  mainCourse: string;
  dessert: string;
  allergens?: string[];
  published?: boolean;
}

interface CanteenAccount {
  id: string;
  userId: string;
  userName: string;
  balance: number;
  restrictions?: string[];
}

export default function Canteen() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [account, setAccount] = useState<CanteenAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'personnel administratif' || currentUser?.role === 'cuisinier';

  useEffect(() => {
    // Fetch Menu
    const qMenu = query(collection(db, 'canteen_menu'));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
      setMenu(menuData);
    });

    // Fetch User Canteen Account
    if (currentUser) {
      const qAccount = query(collection(db, 'canteen_accounts'), where('userId', '==', currentUser.id));
      const unsubscribeAccount = onSnapshot(qAccount, (snapshot) => {
        if (!snapshot.empty) {
          setAccount({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CanteenAccount);
        } else if (currentUser.role === 'élève') {
           // Create account if not exists for students
           addDoc(collection(db, 'canteen_accounts'), {
             userId: currentUser.id,
             userName: `${currentUser.prenom} ${currentUser.nom}`,
             balance: 0,
             restrictions: []
           });
        }
        setLoading(false);
      });
      return () => {
        unsubscribeMenu();
        unsubscribeAccount();
      };
    }

    setLoading(false);
    return () => unsubscribeMenu();
  }, [currentUser]);

  const handleSaveMenu = async () => {
    if (!editingDay) return;
    
    try {
      const existingMenu = menu.find(m => m.day === editingDay);
      if (existingMenu) {
        await updateDoc(doc(db, 'canteen_menu', existingMenu.id), {
          starter: editForm.starter || '',
          mainCourse: editForm.mainCourse || '',
          dessert: editForm.dessert || '',
          published: editForm.published ?? false
        });
      } else {
        await addDoc(collection(db, 'canteen_menu'), {
          day: editingDay,
          starter: editForm.starter || '',
          mainCourse: editForm.mainCourse || '',
          dessert: editForm.dessert || '',
          published: editForm.published ?? false
        });
      }
      setEditingDay(null);
    } catch (error) {
      console.error("Error saving menu:", error);
    }
  };

  const togglePublish = async (menuItem: MenuItem) => {
    try {
      await updateDoc(doc(db, 'canteen_menu', menuItem.id), {
        published: !menuItem.published
      });
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };

  const handleTopUp = async () => {
    if (!account || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await updateDoc(doc(db, 'canteen_accounts', account.id), {
        balance: account.balance + amount
      });
      
      // Log transaction
      await addDoc(collection(db, 'canteen_transactions'), {
        userId: currentUser?.id,
        type: 'topup',
        amount,
        timestamp: serverTimestamp()
      });

      setShowTopUp(false);
      setTopUpAmount('');
    } catch (error) {
      console.error("Error topping up:", error);
    }
  };

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
              <Utensils size={24} />
            </div>
            {t('canteen')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Menu de la semaine et gestion de votre compte cantine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Summary (Students/Parents) */}
        <div className="lg:col-span-1 space-y-6">
          {!canManage && (
            <>
              <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-200 dark:shadow-none">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Wallet size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">Solde Actuel</p>
                    <p className="text-3xl font-black">{account?.balance.toLocaleString()} FCFA</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => setShowTopUp(true)}
                    className="w-full py-4 bg-white text-orange-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                  >
                    <Plus size={20} />
                    Recharger
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Restrictions Alimentaires
                </h3>
                {account?.restrictions && account.restrictions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {account.restrictions.map((res, i) => (
                      <span key={i} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-800">
                        {res}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Aucune restriction signalée.</p>
                )}
              </div>
            </>
          )}

          {canManage && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900 shadow-xl shadow-indigo-100 dark:shadow-none">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <ChefHat size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('canteen_management_mode')}</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {t('canteen_management_desc')}
              </p>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-indigo-600" />
                  <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    {t('canteen_draft_notice')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Menu */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Utensils size={24} className="text-indigo-600" />
              Menu de la Semaine
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <Calendar size={14} />
              Semaine du {new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {days.map((day) => {
              const dayMenu = menu.find(m => m.day === day);
              const isPublished = dayMenu?.published;
              
              if (!canManage && !isPublished) {
                return (
                  <div key={day} className="bg-gray-50/50 dark:bg-gray-900/20 p-6 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[200px]">
                    <Clock size={32} className="opacity-20" />
                    <p className="text-lg font-black">{day}</p>
                    <p className="text-xs font-bold italic">{t('menu_in_preparation')}</p>
                  </div>
                );
              }

              return (
                <div key={day} className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] border ${isPublished ? 'border-indigo-100 dark:border-indigo-900' : 'border-gray-100 dark:border-gray-700'} shadow-sm relative overflow-hidden group transition-all`}>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Utensils size={80} />
                  </div>
                  
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div>
                      <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{day}</h3>
                      {canManage && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isPublished ? 'Publié' : 'Brouillon'}
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingDay(day);
                            setEditForm(dayMenu || { day, starter: '', mainCourse: '', dessert: '', published: false });
                          }}
                          className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        {dayMenu && (
                          <button 
                            onClick={() => togglePublish(dayMenu)}
                            className={`p-2 rounded-xl transition-colors ${isPublished ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title={isPublished ? t('unpublish') : t('publish')}
                          >
                            {isPublished ? <EyeOff size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {dayMenu ? (
                    <div className="space-y-4 relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('starter')}</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dayMenu.starter || t('not_defined')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('main_course')}</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dayMenu.mainCourse || t('not_defined')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('dessert')}</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dayMenu.dessert || t('not_defined')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-300 gap-2">
                      <Clock size={32} />
                      <p className="text-xs font-bold italic">Menu non défini</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Menu Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 border border-white/20"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Utensils size={24} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('compose_meal')} : {editingDay}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('starter')}</label>
                <input 
                  type="text"
                  value={editForm.starter || ''}
                  onChange={(e) => setEditForm({...editForm, starter: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-sm font-bold"
                  placeholder="Ex: Salade composée"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('main_course')}</label>
                <input 
                  type="text"
                  value={editForm.mainCourse || ''}
                  onChange={(e) => setEditForm({...editForm, mainCourse: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-sm font-bold"
                  placeholder="Ex: Poulet rôti et riz"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t('dessert')}</label>
                <input 
                  type="text"
                  value={editForm.dessert || ''}
                  onChange={(e) => setEditForm({...editForm, dessert: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-sm font-bold"
                  placeholder="Ex: Fruit de saison"
                />
              </div>
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl cursor-pointer border border-transparent hover:border-indigo-100 transition-all">
                <input 
                  type="checkbox"
                  checked={editForm.published || false}
                  onChange={(e) => setEditForm({...editForm, published: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white"
                />
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{t('publish_menu')}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('make_visible_students')}</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setEditingDay(null)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-black"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveMenu}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Enregistrer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-white/20 text-center"
          >
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Coins size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Recharger mon compte</h2>
            <p className="text-sm text-gray-500 mb-8">Entrez le montant que vous souhaitez ajouter à votre solde.</p>
            
            <div className="relative mb-8">
              <input 
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                autoFocus
                className="w-full text-4xl font-black text-center bg-gray-50 dark:bg-gray-900 border-none rounded-3xl py-6 focus:ring-4 focus:ring-orange-500/20 outline-none"
                placeholder="0"
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xl font-black text-gray-300">FCFA</span>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowTopUp(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-black"
              >
                Annuler
              </button>
              <button 
                onClick={handleTopUp}
                className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-200 dark:shadow-none hover:scale-105 transition-all"
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
