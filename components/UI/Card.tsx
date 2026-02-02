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
    <div className={`bg-white dark:bg-ios-dark-card rounded-2xl md:rounded-3xl shadow-ios dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-300 ${className}`}>
      {(title || actions) && (
        <div className="px-4 py-3.5 md:px-6 md:py-5 border-b border-slate-50 dark:border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
          <div>
            {title && <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white tracking-tight leading-snug">{title}</h3>}
            {subtitle && <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2 items-center self-start sm:self-auto">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 md:p-6'}>
        {children}
      </div>
    </div>
  );
};