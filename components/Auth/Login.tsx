import React, { useState } from 'react';
import { UserRole } from '../../types';
import { dbService } from '../../services/mockDb';
import { User } from '../../types';
import { UserCircle, Lock, Building, Users, Loader2, BadgeCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'HR' | 'STAFF'>('HR');
  
  // HR State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Staff State
  const [uan, setUan] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHRLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        // HR Uses Supabase Auth
        const user = await dbService.loginHR(email, password);
        onLogin(user);
    } catch (err: any) {
        setError(err.message || "HR Authentication failed.");
    } finally {
        setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        // Staff uses UAN lookup
        const user = await dbService.loginStaff(uan);
        onLogin(user);
    } catch (err: any) {
        setError(err.message || "Invalid UAN or system error.");
    } finally {
        setLoading(false);
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
          <p className="text-slate-400 text-sm">Enterprise Resource Management</p>
        </div>
        
        <div className="p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => { setActiveTab('HR'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-md font-medium transition-all ${activeTab === 'HR' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Lock className="w-3 h-3" /> HR Admin
            </button>
            <button 
              onClick={() => { setActiveTab('STAFF'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 rounded-md font-medium transition-all ${activeTab === 'STAFF' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BadgeCheck className="w-3 h-3" /> Staff (UAN)
            </button>
          </div>

          {activeTab === 'HR' ? (
              <form onSubmit={handleHRLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HR Email</label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="admin@konark.com"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                </div>
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Secure Login'}
                </button>
              </form>
          ) : (
              <form onSubmit={handleStaffLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">12-Digit UAN</label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      pattern="\d{12}"
                      title="12 Digit Numeric UAN"
                      value={uan}
                      onChange={(e) => setUan(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      placeholder="100000000001"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 pl-1">Enter your Universal Account Number for access.</p>
                </div>
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Access Dashboard'}
                </button>
              </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <div className="inline-flex gap-4 text-xs text-slate-400">
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