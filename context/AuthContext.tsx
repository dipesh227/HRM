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
  const [user, setUser] = useState<User | null>(() => {
    // Attempt to hydrate from localStorage on boot
    const stored = localStorage.getItem('konark_user');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [loading, setLoading] = useState<boolean>(false);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('konark_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('konark_user');
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
        // Fetch fresh profile data if needed
        if (user.role === UserRole.HR) {
            // HR profile refresh logic would go here if we had a direct endpoint
        } else {
            const fresh = await dbService.getEmployeeByUAN(user.id);
            if (fresh) {
                const updatedUser: User = {
                    ...user,
                    name: fresh.name,
                    // keep other session info
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
      {children}
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