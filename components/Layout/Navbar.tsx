import React from 'react';
import { User, Notification } from '../../types';
import { LogOut, Bell, Moon, Sun, Menu, ChevronDown } from 'lucide-react';

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20"> {/* Increased height to 20 (80px) */}
            
            {/* Branding */}
            <div className="flex items-center gap-4 group cursor-default">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-gradient-to-tr from-ios-blue to-blue-600 h-11 w-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 transform group-hover:scale-105 transition-transform duration-300">KE</div>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none">Konark HR</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest mt-1 group-hover:text-ios-blue transition-colors">{user.role.replace('_', ' ')}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
                <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:text-slate-900 dark:hover:text-white"
                >
                    {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:text-slate-900 dark:hover:text-white relative"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-ios-red rounded-full ring-2 ring-white dark:ring-black animate-pulse"></span>
                        )}
                    </button>
                    
                    {/* Notification Dropdown (Glass) */}
                    {showNotifications && (
                        <div className="absolute right-0 top-16 w-80 sm:w-96 bg-white/90 dark:bg-ios-dark-card/95 backdrop-blur-2xl rounded-3xl shadow-ios-float border border-white/20 dark:border-white/10 overflow-hidden z-50 animate-slide-up origin-top-right">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-white/5">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                                {unreadCount > 0 && <span className="text-xs font-bold text-ios-blue">{unreadCount} New</span>}
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm text-slate-400 font-medium">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <p className="text-sm text-slate-900 dark:text-white font-medium leading-relaxed group-hover:text-ios-blue transition-colors">{n.message}</p>
                                            <p className="text-xs text-slate-400 mt-1.5 font-medium">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden sm:block mx-1"></div>

                <button 
                    onClick={onLogout}
                    className="hidden sm:flex items-center gap-2 pl-4 pr-5 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-2xl text-sm font-bold transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
                
                {/* Mobile Logout Icon only */}
                <button onClick={onLogout} className="sm:hidden p-3 text-slate-500 hover:text-red-600">
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </div>
      </div>
    </nav>
    {/* Spacer for fixed navbar */}
    <div className="h-20"></div>
    </>
  );
};