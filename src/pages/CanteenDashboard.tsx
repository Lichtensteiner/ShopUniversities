import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  ShoppingCart, 
  Calendar, 
  Users, 
  ClipboardList, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  Beef,
  Apple,
  Coffee
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function CanteenDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [meals, setMeals] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMeal, setNewMeal] = useState({
    title: '',
    description: '',
    type: 'déjeuner',
    targetDate: new Date().toISOString().split('T')[0],
    calories: ''
  });

  useEffect(() => {
    // Listen to meals/menus
    const unsubMeals = onSnapshot(
      query(collection(db, 'canteen_menus'), orderBy('targetDate', 'desc'), limit(10)),
      (snapshot) => {
        setMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    // Listen to stock/inventory
    const unsubStock = onSnapshot(collection(db, 'canteen_stock'), (snapshot) => {
      setStock(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMeals();
      unsubStock();
    };
  }, []);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'canteen_menus'), {
        ...newMeal,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id,
        chefName: `${currentUser?.prenom} ${currentUser?.nom}`
      });
      setShowAddMenu(false);
      setNewMeal({ title: '', description: '', type: 'déjeuner', targetDate: new Date().toISOString().split('T')[0], calories: '' });
    } catch (error) {
      console.error("Error adding meal:", error);
    }
  };

  const stockStats = [
    { name: 'Fruits/Légumes', value: 45 },
    { name: 'Viandes/Poissons', value: 25 },
    { name: 'Produits Laitiers', value: 20 },
    { name: 'Epicerie', value: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tableau de Bord Cuisine</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les repas, le stock et les menus de l'établissement.</p>
        </div>
        <button 
          onClick={() => setShowAddMenu(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          Préparer un Menu
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Utensils size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Repas du jour</p>
            <h3 className="text-2xl font-bold text-gray-900">450</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Qualité Service</p>
            <h3 className="text-2xl font-bold text-gray-900">98%</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Commandes en cours</p>
            <h3 className="text-2xl font-bold text-gray-900">12</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Alertes Stock</p>
            <h3 className="text-2xl font-bold text-gray-900">3</h3>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prochains Menus */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600" />
                Planning des Repas
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button className="px-3 py-1 text-xs font-bold bg-white text-indigo-600 rounded-md shadow-sm">Hebdomadaire</button>
                <button className="px-3 py-1 text-xs font-bold text-gray-500">Mensuel</button>
              </div>
            </div>

            <div className="space-y-4">
              {meals.length > 0 ? (
                meals.map((meal) => (
                  <div key={meal.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors group">
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 flex flex-col items-center justify-center text-indigo-600 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{new Date(meal.targetDate).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      <span className="text-xl font-black">{new Date(meal.targetDate).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                          meal.type === 'petit-déjeuner' ? 'bg-amber-100 text-amber-700' :
                          meal.type === 'déjeuner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {meal.type}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 truncate">{meal.title}</h4>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{meal.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-gray-900">{meal.calories} kcal</p>
                        <p className="text-[10px] text-gray-400">Valeur nutr.</p>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Utensils size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold">Aucun menu planifié</p>
                  <button onClick={() => setShowAddMenu(true)} className="text-sm text-indigo-600 font-bold mt-2">Cliquez pour ajouter le premier</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consomation Hebdo */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Participation des élèves
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { day: 'Lun', count: 420 },
                    { day: 'Mar', count: 445 },
                    { day: 'Mer', count: 310 },
                    { day: 'Jeu', count: 430 },
                    { day: 'Ven', count: 390 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ingrédients clés */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-500" />
                Ravitaillement Prioritaire
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'Riz Long Grain', qty: '50kg', status: 'low' },
                  { name: 'Poisson Bar', qty: '12kg', status: 'critical' },
                  { name: 'Huile Végétale', qty: '20L', status: 'ok' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'critical' ? 'bg-red-500' : 
                        item.status === 'low' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`} />
                      <span className="text-xs font-bold text-gray-800">{item.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Cuistot */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Beef size={18} className="text-rose-500" />
              Répartition du Stock
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStats}
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {stockStats.map((stat, idx) => (
                <div key={stat.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-gray-600 font-bold">{stat.name}</span>
                  </div>
                  <span className="text-gray-900 font-black">{stat.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="font-black text-lg mb-4">Note du Chef</h3>
            <div className="space-y-4">
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
                <p className="text-xs leading-relaxed opacity-90 italic">
                  "Penser à vérifier les arrivages de légumes demain matin à 6h. La fête de l'école approche."
                </p>
              </div>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all">
                Modifier mes notes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Menu Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Préparer un nouveau repas</h3>
              <button onClick={() => setShowAddMenu(false)} className="text-gray-400 hover:text-gray-600">
                <AlertCircle size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddMeal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nom du Plat</label>
                <div className="relative">
                  <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={newMeal.title}
                    onChange={(e) => setNewMeal({...newMeal, title: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="ex: Poulet DG & Riz"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Type de repas</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'petit-déjeuner', icon: <Coffee size={14} />, label: 'Matin' },
                    { val: 'déjeuner', icon: <Beef size={14} />, label: 'Midi' },
                    { val: 'dîner', icon: <Utensils size={14} />, label: 'Soir' },
                  ].map(type => (
                    <button
                      key={type.val}
                      type="button"
                      onClick={() => setNewMeal({...newMeal, type: type.val})}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        newMeal.type === type.val ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {type.icon}
                      <span className="text-[10px] font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newMeal.targetDate}
                    onChange={(e) => setNewMeal({...newMeal, targetDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Calories</label>
                  <input 
                    type="number" 
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="kcal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Description / Ingrédients</label>
                <textarea 
                  rows={3}
                  value={newMeal.description}
                  onChange={(e) => setNewMeal({...newMeal, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                  placeholder="Liste d'allergènes ou descriptif..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddMenu(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Publier Menu
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
