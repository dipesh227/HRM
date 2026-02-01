import React, { useState } from 'react';
import { UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { User } from '../../types';
import { UserCircle, Lock, Building, Users, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.HR);
  const [identifier, setIdentifier] = useState('hr@konark.com');
  const [password, setPassword] = useState('123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // dbService.login now throws specific errors for User Not Found / Bad Password
      const user = await dbService.login(identifier, password);
      
      // Client-side Role Mismatch Check
      if (user.role !== role) {
         const requiredRole = role === UserRole.HR ? 'HR Admin' : role === UserRole.SITE_INCHARGE ? 'Site Incharge' : 'Employee';
         const actualRole = user.role === UserRole.HR ? 'HR Admin' : user.role === UserRole.SITE_INCHARGE ? 'Site Incharge' : 'Employee';
         throw new Error(`Access Denied: This account is registered as ${actualRole}, but you are trying to login as ${requiredRole}.`);
      }

      onLogin(user);
    } catch (err: any) {
      // Display the specific error message from DB or Logic
      setError(err.message || 'Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const preset = (r: UserRole) => {
    setRole(r);
    setError('');
    if (r === UserRole.HR) {
      setIdentifier('hr@konark.com');
      setPassword('123');
    } else if (r === UserRole.SITE_INCHARGE) {
      setIdentifier('INC001');
      setPassword('123');
    } else {
      setIdentifier('EMP100');
      setPassword(''); // No password for emp demo
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="inline-flex h-12 w-12 bg-blue-600 rounded-lg items-center justify-center mb-4 shadow-lg shadow-blue-900/50 border border-blue-500">
             <span className="text-xl font-bold">KE</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 tracking-tight">Konark HR Portal</h1>
          <p className="text-slate-400 text-sm">Konark Enterprises Pvt. Ltd.</p>
        </div>
        
        <div className="p-6">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => preset(UserRole.HR)}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${role === UserRole.HR ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >HR Admin</button>
            <button 
              onClick={() => preset(UserRole.SITE_INCHARGE)}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${role === UserRole.SITE_INCHARGE ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >Incharge</button>
            <button 
              onClick={() => preset(UserRole.EMPLOYEE)}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${role === UserRole.EMPLOYEE ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >Staff</button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {role === UserRole.HR ? 'Email Address' : 'UAN / Login ID'}
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder={role === UserRole.HR ? "admin@konark.com" : "Enter ID"}
                  disabled={loading}
                />
              </div>
            </div>

            {role !== UserRole.EMPLOYEE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                {error}
            </div>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-slate-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                   <Building className="h-4 w-4 text-slate-400" />
                   <span>Multi-Company</span>
                </div>
                <div className="flex items-center gap-2">
                   <Users className="h-4 w-4 text-slate-400" />
                   <span>Role-Based Access</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;