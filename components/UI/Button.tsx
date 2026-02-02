import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', isLoading, icon: Icon, className = '', disabled, fullWidth = false, ...props 
}) => {
  // Added active:scale-[0.98] for mobile touch feedback
  const baseStyles = "relative font-bold transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] tracking-tight touch-manipulation";
  const widthClass = fullWidth ? 'w-full' : '';
  const roundedClass = "rounded-2xl"; 
  
  const variants = {
    primary: "bg-ios-blue text-white hover:bg-blue-600 hover:shadow-glow shadow-lg shadow-blue-500/20 border border-transparent",
    secondary: "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-transparent hover:bg-slate-200 dark:hover:bg-white/20",
    danger: "bg-red-50 text-ios-red border border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 bg-transparent",
    ghost: "text-ios-blue hover:bg-blue-50 dark:hover:bg-blue-500/10",
    glass: "bg-white/20 dark:bg-black/20 backdrop-blur-lg border border-white/30 text-white shadow-lg"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs min-h-[36px]",
    md: "px-6 py-3.5 text-sm min-h-[48px]", // Comfortable touch target (48px standard)
    lg: "px-8 py-4.5 text-base min-h-[56px]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${roundedClass} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : Icon && <Icon className="w-5 h-5 shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
};