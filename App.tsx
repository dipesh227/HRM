import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import HRDashboard from './components/HR/HRDashboard';
import SiteDashboard from './components/Site/SiteDashboard';
import EmployeeView from './components/Employee/EmployeeView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { Navbar } from './components/Layout/Navbar';
import { User, UserRole, Notification } from './types';
import { dbService } from './services/mockDb';
import { Loader2, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar State
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined); // Company Logo State
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const [dbStatus, setDbStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');
  const [dbError, setDbError] = useState('');
  const [dbErrorCode, setDbErrorCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const checkDb = async () => {
      setDbStatus('CHECKING');
      setDbErrorCode(undefined);
      const { connected, error, code } = await dbService.checkConnection();
      if (connected) {
          setDbStatus('CONNECTED');
      } else {
          setDbError(error || 'Unknown Error');
          setDbErrorCode(code);
          setDbStatus('ERROR');
      }
  };

  useEffect(() => {
    checkDb();
  }, []);

  useEffect(() => {
    if (user) {
        // Fetch Notifications
        const fetchNotifications = async () => {
            try {
                const data = await dbService.getNotifications(user.id);
                setNotifications(data);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };

        // Fetch Company Details (Logo)
        const fetchCompanyLogo = async () => {
            if (user.companyId) {
                try {
                    const comp = await dbService.getCompanyDetails(user.companyId);
                    if (comp?.logoUrl) {
                        setCompanyLogo(comp.logoUrl);
                    }
                } catch (e) {
                    console.error("Failed to fetch company logo", e);
                }
            }
        };

        fetchNotifications();
        fetchCompanyLogo();
        
        const interval = setInterval(fetchNotifications, 3000);
        return () => clearInterval(interval);
    } else {
        setNotifications([]);
        setCompanyLogo(undefined);
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setShowNotifications(false);
    setIsSidebarOpen(false);
    setCompanyLogo(undefined);
  };

  if (dbStatus === 'CHECKING') {
      return (
          <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Connecting to Database...</p>
              </div>
          </div>
      );
  }

  if (dbStatus === 'ERROR') {
      return <DatabaseSetup onRetry={checkDb} error={dbError} errorCode={dbErrorCode} />;
  }

  if (!user) {
    return (
        <div className="relative">
             <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={toggleTheme} 
                  className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
             </div>
             <Login onLogin={setUser} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar 
        user={user} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onLogout={handleLogout} 
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        onMenuClick={() => setIsSidebarOpen(true)}
        companyLogo={companyLogo} // Pass the fetched logo
      />

      <div className="flex-1 overflow-y-auto relative bg-slate-100 dark:bg-slate-950">
        {/* Dashboards now receive sidebar props to manage navigation state */}
        {user.role === UserRole.HR && (
            <HRDashboard 
                user={user} 
                isSidebarOpen={isSidebarOpen} 
                onSidebarClose={() => setIsSidebarOpen(false)} 
                onLogout={handleLogout}
            />
        )}
        {user.role === UserRole.SITE_INCHARGE && (
            <SiteDashboard 
                user={user}
                isSidebarOpen={isSidebarOpen}
                onSidebarClose={() => setIsSidebarOpen(false)}
                onLogout={handleLogout}
            />
        )}
        {user.role === UserRole.EMPLOYEE && (
             <EmployeeView 
                user={user} 
                isSidebarOpen={isSidebarOpen}
                onSidebarClose={() => setIsSidebarOpen(false)}
                onLogout={handleLogout}
             />
        )}
      </div>
    </div>
  );
};

export default App;