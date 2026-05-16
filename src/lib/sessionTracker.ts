import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { UAParser } from 'ua-parser-js';

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  device: string;
  os: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: any;
  userAgent: string;
  isMobile: boolean;
  status: 'active' | 'inactive';
}

let currentSessionId: string | null = null;
let heartbeatInterval: any = null;

export const initSessionTracking = async (user: any) => {
  if (!user || currentSessionId) return;

  try {
    const parser = new UAParser();
    const result = parser.getResult();
    
    const device = result.device.model || result.os.name || 'Desktop';
    const os = result.os.name + (result.os.version ? ` ${result.os.version}` : '');
    const browser = result.browser.name + (result.browser.version ? ` ${result.browser.version}` : '');
    const isMobile = result.device.type === 'mobile' || result.device.type === 'tablet';

    // Fetch location info
    let location = 'Libreville, Gabon'; // Default fallback based on user context
    let ip = '';
    
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.city && data.country_name) {
        location = `${data.city}, ${data.country_code}`;
        ip = data.ip || '';
      }
    } catch (e) {
      console.warn('Could not fetch real-time location, using fallback.');
    }

    const sessionId = `session_${Math.random().toString(36).substring(2, 15)}`;
    currentSessionId = sessionId;
    
    const sessionData = {
      id: sessionId,
      userId: user.id,
      userName: `${user.prenom} ${user.nom}`,
      device: isMobile ? `${result.os.name} / App Mobile` : `${result.browser.name} / ${result.os.name}`,
      os,
      browser,
      location,
      ip,
      lastActive: serverTimestamp(),
      userAgent: navigator.userAgent,
      isMobile,
      status: 'active'
    };

    await setDoc(doc(db, 'user_sessions', sessionId), sessionData);

    // Update heartbeat every 5 minutes
    heartbeatInterval = setInterval(async () => {
      if (currentSessionId) {
        await updateDoc(doc(db, 'user_sessions', currentSessionId), {
          lastActive: serverTimestamp()
        });
      }
    }, 5 * 60 * 1000);

    // Cleanup on window close
    window.addEventListener('beforeunload', async () => {
      if (currentSessionId) {
        await updateDoc(doc(db, 'user_sessions', currentSessionId), {
          status: 'inactive'
        });
      }
    });

  } catch (error) {
    console.error('Error initializing session tracking:', error);
  }
};

export const stopSessionTracking = async () => {
  if (currentSessionId) {
    try {
      await updateDoc(doc(db, 'user_sessions', currentSessionId), {
        status: 'inactive'
      });
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      currentSessionId = null;
    } catch (error) {
      console.error('Error stopping session tracking:', error);
    }
  }
};
