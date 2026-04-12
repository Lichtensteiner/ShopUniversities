import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { 
  Wallet, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  CreditCard,
  History,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  type: 'tuition' | 'registration' | 'canteen' | 'transport' | 'other';
  status: 'paid' | 'pending' | 'overdue';
  date: any;
  method: 'cash' | 'card' | 'transfer';
  reference?: string;
  notes?: string;
}

const Finance: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPayment, setNewPayment] = useState({
    studentId: '',
    amount: '',
    type: 'tuition',
    method: 'cash',
    notes: '',
    reference: ''
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const unsubscribe = onSnapshot(collection(db, 'payments'), (snap) => {
      const paymentData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      
      paymentData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setPayments(paymentData);
      setLoading(false);
    });

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'élève'));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchStudents();
    return () => unsubscribe();
  }, [currentUser]);

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'paid' ? p.amount : 0), 0);
  const pendingRevenue = payments.reduce((acc, p) => acc + (p.status === 'pending' ? p.amount : 0), 0);
  const overdueRevenue = payments.reduce((acc, p) => acc + (p.status === 'overdue' ? p.amount : 0), 0);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const student = students.find(s => s.id === newPayment.studentId);
      await addDoc(collection(db, 'payments'), {
        ...newPayment,
        amount: parseFloat(newPayment.amount),
        studentName: student ? `${student.prenom} ${student.nom}` : 'Inconnu',
        date: serverTimestamp(),
        status: 'paid',
        recordedBy: currentUser.id
      });
      setShowAddModal(false);
      setNewPayment({
        studentId: '',
        amount: '',
        type: 'tuition',
        method: 'cash',
        notes: '',
        reference: ''
      });
    } catch (error) {
      console.error("Error saving payment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Accès restreint aux administrateurs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="text-indigo-600" />
            {t('finance')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Gestion des paiements et frais scolaires</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <Download size={18} />
            Rapport Financier
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            Enregistrer un paiement
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <ArrowUpRight className="text-green-500" size={20} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Recettes Totales</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalRevenue.toLocaleString()} FCFA
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {pendingRevenue.toLocaleString()} FCFA
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <AlertCircle size={24} />
            </div>
            <ArrowDownRight className="text-red-500" size={20} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Impayés</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {overdueRevenue.toLocaleString()} FCFA
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Élèves à jour</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {students.length > 0 ? Math.round((payments.filter(p => p.status === 'paid').length / students.length) * 100) : 0}%
          </h3>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un élève ou une référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={20} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Tous les types</option>
            <option value="tuition">Scolarité</option>
            <option value="registration">Inscription</option>
            <option value="canteen">Cantine</option>
            <option value="transport">Transport</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Élève</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Méthode</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Chargement des transactions...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucune transaction trouvée.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {payment.date?.toDate ? payment.date.toDate().toLocaleDateString(language) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{payment.studentName}</div>
                      {payment.reference && <div className="text-xs text-gray-500 dark:text-gray-400">Réf: {payment.reference}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-xs font-medium capitalize">
                        {payment.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      {payment.amount.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {payment.method === 'cash' ? <DollarSign size={14} /> : payment.method === 'card' ? <CreditCard size={14} /> : <History size={14} />}
                        <span className="capitalize">{payment.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {payment.status === 'paid' ? <CheckCircle2 size={12} /> : payment.status === 'pending' ? <Clock size={12} /> : <AlertCircle size={12} />}
                        {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'En retard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <History size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enregistrer un paiement</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Élève</label>
                  <select
                    required
                    value={newPayment.studentId}
                    onChange={(e) => setNewPayment({...newPayment, studentId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Sélectionner un élève</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.classe})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant (FCFA)</label>
                    <input
                      type="number"
                      required
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                    <select
                      value={newPayment.type}
                      onChange={(e) => setNewPayment({...newPayment, type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="tuition">Scolarité</option>
                      <option value="registration">Inscription</option>
                      <option value="canteen">Cantine</option>
                      <option value="transport">Transport</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Méthode</label>
                    <select
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({...newPayment, method: e.target.value as any})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="cash">Espèces</option>
                      <option value="card">Carte Bancaire</option>
                      <option value="transfer">Virement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence</label>
                    <input
                      type="text"
                      value={newPayment.reference}
                      onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Ex: CHQ-12345"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Enregistrement...' : 'Confirmer le paiement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Finance;
