import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDocs, deleteDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  History, 
  MessageCircle, 
  Calendar as CalendarIcon, 
  Plus, 
  UserPlus, 
  MoreVertical, 
  Trash2, 
  Send,
  Clock,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Chat from '../pages/Chat';

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Student {
  id: string;
  prenom: string;
  nom: string;
  photo?: string;
  points?: number;
}

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: string;
  classId: string;
}

interface ClassDetailsViewProps {
  classId: string;
  className: string;
  onClose: () => void;
}

export default function ClassDetailsView({ classId, className, onClose }: ClassDetailsViewProps) {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'classroom' | 'history' | 'messaging' | 'calendar'>('classroom');
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [allAvailableStudents, setAllAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  
  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState<'document' | 'image' | 'link' | 'video'>('document');
  const [resourceUrl, setResourceUrl] = useState('');

  useEffect(() => {
    if (!classId) return;

    // Fetch students
    const studentsQuery = query(collection(db, 'users'), where('classeId', '==', classId), where('role', '==', 'élève'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    // Fetch events
    const eventsQuery = query(collection(db, 'events'), where('classId', '==', classId));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.start.toDate(),
          end: data.end.toDate(),
        } as ClassEvent;
      }));
    });

    // Fetch resources (Class Story)
    const resourcesQuery = query(collection(db, 'resources'), where('classId', '==', classId));
    const unsubscribeResources = onSnapshot(resourcesQuery, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      }));
    });

    // Fetch all students not in this class for the "Add Student" modal
    const allStudentsQuery = query(collection(db, 'users'), where('role', '==', 'élève'));
    const unsubscribeAllStudents = onSnapshot(allStudentsQuery, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setAllAvailableStudents(all.filter(s => (s as any).classeId !== classId));
    });

    // Fetch conversations related to this class (if any) or general for the teacher
    if (currentUser?.role === 'enseignant') {
      const convQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.id));
      const unsubscribeConv = onSnapshot(convQuery, (snapshot) => {
        setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => {
        unsubscribeStudents();
        unsubscribeEvents();
        unsubscribeResources();
        unsubscribeConv();
      };
    }

    return () => {
      unsubscribeStudents();
      unsubscribeEvents();
      unsubscribeResources();
      unsubscribeAllStudents();
    };
  }, [classId, currentUser]);

  const handleAddStudentToClass = async () => {
    if (!selectedStudentToAdd) return;
    try {
      await updateDoc(doc(db, 'users', selectedStudentToAdd), {
        classeId: classId,
        classe: className
      });
      setIsAddStudentModalOpen(false);
      setSelectedStudentToAdd('');
    } catch (error) {
      console.error("Error adding student to class:", error);
    }
  };

  const handleStartChatWithStudent = async (studentId: string) => {
    if (!currentUser) return;
    
    // Check if conversation exists
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.id));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(d => {
      const data = d.data();
      return !data.isGroup && data.participants.includes(studentId);
    });

    if (existing) {
      setSelectedConversationId(existing.id);
    } else {
      const newConv = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.id, studentId],
        isGroup: false,
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        unreadCounts: {
          [currentUser.id]: 0,
          [studentId]: 0
        }
      });
      setSelectedConversationId(newConv.id);
    }
    setActiveTab('messaging');
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const start = new Date(`${eventDate}T${eventTime}`);
      const end = new Date(start.getTime() + 3600000); // 1 hour later
      await addDoc(collection(db, 'events'), {
        title: eventTitle,
        start,
        end,
        classId,
        publisherId: currentUser.id,
        publisherName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: serverTimestamp(),
        type: 'class_event'
      });
      setIsAddEventModalOpen(false);
      setEventTitle('');
      setEventDate('');
      setEventTime('');
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'resources'), {
        title: resourceTitle,
        type: resourceType,
        url: resourceUrl,
        classId,
        publisherId: currentUser.id,
        publisherName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: serverTimestamp()
      });
      setIsAddResourceModalOpen(false);
      setResourceTitle('');
      setResourceUrl('');
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const renderClassroom = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Élèves ({students.length})</h3>
        {currentUser?.role === 'enseignant' && (
          <button 
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
          >
            <UserPlus size={18} />
            Ajouter un élève
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {students.map(student => (
          <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center group hover:shadow-md transition-shadow">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl font-bold overflow-hidden">
                {student.photo ? (
                  <img src={student.photo} alt={student.prenom} className="w-full h-full object-cover" />
                ) : (
                  `${student.prenom[0]}${student.nom[0]}`
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                {student.points || 0}
              </div>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white truncate w-full">
              {student.prenom} {student.nom}
            </h4>
            {currentUser?.role === 'enseignant' && (
              <button 
                onClick={() => handleStartChatWithStudent(student.id)}
                className="mt-2 p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                title="Envoyer un message"
              >
                <MessageCircle size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Histoire de la classe</h3>
          {currentUser?.role === 'enseignant' && (
            <button 
              onClick={() => setIsAddResourceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus size={18} />
              Partager
            </button>
          )}
        </div>

        <div className="space-y-4">
          {resources.map(resource => (
            <div key={resource.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {resource.publisherName?.[0]}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{resource.publisherName}</h4>
                  <p className="text-xs text-gray-500">{resource.createdAt ? format(resource.createdAt.toDate(), 'PPP à HH:mm', { locale: fr }) : ''}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{resource.title}</p>
              {resource.type === 'image' && resource.url && (
                <img src={resource.url} alt="" className="w-full h-64 object-cover rounded-xl mb-4" />
              )}
              {resource.type === 'video' && resource.url && (
                <div className="aspect-video rounded-xl overflow-hidden mb-4">
                  <iframe src={resource.url} className="w-full h-full" allowFullScreen></iframe>
                </div>
              )}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                <button className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm transition-colors">
                  <MessageCircle size={18} />
                  Commenter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Évènements à venir</h3>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          {events.filter(e => e.start >= new Date()).slice(0, 3).map(event => (
            <div key={event.id} className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                <span className="text-[10px] font-bold uppercase">{format(event.start, 'MMM', { locale: fr })}</span>
                <span className="text-lg font-black">{format(event.start, 'dd')}</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{event.title}</h4>
                <p className="text-xs text-gray-500">{format(event.start, 'HH:mm')}</p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">Aucun évènement prévu</p>
          )}
          <button 
            onClick={() => setActiveTab('calendar')}
            className="w-full py-2 text-indigo-600 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            Voir tout le calendrier
          </button>
        </div>
      </div>
    </div>
  );

  const renderMessaging = () => {
    if (selectedConversationId) {
      return <Chat conversationId={selectedConversationId} onBack={() => setSelectedConversationId(null)} />;
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-200 dark:divide-gray-700">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              onClick={() => setSelectedConversationId(conv.id)}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {conv.isGroup ? <Users size={24} /> : <MessageCircle size={24} />}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{conv.groupName || 'Conversation'}</h4>
                  <p className="text-sm text-gray-500 line-clamp-1">{conv.lastMessage}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{conv.lastMessageTime ? format(conv.lastMessageTime.toDate(), 'HH:mm') : ''}</p>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Aucune conversation trouvée</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Calendrier de la classe</h3>
        {currentUser?.role === 'enseignant' && (
          <button 
            onClick={() => setIsAddEventModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={18} />
            Créer un évènement
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 h-[600px] calendar-container">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          culture="fr"
          messages={{
            next: "Suivant",
            previous: "Précédent",
            today: "Aujourd'hui",
            month: "Mois",
            week: "Semaine",
            day: "Jour",
            agenda: "Agenda"
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-50 dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{className}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Détails et gestion de la classe</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreVertical size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 px-6 border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-8">
            {[
              { id: 'classroom', label: 'Salle de classe', icon: Users },
              { id: 'history', label: 'Histoire de classe', icon: History },
              { id: 'messaging', label: 'Messagerie', icon: MessageCircle },
              { id: 'calendar', label: 'Calendrier', icon: CalendarIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'classroom' && renderClassroom()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'messaging' && renderMessaging()}
          {activeTab === 'calendar' && renderCalendar()}
        </div>
      </div>

      {/* Modals */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Ajouter un élève à la classe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sélectionner un élève</label>
                <select 
                  value={selectedStudentToAdd}
                  onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Choisir un élève...</option>
                  {allAvailableStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button 
                  onClick={handleAddStudentToClass}
                  disabled={!selectedStudentToAdd}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Créer un évènement</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                <input 
                  type="text" 
                  required 
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input 
                    type="date" 
                    required 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure</label>
                  <input 
                    type="time" 
                    required 
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAddEventModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Partager avec la classe</h3>
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message / Titre</label>
                <textarea 
                  required 
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de contenu</label>
                <select 
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="link">Lien</option>
                  <option value="video">Vidéo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL (optionnel)</label>
                <input 
                  type="url" 
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAddResourceModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Partager</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
