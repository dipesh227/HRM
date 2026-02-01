import React from 'react';
import { User, Notification } from '../../types';
import { LogOut, Bell, Moon, Sun, Menu } from 'lucide-react';

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
    <>
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 saturate-150 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
            
            {/* Branding */}
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-ios-blue to-blue-600 h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">KE</div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none">Konark HR</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mt-0.5">{user.role.replace('_', ' ')}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
                <button 
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-ios-red rounded-full ring-2 ring-white dark:ring-black"></span>
                        )}
                    </button>
                    
                    {/* Notification Dropdown (Glass) */}
                    {showNotifications && (
                        <div className="absolute right-0 top-14 w-80 bg-white/90 dark:bg-ios-dark-card/90 backdrop-blur-2xl rounded-2xl shadow-ios-float border border-slate-200/50 dark:border-slate-700/50 overflow-hidden z-50 animate-fade-in-up origin-top-right">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                                <h4 className="font-semibold text-sm">Notifications</h4>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mb-1 last:mb-0">
                                            <p className="text-sm text-slate-900 dark:text-white leading-snug">{n.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                <button 
                    onClick={onLogout}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full text-sm font-medium transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
                
                {/* Mobile Logout Icon only */}
                <button onClick={onLogout} className="sm:hidden p-2.5 text-slate-500 hover:text-red-600">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </nav>
    {/* Spacer for fixed navbar */}
    <div className="h-16"></div>
    </>
  );
};