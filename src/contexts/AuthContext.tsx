import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'enseignant' | 'élève' | 'personnel administratif';
  classe?: string;
  classes?: string[];
  matiere?: string;
  matieres?: string[];
  matricule?: string;
  photo?: string;
  cover?: string;
  date_creation?: string;
  face_id?: string | null;
  fingerprint_id?: string | null;
  house_id?: string;
  biographie?: string;
  status?: 'online' | 'offline';
  lastSeen?: any;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, mdp: string) => Promise<void>;
  register: (data: Omit<User, 'id' | 'date_creation' | 'face_id' | 'fingerprint_id'>, mdp: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsInitializing(false);
      return;
    }
    
    let unsubscribeDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeDoc) unsubscribeDoc();

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        // Update status to online when auth state changes to logged in
        setDoc(docRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(err => console.error("Error updating online status:", err));

        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            
            // Auto-fill admin name if missing
            if (firebaseUser.email === 'martinienmvezogo@gmail.com' && (!userData.prenom || !userData.nom)) {
              setDoc(docRef, {
                prenom: 'Martinien',
                nom: 'Mvezogo'
              }, { merge: true }).catch(err => console.error("Error updating admin name:", err));
              
              setCurrentUser({ id: docSnap.id, ...userData, prenom: 'Martinien', nom: 'Mvezogo' } as User);
            } else {
              setCurrentUser({ id: docSnap.id, ...userData } as User);
            }
          } else {
            // Auto-create admin document if it doesn't exist
            if (firebaseUser.email === 'martinienmvezogo@gmail.com') {
              const adminData = {
                email: firebaseUser.email,
                role: 'admin',
                prenom: 'Martinien',
                nom: 'Mvezogo',
                status: 'online',
                lastSeen: serverTimestamp()
              };
              setDoc(docRef, adminData).catch(err => console.error("Error creating admin doc:", err));
              setCurrentUser({ id: firebaseUser.uid, ...adminData } as User);
            } else {
              setCurrentUser(null);
            }
          }
          setIsInitializing(false);
        }, (err) => {
          console.error("Erreur lors de la récupération du profil:", err);
          setCurrentUser(null);
          setIsInitializing(false);
        });
      } else {
        setCurrentUser(null);
        setIsInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Handle visibility change for presence
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) return;

    const handleVisibilityChange = () => {
      const docRef = doc(db, 'users', currentUser.id);
      if (document.visibilityState === 'visible') {
        setDoc(docRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(err => console.error(err));
      } else {
        setDoc(docRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(err => console.error(err));
      }
    };

    const handleBeforeUnload = () => {
      const docRef = doc(db, 'users', currentUser.id);
      setDoc(docRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      }, { merge: true }).catch(err => console.error(err));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const login = async (email: string, mdp: string) => {
    if (!isFirebaseConfigured) throw new Error("Firebase non configuré");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, mdp);
      // Log connection
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          let nom = userData.nom;
          let prenom = userData.prenom;
          
          if (email === 'martinienmvezogo@gmail.com' && (!prenom || !nom)) {
            prenom = 'Martinien';
            nom = 'Mvezogo';
          }
          
          await addDoc(collection(db, 'connections'), {
            user_id: userCredential.user.uid,
            nom: nom,
            prenom: prenom,
            email: userData.email || email,
            role: userData.role || 'admin',
            timestamp: new Date().toISOString()
          });
        } else if (email === 'martinienmvezogo@gmail.com') {
          await addDoc(collection(db, 'connections'), {
            user_id: userCredential.user.uid,
            nom: 'Mvezogo',
            prenom: 'Martinien',
            email: email,
            role: 'admin',
            timestamp: new Date().toISOString()
          });
        } else {
          // If user document doesn't exist and it's not the admin, delete the auth user and throw error
          await userCredential.user.delete();
          throw new Error("Profil utilisateur introuvable. Veuillez vous réinscrire.");
        }
      } catch (logErr) {
        if (logErr instanceof Error && logErr.message === "Profil utilisateur introuvable. Veuillez vous réinscrire.") {
          throw logErr;
        }
        console.error("Erreur lors de l'enregistrement de la connexion:", logErr);
      }
      // onAuthStateChanged will handle setting the user
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id' | 'date_creation' | 'face_id' | 'fingerprint_id'>, mdp: string) => {
    if (!isFirebaseConfigured) throw new Error("Firebase non configuré");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, mdp);
      try {
        const newUser = Object.fromEntries(
          Object.entries({
            ...userData,
            user_id: userCredential.user.uid,
            date_creation: new Date().toISOString(),
            face_id: null,
            fingerprint_id: null
          }).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser, { merge: true });
      } catch (firestoreErr) {
        // If Firestore document creation fails, delete the user from Auth to allow retrying
        await userCredential.user.delete();
        throw firestoreErr;
      }
      // onAuthStateChanged will handle setting the user
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.id);
        await setDoc(docRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
      await signOut(auth);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, loading }}>
      {!isInitializing && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
