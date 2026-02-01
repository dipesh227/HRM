import React, { useState } from 'react';
import { UserRole, User } from '../../types';
import { dbService } from '../../services/mockDb';
import { UserCircle, Lock, Building, Users, Loader2, BadgeCheck, HardHat, Briefcase, ArrowRight } from 'lucide-react';
import { InputField } from '../UI/InputField';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.HR);
  const [formData, setFormData] = useState({ email: '', password: '', uan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to update form data
  const updateForm = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (selectedRole === UserRole.HR) {
            const user = await dbService.loginHR(formData.email, formData.password);
            onLogin(user);
        } else {
            const user = await dbService.loginStaff(formData.uan);
            onLogin(user);
        }
    } catch (err: any) {
        setError(err.message || "Authentication failed.");
    } finally {
        setLoading(false);
    }
  };

  const roles = [
    { id: UserRole.HR, label: 'HR Admin', icon: Lock },
    { id: UserRole.SITE_INCHARGE, label: 'Site Manager', icon: Briefcase },
    { id: UserRole.EMPLOYEE, label: 'Employee', icon: HardHat },
  ];

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

      <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="p-8 text-center border-b border-white/5">
          <div className="inline-flex h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl items-center justify-center mb-4 shadow-lg shadow-blue-900/50 border border-white/10 transform rotate-3 hover:rotate-6 transition-transform">
             <span className="text-2xl font-bold text-white">KE</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight text-white">Welcome Back</h1>
          <p className="text-slate-300 text-sm">Sign in to Konark Enterprise Portal</p>
        </div>
        
        <div className="p-8">
          {/* Role Tabs */}
          <div className="flex p-1 bg-black/20 rounded-xl mb-8 relative">
            {roles.map((role) => {
                const Icon = role.icon;
                const isActive = selectedRole === role.id;
                return (
                    <button 
                        key={role.id}
                        type="button"
                        onClick={() => { setSelectedRole(role.id); setError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all relative z-10 ${isActive ? 'text-white bg-blue-600 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Icon className="w-3.5 h-3.5" /> 
                        {role.label}
                    </button>
                );
            })}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {selectedRole === UserRole.HR ? (
                <>
                    <InputField 
                        label="Email Address" 
                        icon={UserCircle} 
                        type="email" 
                        required 
                        placeholder="admin@konark.com"
                        value={formData.email}
                        onChange={e => updateForm('email', e.target.value)}
                        className="dark:bg-transparent"
                    />
                     <InputField 
                        label="Password" 
                        icon={Lock} 
                        type="password" 
                        required 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => updateForm('password', e.target.value)}
                        className="dark:bg-transparent"
                    />
                </>
            ) : (
                <>
                     <InputField 
                        label={selectedRole === UserRole.SITE_INCHARGE ? 'Manager UAN' : 'Employee UAN'} 
                        icon={BadgeCheck} 
                        type="text" 
                        required 
                        pattern="\d{12}"
                        placeholder="100000000001"
                        value={formData.uan}
                        onChange={e => updateForm('uan', e.target.value)}
                        className="dark:bg-transparent font-mono tracking-wider"
                    />
                    <p className="text-xs text-slate-400 mt-2 pl-1">
                        {selectedRole === UserRole.SITE_INCHARGE 
                            ? "Use your assigned Universal Account Number." 
                            : "Enter UAN to view payslips securely."}
                    </p>
                </>
            )}

            {error && (
                <div className="flex items-center gap-3 text-red-200 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 backdrop-blur-sm animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span>{error}</span>
                </div>
            )}
            
            <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-4 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {selectedRole === UserRole.HR ? 'Secure Login' : 'Access Portal'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-4 bg-black/20 border-t border-white/5 text-center">
             <div className="inline-flex gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                <span className="flex items-center gap-1.5"><Building className="h-3 w-3" /> Konark Ent.</span>
                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> 256-Bit SSL</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Login;