import React from 'react';
import { User, UserRole, Notification } from '../../types';
import { LogOut, Bell, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  user: User;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, theme, toggleTheme, onLogout, notifications, showNotifications, setShowNotifications 
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="bg-slate-900 dark:bg-slate-950 text-white px-4 md:px-6 py-3 shadow-lg flex justify-between items-center z-50 sticky top-0 border-b border-slate-800 dark:border-slate-800">
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
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
          title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

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
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Notifications</h4>
                      <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 rounded">{notifications.length}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">No new notifications</div>
                      ) : (
                          notifications.map(n => (
                              <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                  <div className="flex gap-2">
                                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'ALERT' ? 'bg-red-500' : n.type === 'SUCCESS' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                      <div>
                                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-tight">{n.message}</p>
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
          <div className="text-xs text-slate-400 max-w-[150px] truncate">{user.email || user.id}</div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 bg-slate-800 hover:bg-red-900/50 hover:text-red-200 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};