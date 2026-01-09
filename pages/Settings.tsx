import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, ChevronLeft, MapPin, Globe, Navigation } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Card, CardContent } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { GeoLocation } from '../types';

export const Settings: React.FC = () => {
    const navigate = useNavigate();

    // Notification settings
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('app_notifications');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Theme settings
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('app_theme');
        return saved !== null ? saved === 'dark' : true;
    });

    // Radius settings
    const [searchRadius, setSearchRadius] = useState(() => {
        const saved = localStorage.getItem('app_search_radius');
        return saved !== null ? parseInt(saved) : 10;
    });

    // Global toggle
    const [showGlobal, setShowGlobal] = useState(() => {
        const saved = localStorage.getItem('app_show_global');
        return saved === 'true';
    });

    // Location mode (current vs live)
    const [locationMode, setLocationMode] = useState<'current' | 'live'>(() => {
        const saved = localStorage.getItem('app_location_mode');
        return (saved as 'current' | 'live') || 'current';
    });

    const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(() => {
        const saved = localStorage.getItem('app_current_location');
        return saved ? JSON.parse(saved) : null;
    });

    const [locationLoading, setLocationLoading] = useState(false);

    // Save notifications setting
    useEffect(() => {
        localStorage.setItem('app_notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Save and apply theme
    useEffect(() => {
        localStorage.setItem('app_theme', darkMode ? 'dark' : 'light');
        if (darkMode) {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
            document.body.classList.add('light');
        }
    }, [darkMode]);

    // Save radius setting
    useEffect(() => {
        localStorage.setItem('app_search_radius', searchRadius.toString());
    }, [searchRadius]);

    // Save global setting
    useEffect(() => {
        localStorage.setItem('app_show_global', showGlobal.toString());
    }, [showGlobal]);

    // Save location mode
    useEffect(() => {
        localStorage.setItem('app_location_mode', locationMode);
    }, [locationMode]);

    // Update current location
    const updateCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            if (Capacitor.isNativePlatform()) {
                const permResult = await Geolocation.requestPermissions();
                if (permResult.location !== 'granted') {
                    alert('Location permission is required');
                    setLocationLoading(false);
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });

            const loc: GeoLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
            };

            setCurrentLocation(loc);
            localStorage.setItem('app_current_location', JSON.stringify(loc));
        } catch (error) {
            console.error('Error getting location:', error);
            // Fallback to browser geolocation
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const loc: GeoLocation = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                        };
                        setCurrentLocation(loc);
                        localStorage.setItem('app_current_location', JSON.stringify(loc));
                    },
                    () => alert('Could not get current location')
                );
            }
        } finally {
            setLocationLoading(false);
        }
    };

    const handleLocationModeChange = async (isLive: boolean) => {
        const newMode = isLive ? 'live' : 'current';

        // Request location permission when switching modes
        if (Capacitor.isNativePlatform()) {
            const permResult = await Geolocation.requestPermissions();
            if (permResult.location !== 'granted') {
                alert('Location permission is required for this feature');
                return;
            }
        }

        setLocationMode(newMode);

        if (!isLive) {
            // Update current location when switching to 'current' mode
            await updateCurrentLocation();
        }
    };

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
                                    <p className="text-sm text-slate-400">{darkMode ? 'Dark theme' : 'Light theme'}</p>
                                </div>
                            </div>
                            <Switch
                                checked={darkMode}
                                onCheckedChange={setDarkMode}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Search Radius */}
                <Card className="bg-brand-800 border-brand-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center">
                                <MapPin size={20} className="text-brand-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">Search Radius</p>
                                <p className="text-sm text-slate-400">
                                    {showGlobal ? 'Global (all items)' : `${searchRadius} km`}
                                </p>
                            </div>
                        </div>

                        {!showGlobal && (
                            <div className="px-2 mb-4">
                                <Slider
                                    value={[searchRadius]}
                                    onValueChange={(value) => setSearchRadius(value[0])}
                                    min={1}
                                    max={20}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>1 km</span>
                                    <span>20 km</span>
                                </div>
                            </div>
                        )}

                        <Button
                            variant={showGlobal ? 'default' : 'outline'}
                            onClick={() => setShowGlobal(!showGlobal)}
                            className={`w-full ${showGlobal
                                ? 'bg-brand-500 hover:bg-brand-400'
                                : 'bg-brand-900 border-brand-700 hover:bg-brand-700'}`}
                        >
                            <Globe size={16} className="mr-2" />
                            {showGlobal ? 'Global Mode Active' : 'Show Global'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Location Mode */}
                <Card className="bg-brand-800 border-brand-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center">
                                <Navigation size={20} className="text-brand-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">Location Mode</p>
                                <p className="text-sm text-slate-400">
                                    {locationMode === 'live' ? 'Live tracking' : 'Fixed location'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-brand-900 rounded-lg">
                                <div>
                                    <p className="text-sm text-white">Use Current Location</p>
                                    <p className="text-xs text-slate-400">Save and use your current position</p>
                                </div>
                                <Switch
                                    checked={locationMode === 'current'}
                                    onCheckedChange={(checked) => handleLocationModeChange(!checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-brand-900 rounded-lg">
                                <div>
                                    <p className="text-sm text-white">Share Live Location</p>
                                    <p className="text-xs text-slate-400">Update items based on movement</p>
                                </div>
                                <Switch
                                    checked={locationMode === 'live'}
                                    onCheckedChange={(checked) => handleLocationModeChange(checked)}
                                />
                            </div>

                            {locationMode === 'current' && (
                                <div className="pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={updateCurrentLocation}
                                        disabled={locationLoading}
                                        className="w-full bg-brand-900 border-brand-700 hover:bg-brand-700"
                                    >
                                        {locationLoading ? 'Getting Location...' : 'Update Current Location'}
                                    </Button>
                                    {currentLocation && (
                                        <p className="text-xs text-slate-500 mt-2 text-center">
                                            Saved: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
