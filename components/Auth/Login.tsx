import React, { useState } from 'react';
import { UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { User } from '../../types';
import { UserCircle, Lock, Building, Users, Loader2, BadgeCheck, HardHat, Briefcase } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // 3-Way Role Selector
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.HR);
  
  // HR State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Staff State (UAN)
  const [uan, setUan] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (selectedRole === UserRole.HR) {
            // HR Login: Supabase Auth + Public.Users check
            const user = await dbService.loginHR(email, password);
            onLogin(user);
        } else {
            // Staff Login: UAN check + Role determination
            const user = await dbService.loginStaff(uan);
            
            // Note: SITE_INCHARGE and EMPLOYEE roles are determined by backend logic.
            // If user selected 'Site Incharge' but is actually an 'Employee', the system logs them in as 'Employee'.
            onLogin(user);
        }
    } catch (err: any) {
        setError(err.message || "Authentication failed.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white text-center border-b border-slate-800">
          <div className="inline-flex h-12 w-12 bg-blue-600 rounded-lg items-center justify-center mb-4 shadow-lg shadow-blue-900/50 border border-blue-500">
             <span className="text-xl font-bold">KE</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 tracking-tight">Konark HR Portal</h1>
          <p className="text-slate-400 text-sm">Enterprise Resource Management</p>
        </div>
        
        <div className="p-6">
          {/* 3-Way Role Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button 
              type="button"
              onClick={() => { setSelectedRole(UserRole.HR); setError(''); }}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md font-medium text-xs transition-all ${selectedRole === UserRole.HR ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            >
                <Lock className="w-4 h-4" /> 
                <span>HR Admin</span>
            </button>
            <button 
              type="button"
              onClick={() => { setSelectedRole(UserRole.SITE_INCHARGE); setError(''); }}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md font-medium text-xs transition-all ${selectedRole === UserRole.SITE_INCHARGE ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            >
                <Briefcase className="w-4 h-4" /> 
                <span>Site Incharge</span>
            </button>
            <button 
              type="button"
              onClick={() => { setSelectedRole(UserRole.EMPLOYEE); setError(''); }}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md font-medium text-xs transition-all ${selectedRole === UserRole.EMPLOYEE ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            >
                <HardHat className="w-4 h-4" /> 
                <span>Employee</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
            {selectedRole === UserRole.HR ? (
                <>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HR Email</label>
                    <div className="relative">
                        <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                        placeholder="admin@konark.com"
                        disabled={loading}
                        />
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                        placeholder="••••••••"
                        disabled={loading}
                        />
                    </div>
                    </div>
                </>
            ) : (
                <>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {selectedRole === UserRole.SITE_INCHARGE ? 'Incharge UAN' : 'Employee UAN'} (12-Digit)
                    </label>
                    <div className="relative">
                        <BadgeCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input 
                        type="text" 
                        required
                        pattern="\d{12}"
                        title="12 Digit Numeric UAN"
                        value={uan}
                        onChange={(e) => setUan(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wider transition-colors"
                        placeholder="100000000001"
                        disabled={loading}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pl-1">
                        {selectedRole === UserRole.SITE_INCHARGE 
                            ? "Enter your UAN. System will verify Supervisor/Safety role." 
                            : "Enter your UAN to view payslips and profile."}
                    </p>
                    </div>
                </>
            )}

            {error && (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                    <span className="mt-0.5 font-bold">!</span>
                    <span>{error}</span>
                </div>
            )}
            
            <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedRole === UserRole.HR ? 'Secure Login' : 'Access Dashboard')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
             <div className="inline-flex gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><Building className="h-3 w-3" /> Konark Ent.</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Secure Access</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;