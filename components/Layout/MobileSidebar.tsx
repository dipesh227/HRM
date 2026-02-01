import React from 'react';
import { User, UserRole } from '../../types';
import { X, LogOut, ChevronRight, UserPlus, Building2, UserCircle, Briefcase } from 'lucide-react';
import { Button } from '../UI/Button';

interface TabItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
}

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    
    // Actions for specific roles
    onAddStaff?: () => void;
    onAddSupervisor?: () => void;
    
    onLogout: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ 
    isOpen, onClose, user, tabs, activeTab, onTabChange, 
    onAddStaff, onAddSupervisor, onLogout 
}) => {
    
    // Lock body scroll when sidebar is open
    React.useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Drawer - Fixed Left */}
            <div className={`
                fixed top-0 left-0 bottom-0 w-[80%] max-w-xs bg-white dark:bg-ios-dark-card z-[100] shadow-2xl transform transition-transform duration-300 ease-out border-r border-slate-100 dark:border-white/5 flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                
                {/* Header / User Info */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-ios-blue to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                            {user.name.charAt(0)}
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-black/20 rounded-full border border-slate-100 dark:border-white/5">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{user.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{user.role.replace(/_/g, ' ')}</p>
                        {user.id && <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {user.id.substring(0,8)}...</p>}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { onTabChange(tab.id); onClose(); }}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                    ${isActive 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-ios-blue' 
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-ios-blue' : 'text-slate-400'}`} />
                                <span className="flex-1 text-left">{tab.label}</span>
                                {tab.badge ? (
                                    <span className="bg-red-50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{tab.badge}</span>
                                ) : isActive && (
                                    <ChevronRight className="w-4 h-4 text-ios-blue" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 dark:border-white/5 space-y-3 bg-slate-50/50 dark:bg-black/20 safe-pb">
                    <p className="px-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
                    
                    {/* HR: Add Supervisor */}
                    {onAddSupervisor && (
                         <Button 
                            fullWidth 
                            variant="secondary" 
                            icon={Briefcase} 
                            onClick={() => { onAddSupervisor(); onClose(); }}
                        >
                            Register Site Manager
                        </Button>
                    )}

                    {/* HR/Supervisor: Add Staff */}
                    {onAddStaff && (
                         <Button 
                            fullWidth 
                            variant="primary" 
                            icon={UserPlus} 
                            onClick={() => { onAddStaff(); onClose(); }}
                            className="shadow-xl"
                        >
                            Add New Staff
                        </Button>
                    )}

                    <div className="h-px bg-slate-200 dark:bg-white/10 my-2"></div>

                    <button 
                        onClick={() => { onLogout(); onClose(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
};