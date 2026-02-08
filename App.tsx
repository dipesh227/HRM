import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './components/Auth/Login';
import HRDashboard from './components/HR/HRDashboard';
import SiteDashboard from './components/Site/SiteDashboard';
import EmployeeView from './components/Employee/EmployeeView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { Navbar } from './components/Layout/Navbar';
import { UserRole, Notification } from './types';
import { dbService } from './services/mockDb';
import { Loader2, Moon, Sun } from 'lucide-react';

// --- Layout Wrapper ---
const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  
  // Branding
  const [companyName, setCompanyName] = useState<string>('Konark HR');
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);
  const DEFAULT_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Load Branding
  useEffect(() => {
      const fetchGlobalBranding = async () => {
          try {
              const comp = await dbService.getCompanyDetails(DEFAULT_COMPANY_ID);
              if (comp) {
                  setCompanyName(comp.name);
                  setCompanyLogo(comp.logoUrl);
                  document.title = comp.metaTitle || comp.name;
              }
          } catch (e) { console.error(e); }
      };
      fetchGlobalBranding();
  }, []);

  // Poll Notifications
  useEffect(() => {
      if (!user) return;
      const fetchNotes = async () => {
          try {
              const data = await dbService.getNotifications(user.id);
              setNotifications(data);
          } catch(e) {}
      };
      fetchNotes();
      const interval = setInterval(fetchNotes, 30000);
      return () => clearInterval(interval);
  }, [user]);

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
            {/* We pass the sidebar props down to the children via React.cloneElement or Context if we were fully rigorous, 
                but for now we route to the Dashboards which accept these props. 
                However, since Route elements are instantiated here, we can pass props directly. 
            */}
            <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
        </div>
    </div>
  );
};

// --- Protected Route Guard ---
const ProtectedRoute: React.FC<{ allowedRoles: UserRole[], children: React.ReactNode }> = ({ allowedRoles, children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    
    // Inject sidebar props if the child is a functional component that accepts them
    // Note: In strict routing, sidebar state should be lifted or in context. 
    // For this migration, we assume the dashboard handles its own sidebar or ignores it if closed.
    return <>{children}</>;
};

// --- Role Redirector ---
const DashboardRedirect: React.FC = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    
    if (user.role === UserRole.HR) return <Navigate to="/hr" replace />;
    if (user.role === UserRole.SITE_INCHARGE) return <Navigate to="/site" replace />;
    return <Navigate to="/employee" replace />;
};

// --- Main App Logic ---
const AppContent: React.FC = () => {
    const [dbStatus, setDbStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');
    const [dbError, setDbError] = useState('');
    const [dbErrorCode, setDbErrorCode] = useState<string | undefined>(undefined);

    useEffect(() => {
        const check = async () => {
            const { connected, error, code } = await dbService.checkConnection();
            if (connected) setDbStatus('CONNECTED');
            else {
                setDbError(error || 'Unknown Error');
                setDbErrorCode(code);
                setDbStatus('ERROR');
            }
        };
        check();
    }, []);

    if (dbStatus === 'CHECKING') {
        return (
             <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                    <Route path="/" element={<DashboardRedirect />} />
                    
                    <Route path="/hr" element={
                        <ProtectedRoute allowedRoles={[UserRole.HR]}>
                            {/* We need a wrapper to consume the outlet context for sidebar */}
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

// --- Wrappers to bridge Layout Context (Sidebar) to Dashboards ---
import { useOutletContext } from 'react-router-dom';

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

const App: React.FC = () => {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
};

export default App;