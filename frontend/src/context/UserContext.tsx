import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { api, tokenStorage } from '../services/api';

interface UserContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load current user profile from token on mount
  const loadProfile = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) {
      setCurrentUser(null);
      setIsLoadingUser(false);
      return;
    }

    try {
      const profile = await api.getMe();
      setCurrentUser(profile);
    } catch {
      // Token is expired or invalid
      tokenStorage.clear();
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setCurrentUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password);
    setCurrentUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoadingUser,
        login,
        register,
        logout,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
