import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { 
  Book, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  History,
  Barcode,
  Library as LibraryIcon,
  Filter,
  User,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  status: 'available' | 'borrowed' | 'lost';
  currentBorrowerId?: string;
  currentBorrowerName?: string;
  currentLoanId?: string;
  dueDate?: any;
  addedAt: any;
}

interface LoanRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerId: string;
  borrowerName: string;
  loanDate: any;
  dueDate: any;
  returnDate?: any;
  status: 'active' | 'returned' | 'late';
}

export default function Library() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'personnel administratif';

  // New book form state
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Général',
  });

  useEffect(() => {
    const qBooks = query(collection(db, 'library_books'));
    const unsubscribeBooks = onSnapshot(qBooks, (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BookItem[]);
      setLoading(false);
    });

    const qLoans = query(collection(db, 'library_loans'));
    const unsubscribeLoans = onSnapshot(qLoans, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoanRecord[]);
    });

    return () => {
      unsubscribeBooks();
      unsubscribeLoans();
    };
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) return;

    try {
      await addDoc(collection(db, 'library_books'), {
        ...newBook,
        status: 'available',
        addedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewBook({ title: '', author: '', isbn: '', category: 'Général' });
    } catch (error) {
      console.error("Error adding book:", error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm('Supprimer ce livre ?')) return;
    await deleteDoc(doc(db, 'library_books', id));
  };

  const handleBorrow = async (book: BookItem) => {
    const studentName = prompt("Nom de l'emprunteur :");
    if (!studentName) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 2 weeks loan

    try {
      const loanRef = await addDoc(collection(db, 'library_loans'), {
        bookId: book.id,
        bookTitle: book.title,
        borrowerName: studentName,
        loanDate: serverTimestamp(),
        dueDate: dueDate.toISOString(),
        status: 'active'
      });

      await updateDoc(doc(db, 'library_books', book.id), {
        status: 'borrowed',
        currentBorrowerName: studentName,
        currentLoanId: loanRef.id
      });
    } catch (error) {
      console.error("Error borrowing book:", error);
    }
  };

  const handleReturn = async (book: BookItem) => {
    if (!book.currentLoanId) return;

    try {
      await updateDoc(doc(db, 'library_loans', book.currentLoanId), {
        returnDate: serverTimestamp(),
        status: 'returned'
      });

      await updateDoc(doc(db, 'library_books', book.id), {
        status: 'available',
        currentBorrowerName: null,
        currentLoanId: null
      });
    } catch (error) {
      console.error("Error returning book:", error);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <LibraryIcon size={24} />
            </div>
            {t('library')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez le fonds documentaire et les emprunts.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Plus size={20} />
            Nouveau Livre
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'catalog' 
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Book size={18} />
          Catalogue
        </button>
        <button 
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'loans' 
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <History size={18} />
          Emprunts
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un livre, un auteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredBooks.map((book) => (
                <motion.div
                  key={book.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      book.status === 'available' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
                    }`}>
                      {book.status === 'available' ? 'Disponible' : 'Emprunté'}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-1">{book.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">par {book.author}</p>
                    <div className="mt-3 flex items-center gap-2">
                       <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-gray-600">
                        {book.category}
                      </span>
                      {book.isbn && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-mono italic">
                          <Barcode size={10} /> {book.isbn}
                        </span>
                      )}
                    </div>
                  </div>

                  {book.status === 'borrowed' && book.currentBorrowerName && (
                    <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                        <User size={14} />
                        <span className="font-bold">Emprunté par : {book.currentBorrowerName}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-4">
                    {isAdmin && (
                      <>
                        {book.status === 'available' ? (
                          <button 
                            onClick={() => handleBorrow(book)}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors"
                          >
                            Sortie
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReturn(book)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-black hover:bg-green-700 transition-colors"
                          >
                            Retour
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Livre</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Emprunteur</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Date de sortie</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Date prévue</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors text-sm">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{loan.bookTitle}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{loan.borrowerName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {loan.loanDate?.toDate ? loan.loanDate.toDate().toLocaleDateString() : 'En attente'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(loan.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        loan.status === 'active' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700/30'
                      }`}>
                        {loan.status === 'active' ? 'En cours' : 'Rendu'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-white/20"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Nouveau Livre</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                type="button"
              >
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Titre du livre</label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Le Petit Prince"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Auteur</label>
                <input
                  type="text"
                  required
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Antoine de Saint-Exupéry"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">ISBN (Optionnel)</label>
                  <input
                    type="text"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Catégorie</label>
                  <select
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Général">Général</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Sciences">Sciences</option>
                    <option value="Histoire">Histoire</option>
                    <option value="Informatique">Informatique</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all mt-6"
              >
                Ajouter au catalogue
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
