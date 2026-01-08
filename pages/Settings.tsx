import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, ChevronLeft, Shield } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Card, CardContent } from '../components/ui/card';

export const Settings: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('app_notifications');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('app_theme');
        return saved !== null ? saved === 'dark' : true;
    });

    useEffect(() => {
        localStorage.setItem('app_notifications', JSON.stringify(notifications));
    }, [notifications]);

    useEffect(() => {
        localStorage.setItem('app_theme', darkMode ? 'dark' : 'light');
        // Apply theme to document
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-brand-800 transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-300" />
                </button>
                <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>

            <div className="space-y-4">
                {/* Notifications */}
                <Card className="bg-brand-800 border-brand-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center">
                                    <Bell size={20} className="text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Notifications</p>
                                    <p className="text-sm text-slate-400">Receive push notifications</p>
                                </div>
                            </div>
                            <Switch
                                checked={notifications}
                                onCheckedChange={setNotifications}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Theme */}
                <Card className="bg-brand-800 border-brand-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center">
                                    {darkMode ? (
                                        <Moon size={20} className="text-brand-400" />
                                    ) : (
                                        <Sun size={20} className="text-yellow-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-medium">Dark Mode</p>
                                    <p className="text-sm text-slate-400">{darkMode ? 'Dark theme enabled' : 'Light theme enabled'}</p>
                                </div>
                            </div>
                            <Switch
                                checked={darkMode}
                                onCheckedChange={setDarkMode}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* App Info */}
                <Card className="bg-brand-800 border-brand-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center">
                                <Shield size={20} className="text-brand-accent" />
                            </div>
                            <div>
                                <p className="text-white font-medium">LostLink AI</p>
                                <p className="text-sm text-slate-400">Version 1.0.0</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
