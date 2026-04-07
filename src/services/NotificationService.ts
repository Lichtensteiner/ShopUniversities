import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  content?: string;
  type: 'info' | 'warning' | 'success';
  targetTab?: string;
  read: boolean;
  timestamp: string;
}

export const createNotification = async (data: Omit<NotificationData, 'read' | 'timestamp'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyAllUsers = async (title: string, message: string, type: 'info' | 'warning' | 'success', targetTab?: string) => {
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const usersSnap = await getDocs(collection(db, 'users'));
    
    const promises = usersSnap.docs.map(userDoc => 
      createNotification({
        user_id: userDoc.id,
        title,
        message,
        type,
        targetTab
      })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error("Error notifying all users:", error);
  }
};
