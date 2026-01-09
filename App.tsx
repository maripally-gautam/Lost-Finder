import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PostLost } from './pages/PostLost';
import { PostFound } from './pages/PostFound';
import { Matches } from './pages/Matches';
import { Chat } from './pages/Chat';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { UserProfile } from './types';
import { api } from './services/db';

export const AuthContext = React.createContext<{
  user: UserProfile | null;
  login: (u: UserProfile) => void;
  logout: () => void;
}>({ user: null, login: () => { }, logout: () => { } });

// Simple protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
      <Route path="/post-lost" element={<ProtectedRoute><Layout><PostLost /></Layout></ProtectedRoute>} />
      <Route path="/post-found" element={<ProtectedRoute><Layout><PostFound /></Layout></ProtectedRoute>} />
      <Route path="/matches" element={<ProtectedRoute><Layout><Matches /></Layout></ProtectedRoute>} />
      <Route path="/chat/:matchId" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check local storage for session
    const storedUid = localStorage.getItem('fg_uid');
    if (storedUid) {
      api.users.get(storedUid).then(u => {
        if (u) setUser(u);
      });
    }

    // Apply saved theme
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, []);

  const login = (u: UserProfile) => {
    localStorage.setItem('fg_uid', u.uid);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('fg_uid');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthContext.Provider>
  );
}