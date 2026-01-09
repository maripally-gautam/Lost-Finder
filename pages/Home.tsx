import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, subscribeToItems } from '../services/db';
import { Item, GeoLocation } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Skeleton } from '../components/ui/skeleton';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// Calculate distance between two coordinates in km (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);

  // Get settings from localStorage
  const getSettings = useCallback(() => {
    const radius = parseInt(localStorage.getItem('app_search_radius') || '10');
    const showGlobal = localStorage.getItem('app_show_global') === 'true';
    const locationMode = localStorage.getItem('app_location_mode') || 'current';
    const savedLocation = localStorage.getItem('app_current_location');
    return { radius, showGlobal, locationMode, savedLocation: savedLocation ? JSON.parse(savedLocation) : null };
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    const settings = getSettings();

    // If using saved current location mode and location exists, use it
    if (settings.locationMode === 'current' && settings.savedLocation) {
      setUserLocation(settings.savedLocation);
      return settings.savedLocation;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        const permResult = await Geolocation.requestPermissions();
        if (permResult.location !== 'granted') {
          return null;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const loc: GeoLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(loc);

      // Save if using current location mode
      if (settings.locationMode === 'current') {
        localStorage.setItem('app_current_location', JSON.stringify(loc));
      }

      return loc;
    } catch (error) {
      console.error('Error getting location:', error);
      // Try browser geolocation
      return new Promise<GeoLocation | null>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc: GeoLocation = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              };
              setUserLocation(loc);
              resolve(loc);
            },
            () => resolve(null)
          );
        } else {
          resolve(null);
        }
      });
    }
  }, [getSettings]);

  // Filter items based on location and radius
  const filterItemsByLocation = useCallback((allItems: Item[], location: GeoLocation | null) => {
    const settings = getSettings();

    // If global mode, show all items
    if (settings.showGlobal || !location) {
      setFilteredItems(allItems);
      return;
    }

    // Filter by radius
    const filtered = allItems.filter(item => {
      if (!item.location?.lat || !item.location?.lng) return true; // Include items without location
      const distance = calculateDistance(
        location.lat,
        location.lng,
        item.location.lat,
        item.location.lng
      );
      return distance <= settings.radius;
    });

    setFilteredItems(filtered);
  }, [getSettings]);

  // Load items with real-time subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeData = async () => {
      setLoading(true);

      // Get user location
      const location = await getCurrentLocation();

      // Subscribe to real-time updates
      unsubscribe = subscribeToItems('lost', (updatedItems) => {
        setItems(updatedItems);
        filterItemsByLocation(updatedItems, location || userLocation);
        setLoading(false);
      });

      // Initial load if subscription doesn't fire immediately
      const initialItems = await api.items.getLostItems();
      setItems(initialItems);
      filterItemsByLocation(initialItems, location || userLocation);
      setLoading(false);
    };

    initializeData();

    // Set up live location updates if in live mode
    const settings = getSettings();
    let watchId: string | undefined;

    if (settings.locationMode === 'live' && !settings.showGlobal) {
      const startLiveTracking = async () => {
        if (Capacitor.isNativePlatform()) {
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (position, err) => {
              if (position && !err) {
                const newLoc: GeoLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                setUserLocation(newLoc);
                filterItemsByLocation(items, newLoc);
              }
            }
          );
        }
      };
      startLiveTracking();
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  // Re-filter when items or settings change
  useEffect(() => {
    if (items.length > 0 && userLocation) {
      filterItemsByLocation(items, userLocation);
    }
  }, [items, userLocation, filterItemsByLocation]);

  const handleItemClick = (item: Item) => {
    navigate(`/item/${item.id}`);
  };

  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Lost Reports</h2>
        <span className="text-xs text-slate-400">
          {getSettings().showGlobal ? 'Global' : `${getSettings().radius}km radius`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 bg-brand-800 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No lost items reported {getSettings().showGlobal ? '' : 'nearby'}.</p>
          <p className="text-sm mt-2">Try adjusting your search radius in Settings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
