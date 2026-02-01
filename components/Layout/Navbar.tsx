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
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, theme, toggleTheme, onLogout, notifications, showNotifications, setShowNotifications, onMenuClick 
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getRoleLabel = (role: string) => {
      switch(role) {
          case 'HR': return 'HR Administrator';
          case 'SITE_INCHARGE': return 'Site Manager';
          case 'EMPLOYEE': return 'Staff Member';
          default: return role.replace(/_/g, ' ');
      }
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-[50] bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20 transition-all duration-300">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-3 md:gap-4 max-w-[70%] group cursor-default">
                <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-gradient-to-tr from-ios-blue to-blue-600 h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg shadow-blue-500/20 transform group-hover:scale-105 transition-transform duration-300">KE</div>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-base md:text-lg text-slate-900 dark:text-white tracking-tight leading-none truncate">Konark HR</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 mt-0.5 md:mt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest group-hover:text-ios-blue transition-colors truncate">
                            {getRoleLabel(user.role)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Actions & Menu */}
            <div className="flex items-center gap-1 md:gap-3">
                <button 
                    onClick={toggleTheme}
                    className="p-2 md:p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:text-slate-900 dark:hover:text-white"
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 md:p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-all hover:text-slate-900 dark:hover:text-white relative"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 md:top-3 md:right-3 w-2 h-2 md:w-2.5 md:h-2.5 bg-ios-red rounded-full ring-2 ring-white dark:ring-black animate-pulse"></span>
                        )}
                    </button>
                    
                    {showNotifications && (
                        <div className="absolute right-0 top-12 md:top-16 w-72 sm:w-80 bg-white/95 dark:bg-ios-dark-card/95 backdrop-blur-2xl rounded-3xl shadow-ios-float border border-white/20 dark:border-white/10 overflow-hidden z-[60] animate-slide-up origin-top-right">
                            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                <h4 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Notifications</h4>
                                {unreadCount > 0 && <span className="text-[10px] font-bold bg-ios-blue text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto p-2">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <p className="text-sm text-slate-400">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                                            <p className="text-sm text-slate-800 dark:text-white font-medium">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden md:block mx-1"></div>

                <button 
                    onClick={onLogout}
                    className="hidden md:flex p-2 md:px-4 md:py-2 items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-bold">Logout</span>
                </button>

                {/* Mobile Hamburger Menu (Right Side) */}
                <button 
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </div>
      </div>
    </nav>
    <div className="h-16 md:h-20 w-full shrink-0"></div>
    </>
  );
};