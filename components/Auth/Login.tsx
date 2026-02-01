import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../../types';
import { dbService } from '../../services/mockDb';
import { UserCircle, Lock, Building, Users, Loader2, BadgeCheck, HardHat, Briefcase, ArrowRight } from 'lucide-react';
import { InputField } from '../UI/InputField';
import { Button } from '../UI/Button';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.HR);
  const [formData, setFormData] = useState({ email: '', password: '', uan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultLogo, setDefaultLogo] = useState<string | null>(null);

  // Default Company ID for the system (Used to fetch branding on login screen)
  const DEFAULT_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  useEffect(() => {
    const fetchBranding = async () => {
        try {
            const comp = await dbService.getCompanyDetails(DEFAULT_COMPANY_ID);
            if (comp?.logoUrl) setDefaultLogo(comp.logoUrl);
        } catch (e) {
            console.warn("Could not fetch login branding", e);
        }
    };
    fetchBranding();
  }, []);

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
    { id: UserRole.SITE_INCHARGE, label: 'Manager', icon: Briefcase },
    { id: UserRole.EMPLOYEE, label: 'Staff', icon: HardHat },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[440px] relative z-10 perspective-1000">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
          
          {/* Header */}
          <div className="pt-10 pb-8 px-8 text-center relative">
            {defaultLogo ? (
                <div className="inline-flex h-20 w-20 rounded-2xl items-center justify-center mb-6 shadow-glow shadow-blue-500/30 ring-4 ring-white/10 overflow-hidden bg-white">
                    <img src={defaultLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                </div>
            ) : (
                <div className="inline-flex h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl items-center justify-center mb-6 shadow-glow shadow-blue-500/30 ring-4 ring-white/10">
                   <span className="text-2xl font-bold text-white tracking-tighter">KE</span>
                </div>
            )}
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 font-medium">Sign in to Konark Enterprise Portal</p>
          </div>
          
          <div className="px-8 pb-10">
            {/* Role Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/20 rounded-2xl mb-8 border border-white/5">
              {roles.map((role) => {
                  const Icon = role.icon;
                  const isActive = selectedRole === role.id;
                  return (
                      <button 
                          key={role.id}
                          type="button"
                          onClick={() => { setSelectedRole(role.id); setError(''); }}
                          className={`
                            flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all duration-300
                            ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                          `}
                      >
                          <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'} transition-transform`} /> 
                          {role.label}
                      </button>
                  );
              })}
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {selectedRole === UserRole.HR ? (
                  <div className="space-y-5">
                      <InputField 
                          label="Work Email" 
                          icon={UserCircle} 
                          type="email" 
                          required 
                          placeholder="admin@konark.com"
                          value={formData.email}
                          onChange={e => updateForm('email', e.target.value)}
                          className="text-white"
                      />
                       <InputField 
                          label="Password" 
                          icon={Lock} 
                          type="password" 
                          required 
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => updateForm('password', e.target.value)}
                          className="text-white"
                      />
                  </div>
              ) : (
                  <div className="space-y-5 animate-fade-in">
                       <InputField 
                          label={selectedRole === UserRole.SITE_INCHARGE ? 'Manager UAN' : 'Employee UAN'} 
                          icon={BadgeCheck} 
                          type="tel" // Opens numeric keypad on mobile
                          required 
                          pattern="\d*"
                          maxLength={12}
                          placeholder="1000 0000 0001"
                          value={formData.uan}
                          onChange={e => updateForm('uan', e.target.value)}
                          className="text-white font-mono tracking-widest text-lg"
                      />
                      <p className="text-xs text-slate-400/80 font-medium text-center bg-white/5 py-3 rounded-xl border border-white/5">
                          {selectedRole === UserRole.SITE_INCHARGE 
                              ? "Please enter your 12-digit Manager ID" 
                              : "Enter your 12-digit UAN from your ID card"}
                      </p>
                  </div>
              )}

              {error && (
                  <div className="flex items-center gap-3 text-red-200 text-sm font-medium bg-red-500/20 p-4 rounded-2xl border border-red-500/20 animate-slide-up">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                      <span>{error}</span>
                  </div>
              )}
              
              <Button 
                type="submit" 
                variant="primary" 
                fullWidth 
                size="lg" 
                isLoading={loading}
                className="mt-4 shadow-glow"
              >
                  {selectedRole === UserRole.HR ? 'Verify & Login' : 'Access Dashboard'}
                  {!loading && <ArrowRight className="w-5 h-5 ml-1" />}
              </Button>
            </form>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-5 bg-black/30 border-t border-white/5 text-center backdrop-blur-md">
               <div className="inline-flex items-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  <span className="flex items-center gap-1.5"><Building className="h-3 w-3" /> Konark Ent.</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> Secure Access</span>
               </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;