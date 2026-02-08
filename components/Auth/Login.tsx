import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/mockDb';
import { UserRole } from '../../types';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { 
  Building2, Lock, User, ShieldCheck, ArrowRight, 
  Briefcase, Users, LayoutDashboard, Loader2 
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roleMode, setRoleMode] = useState<'HR' | 'STAFF'>('HR');
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uan, setUan] = useState('');
  
  // Branding State
  const [companyName, setCompanyName] = useState('Konark HR');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
        navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Fetch Company Name on Mount
  useEffect(() => {
     const init = async () => {
         try {
             const c = await dbService.getCompanyDetails('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
             if (c) setCompanyName(c.name);
         } catch(e) {}
     };
     init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        let authUser;
        
        if (roleMode === 'HR') {
            if (!email || !password) throw new Error("Please enter email and password.");
            authUser = await dbService.loginHR(email, password);
        } else {
            if (!uan || uan.length !== 12) throw new Error("Please enter a valid 12-digit UAN.");
            authUser = await dbService.loginStaff(uan);
        }

        if (authUser) {
            login(authUser);
            // Navigation handled by App.tsx useEffect or protected route
        }
    } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || "Authentication failed. Please try again.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* Header Branding */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
                    <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{companyName}</h1>
                <p className="text-blue-100 text-sm font-medium mt-1">Secure Management Portal</p>
            </div>
        </div>

        {/* Role Toggles */}
        <div className="flex p-2 gap-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <button 
                type="button"
                onClick={() => { setRoleMode('HR'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${roleMode === 'HR' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Lock className="w-4 h-4" /> HR Admin
            </button>
            <button 
                type="button"
                onClick={() => { setRoleMode('STAFF'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${roleMode === 'STAFF' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Users className="w-4 h-4" /> Staff / Site
            </button>
        </div>

        {/* Login Form */}
        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                
                {roleMode === 'HR' ? (
                    <div className="space-y-4 animate-fade-in">
                        <InputField 
                            label="Corporate Email"
                            type="email"
                            placeholder="admin@company.com"
                            icon={User}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <InputField 
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300">Staff Access</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                    Enter your 12-digit UAN number found on your ID card or payslip.
                                </p>
                            </div>
                        </div>
                        <InputField 
                            label="Universal Account Number (UAN)"
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="0000 0000 0000"
                            icon={ShieldCheck}
                            value={uan}
                            onChange={(e) => setUan(e.target.value.replace(/\D/g, ''))}
                            className="font-mono tracking-widest text-lg"
                            required
                        />
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl flex items-center gap-2 animate-slide-up">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}

                <Button 
                    type="submit" 
                    variant="primary" 
                    fullWidth 
                    size="lg" 
                    isLoading={loading}
                    className="shadow-xl shadow-blue-500/20"
                >
                    {loading ? 'Authenticating...' : 'Secure Login'}
                    {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> End-to-End Encrypted Session
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;