import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, APP_NAME } from '../constants';
import { Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from './ui/avatar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-900 text-slate-100 pb-20 md:pb-0">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-brand-800/80 backdrop-blur-md border-b border-brand-700 z-50 flex items-center justify-between px-4 md:px-8">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-brand-accent bg-clip-text text-transparent">
          {APP_NAME}
        </h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-brand-700 transition-colors"
          >
            <Settings size={20} className="text-slate-300" />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <Avatar className="w-8 h-8 bg-brand-600 hover:ring-2 hover:ring-brand-500 transition-all">
              <AvatarFallback className="bg-brand-600 text-white">
                <User size={16} />
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-2xl mx-auto min-h-screen">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-brand-800 border-t border-brand-700 z-50 md:hidden flex justify-around items-center px-2 safe-area-bottom">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-400' : 'text-slate-500'}`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
