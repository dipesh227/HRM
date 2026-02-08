import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './components/Auth/Login';
import HRDashboard from './components/HR/HRDashboard';
import SiteDashboard from './components/Site/SiteDashboard';
import EmployeeView from './components/Employee/EmployeeView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { Navbar } from './components/Layout/Navbar';
import { UserRole, Notification } from './types';
import { dbService } from './services/mockDb';
import { Loader2 } from 'lucide-react';

// --- Main Layout Component ---
const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  
  // Branding State
  const [companyName, setCompanyName] = useState<string>('Konark HR');
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Load Global Branding
  useEffect(() => {
      const fetchGlobalBranding = async () => {
          try {
              const comp = await dbService.getCompanyDetails('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
              if (comp) {
                  setCompanyName(comp.name);
                  setCompanyLogo(comp.logoUrl);
                  document.title = comp.metaTitle || comp.name;
              }
          } catch (e) { console.error(e); }
      };
      fetchGlobalBranding();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
        <Navbar 
            user={user} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            onLogout={logout} 
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            onMenuClick={() => setIsSidebarOpen(true)}
            companyLogo={companyLogo} 
            companyName={companyName}
        />
        <div className="flex-1 overflow-y-auto relative bg-slate-100 dark:bg-slate-950 overscroll-none">
            <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
        </div>
    </div>
  );
};

// --- Route Protection Wrappers ---

const ProtectedRoute: React.FC<{ allowedRoles: UserRole[], children: React.ReactNode }> = ({ allowedRoles, children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    return <>{children}</>;
};

const RoleBasedRedirect: React.FC = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    
    if (user.role === UserRole.HR) return <Navigate to="/hr" replace />;
    if (user.role === UserRole.SITE_INCHARGE) return <Navigate to="/site" replace />;
    if (user.role === UserRole.EMPLOYEE) return <Navigate to="/employee" replace />;
    
    return <Navigate to="/login" replace />;
};

// --- Dashboard Wrappers (Connect Context) ---

const HRDashboardWrapper = () => {
    const { user, logout } = useAuth();
    const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<any>();
    return <HRDashboard user={user!} isSidebarOpen={isSidebarOpen} onSidebarClose={() => setIsSidebarOpen(false)} onLogout={logout} />;
};

const SiteDashboardWrapper = () => {
    const { user, logout } = useAuth();
    const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<any>();
    return <SiteDashboard user={user!} isSidebarOpen={isSidebarOpen} onSidebarClose={() => setIsSidebarOpen(false)} onLogout={logout} />;
};

const EmployeeViewWrapper = () => {
    const { user, logout } = useAuth();
    const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<any>();
    return <EmployeeView user={user!} isSidebarOpen={isSidebarOpen} onSidebarClose={() => setIsSidebarOpen(false)} onLogout={logout} />;
};

// --- Core Application Logic ---

const AppContent: React.FC = () => {
    const [dbStatus, setDbStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');
    const [dbError, setDbError] = useState('');
    const [dbErrorCode, setDbErrorCode] = useState<string | undefined>(undefined);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const { connected, error, code } = await dbService.checkConnection();
                if (connected) {
                    setDbStatus('CONNECTED');
                } else {
                    console.error("DB Connect Error:", error);
                    setDbError(error || 'Connection Failed');
                    setDbErrorCode(code);
                    setDbStatus('ERROR');
                }
            } catch (e) {
                setDbStatus('CONNECTED'); // Fallback to allow mock mode if hard fail
            }
        };
        checkConnection();
    }, []);

    if (dbStatus === 'CHECKING') {
        return (
             <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
                 <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                 <p className="text-sm font-medium text-slate-500">Initializing System...</p>
             </div>
        );
    }

    if (dbStatus === 'ERROR') {
        return <DatabaseSetup onRetry={() => window.location.reload()} error={dbError} errorCode={dbErrorCode} />;
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route element={<AppLayout />}>
                    <Route path="/" element={<RoleBasedRedirect />} />
                    
                    <Route path="/hr" element={
                        <ProtectedRoute allowedRoles={[UserRole.HR]}>
                            <HRDashboardWrapper />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/site" element={
                        <ProtectedRoute allowedRoles={[UserRole.SITE_INCHARGE]}>
                            <SiteDashboardWrapper />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/employee" element={
                        <ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]}>
                             <EmployeeViewWrapper />
                        </ProtectedRoute>
                    } />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
};

export default App;