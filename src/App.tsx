import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Classes from './pages/Classes';
import Settings from './pages/Settings';
import IntegrationCode from './pages/IntegrationCode';
import Scanner from './pages/Scanner';
import MobileApp from './pages/MobileApp';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import BiometricRegistration from './pages/BiometricRegistration';
import StudentCard from './pages/StudentCard';
import KioskMode from './pages/KioskMode';
import Leaderboard from './pages/Leaderboard';
import RecentConnections from './pages/RecentConnections';
import Classroom from './pages/Classroom';
import Profile from './pages/Profile';
import Houses from './pages/Houses';
import Calendar from './pages/Calendar';
import NewsFeed from './pages/NewsFeed';
import Directory from './pages/Directory';
import Messaging from './pages/Messaging';
import About from './pages/About';
import AIAssistant from './pages/AIAssistant';
import CoursesSubjects from './pages/CoursesSubjects';
import { runMaintenance } from './services/MaintenanceService';
import { isFirebaseConfigured } from './lib/firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ReloadPrompt from './components/ReloadPrompt';
import Footer from './components/Footer';

function AppContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabParams, setTabParams] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        setTabParams(event.state.params || null);
      } else {
        // Default to dashboard if no state
        setActiveTab(currentUser?.role === 'élève' ? 'student_dashboard' : 'dashboard');
        setTabParams(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize history state for the first load
    if (!window.history.state) {
      window.history.replaceState({ tab: activeTab, params: tabParams }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'élève' && activeTab === 'dashboard') {
      setActiveTab('student_dashboard');
    }

    // Run maintenance if admin
    if (currentUser?.role === 'admin') {
      runMaintenance(currentUser.role);
    }
  }, [currentUser, activeTab]);

  const handleNavigate = (tab: string, params?: any) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setTabParams(params || null);
      // Push to browser history
      window.history.pushState({ tab, params }, '');
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  // Si l'utilisateur n'a pas complété son inscription biométrique
  if (!currentUser.face_id || !currentUser.fingerprint_id) {
    return <BiometricRegistration />;
  }

  const renderContent = () => {
    const role = currentUser?.role || '';
    
    switch (activeTab) {
      case 'kiosk':
        return role === 'admin' ? <KioskMode onExit={() => setActiveTab('users')} /> : <Dashboard />;
      case 'dashboard': 
        return ['admin', 'enseignant', 'personnel administratif'].includes(role) ? <Dashboard /> : <StudentDashboard />;
      case 'student_dashboard': 
        return role === 'élève' ? <StudentDashboard /> : <Dashboard />;
      case 'student_card': 
        return role === 'élève' ? <StudentCard /> : <Dashboard />;
      case 'users': 
        return role === 'admin' ? <Users /> : <Dashboard />;
      case 'attendance': 
        return ['admin', 'enseignant', 'personnel administratif'].includes(role) ? <Attendance /> : <StudentDashboard />;
      case 'reports': 
        return ['admin', 'enseignant', 'personnel administratif'].includes(role) ? <Reports /> : <StudentDashboard />;
      case 'classes': 
        return role === 'admin' ? <Classes /> : <Dashboard />;
      case 'settings': 
        return role === 'admin' ? <Settings /> : <Dashboard />;
      case 'scanner': 
        return role === 'admin' ? <Scanner /> : <Dashboard />;
      case 'mobile_app': 
        return role === 'admin' ? <MobileApp /> : <Dashboard />;
      case 'integration': 
        return role === 'admin' ? <IntegrationCode /> : <Dashboard />;
      case 'leaderboard': return <Leaderboard />;
      case 'houses': return <Houses />;
      case 'classroom': 
        return ['enseignant', 'élève'].includes(role) ? <Classroom /> : <Dashboard />;
      case 'courses_subjects':
        return ['admin', 'enseignant'].includes(role) ? <CoursesSubjects initialPrepId={tabParams?.prepId} /> : <Dashboard />;
      case 'calendar': 
        return ['admin', 'enseignant', 'personnel administratif'].includes(role) ? <Calendar /> : <StudentDashboard />;
      case 'newsfeed': return <NewsFeed />;
      case 'ai_assistant': 
        return ['admin', 'enseignant'].includes(role) ? <AIAssistant onNavigate={handleNavigate} /> : <Dashboard />;
      case 'directory': 
        return ['admin', 'enseignant', 'personnel administratif'].includes(role) ? <Directory onNavigate={handleNavigate} /> : <StudentDashboard />;
      case 'messaging': return <Messaging initialChatTargetId={tabParams?.userId} onClearTarget={() => setTabParams(null)} />;
      case 'recent_connections': 
        return role === 'admin' ? <RecentConnections /> : <Dashboard />;
      case 'profile': return <Profile />;
      case 'about': return <About />;
      default: return role === 'élève' ? <StudentDashboard /> : <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 print:bg-white print:h-auto transition-colors duration-200">
      <Sidebar activeTab={activeTab} setActiveTab={handleNavigate} isMobileOpen={isSidebarOpen} setIsMobileOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <Header activeTab={activeTab} setActiveTab={handleNavigate} onMenuClick={() => setIsSidebarOpen(true)} />
        {!isFirebaseConfigured && (
          <div className="bg-amber-100 text-amber-800 p-3 text-center text-sm font-medium flex items-center justify-center gap-2">
            ⚠️ Firebase n'est pas configuré. Ajoutez vos clés d'API dans les variables d'environnement (Settings &gt; Environment Variables) avec les clés VITE_FIREBASE_*.
          </div>
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 print:overflow-visible print:bg-white print:p-0 transition-colors duration-200">
          <div className="min-h-full flex flex-col">
            <div className="flex-1">
              {renderContent()}
            </div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
          <ReloadPrompt />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
