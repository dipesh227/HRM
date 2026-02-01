import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import HRDashboard from './components/HR/HRDashboard';
import SiteDashboard from './components/Site/SiteDashboard';
import EmployeeView from './components/Employee/EmployeeView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { User, UserRole, Notification } from './types';
import { dbService } from './services/mockDb';
import { LogOut, Bell, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Database Connection State
  const [dbStatus, setDbStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR'>('CHECKING');
  const [dbError, setDbError] = useState('');
  const [dbErrorCode, setDbErrorCode] = useState<string | undefined>(undefined);

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
        const fetchNotifications = async () => {
            try {
                const data = await dbService.getNotifications(user.id);
                setNotifications(data);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 3000);
        return () => clearInterval(interval);
    } else {
        setNotifications([]);
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setShowNotifications(false);
  };

  // --- RENDER LOGIC ---

  if (dbStatus === 'CHECKING') {
      return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-slate-600 font-medium">Connecting to Database...</p>
              </div>
          </div>
      );
  }

  if (dbStatus === 'ERROR') {
      return <DatabaseSetup onRetry={checkDb} error={dbError} errorCode={dbErrorCode} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Common Layout Wrapper
  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans text-slate-900">
      
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white px-4 md:px-6 py-3 shadow-lg flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-blue-500/50 shadow-sm border border-blue-500">KE</div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-lg leading-none mb-0.5">Konark Enterprises</span>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="px-1.5 py-px rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono tracking-wide uppercase leading-none">
                  {user.role.replace('_', ' ')}
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          
          {/* Notification Bell */}
          <div className="relative">
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors relative"
            >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 animate-pulse"></span>
                )}
            </button>
            
            {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-700">Notifications</h4>
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 rounded">{notifications.length}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                                    <div className="flex gap-2">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'ALERT' ? 'bg-red-500' : n.type === 'SUCCESS' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <p className="text-sm text-slate-800 leading-tight">{n.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>

          <div className="text-right hidden sm:block border-l border-slate-700 pl-4">
            <div className="text-xs text-slate-400 max-w-[150px] truncate">{user.email || user.uan}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-slate-800 hover:bg-red-900/50 hover:text-red-200 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-slate-100">
        {user.role === UserRole.HR && <HRDashboard />}
        {user.role === UserRole.SITE_INCHARGE && <SiteDashboard user={user} />}
        {user.role === UserRole.EMPLOYEE && <EmployeeView user={user} />}
      </div>

    </div>
  );
};

export default App;