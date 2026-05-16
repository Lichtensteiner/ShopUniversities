import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Trash2, Edit3, PlusCircle, Zap } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'delete' | 'update' | 'add' | 'optimize';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

interface NotificationContextType {
  notify: (type: NotificationType, message: string, title?: string) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  notifyDelete: (entityName: string) => void;
  notifyUpdate: (entityName: string) => void;
  notifyAdd: (entityName: string) => void;
  notifyOptimize: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const APP_NAME = "Edu-Nify";

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((type: NotificationType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message, title }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, [removeNotification]);

  const notifySuccess = (message: string) => notify('success', message, `${APP_NAME} - Succès`);
  const notifyError = (message: string) => notify('error', message, `${APP_NAME} - Erreur`);
  const notifyInfo = (message: string) => notify('info', message, `${APP_NAME} - Info`);
  
  const notifyDelete = (entityName: string) => 
    notify('delete', `${entityName} a été supprimé avec succès de ${APP_NAME}.`, "Suppression Réussie");
    
  const notifyUpdate = (entityName: string) => 
    notify('update', `${entityName} a été mis à jour dans l'écosystème ${APP_NAME}.`, "Mise à jour Réussie");
    
  const notifyAdd = (entityName: string) => 
    notify('add', `${entityName} a été ajouté avec succès à ${APP_NAME}.`, "Nouvel Ajout");

  const notifyOptimize = () => 
    notify('optimize', `Optimisation de l'écosystème ${APP_NAME} lancée avec succès !`, "Intelligence Artificielle");

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      case 'delete': return <Trash2 className="text-red-500" size={20} />;
      case 'update': return <Edit3 className="text-indigo-500" size={20} />;
      case 'add': return <PlusCircle className="text-emerald-500" size={20} />;
      case 'optimize': return <Zap className="text-amber-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
      case 'add': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50';
      case 'error':
      case 'delete': return 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50';
      case 'update': return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50';
      case 'optimize': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50';
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notify, notifySuccess, notifyError, notifyInfo, 
      notifyDelete, notifyUpdate, notifyAdd, notifyOptimize 
    }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 w-full max-w-sm">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl border shadow-xl flex items-start gap-4 ${getBgColor(n.type)} backdrop-blur-md`}
            >
              <div className="shrink-0 mt-1">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                {n.title && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">
                    {n.title}
                  </p>
                )}
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                  {n.message}
                </p>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                id={`close-notification-${n.id}`}
              >
                <X size={14} className="text-gray-400" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
