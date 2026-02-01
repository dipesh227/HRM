import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Content - Bottom Sheet on Mobile, Modal on Desktop */}
      <div className={`
        relative w-full ${maxWidth} 
        bg-white dark:bg-ios-dark-card 
        rounded-t-3xl sm:rounded-3xl 
        shadow-2xl shadow-black/20 
        flex flex-col 
        max-h-[85vh] sm:max-h-[90vh]
        animate-slide-up sm:animate-fade-in-up
        border-t border-white/20 sm:border border-slate-200 dark:border-slate-800
      `}>
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          <h3 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 md:p-6 safe-pb">
          {children}
        </div>
      </div>
    </div>
  );
};