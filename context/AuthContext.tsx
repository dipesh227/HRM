import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { dbService } from '../services/mockDb';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // HARD RESET INITIALIZATION
    const initAuth = () => {
        try {
            const stored = localStorage.getItem('konark_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Basic validation of stored session
                if (parsed && parsed.id && parsed.role && parsed.name) {
                    setUser(parsed);
                } else {
                    console.warn("Invalid session detected. Clearing.");
                    localStorage.removeItem('konark_user');
                }
            }
        } catch (e) {
            console.error("Session corruption detected. Performing hard reset.", e);
            localStorage.clear(); // Nuclear option to fix "white screen" issues
        } finally {
            setLoading(false);
        }
    };
    initAuth();
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('konark_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.clear(); // Ensure complete cleanup
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
        if (user.role === UserRole.HR) {
            // HR refresh logic placeholder
        } else {
            const fresh = await dbService.getEmployeeByUAN(user.id);
            if (fresh) {
                const updatedUser: User = {
                    ...user,
                    name: fresh.name,
                    companyId: fresh.companyId,
                    siteId: fresh.siteId
                };
                login(updatedUser);
            }
        }
    } catch (e) {
        console.error("Failed to refresh profile", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};