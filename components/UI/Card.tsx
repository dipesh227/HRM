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
    <div className={`bg-white dark:bg-ios-dark-card rounded-3xl shadow-ios dark:shadow-none border border-white/50 dark:border-white/5 overflow-hidden transition-all duration-300 ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-50 dark:border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
          <div>
            {title && <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-3 items-center self-start sm:self-auto">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6 md:p-8'}>
        {children}
      </div>
    </div>
  );
};