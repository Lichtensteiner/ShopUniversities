import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserPlus, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function NewUserAnnouncement() {
  const [newUsers, setNewUsers] = useState<any[]>([]);
  const { tData } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const isoString = twentyFourHoursAgo.toISOString();

    const q = query(
      collection(db, 'users'),
      where('date_creation', '>=', isoString),
      orderBy('date_creation', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNewUsers(users);
    });

    return () => unsubscribe();
  }, []);

  if (newUsers.length === 0 || !visible) return null;

  return (
    <div className="relative overflow-hidden bg-indigo-600 dark:bg-indigo-700 text-white py-2 px-4 rounded-2xl shadow-lg shadow-indigo-500/20 mb-6 border border-indigo-500/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <UserPlus size={18} className="text-white" />
          </div>
          <span className="font-black text-xs uppercase tracking-widest bg-white/10 px-2 py-1 rounded">Flash Info</span>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
            {newUsers.map((user, idx) => (
              <div key={user.id || idx} className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-300" />
                <span className="font-medium">
                  Nouvelle inscription : <span className="font-bold">{user.prenom} {user.nom}</span> 
                  <span className="mx-2 opacity-70">•</span>
                  Fonction : <span className="bg-white/20 px-2 py-0.5 rounded text-xs lowercase font-bold">{tData(user.role)}</span>
                </span>
              </div>
            ))}
            {/* Duplicate for seamless scrolling if limited items */}
            {newUsers.length < 3 && newUsers.map((user, idx) => (
              <div key={`dup-${user.id || idx}`} className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-300" />
                <span className="font-medium">
                  Nouvelle inscription : <span className="font-bold">{user.prenom} {user.nom}</span> 
                  <span className="mx-2 opacity-70">•</span>
                  Fonction : <span className="bg-white/20 px-2 py-0.5 rounded text-xs lowercase font-bold">{tData(user.role)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setVisible(false)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}
