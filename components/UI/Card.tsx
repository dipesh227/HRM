import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, actions, noPadding = false }) => {
  return (
    <div className={`bg-white dark:bg-ios-dark-card rounded-2xl md:rounded-3xl shadow-ios border border-slate-100 dark:border-slate-800/50 overflow-hidden transition-all duration-300 ${className}`}>
      {(title || actions) && (
        <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
          <div>
            {title && <h3 className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2 items-center">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5 md:p-6'}>
        {children}
      </div>
    </div>
  );
};