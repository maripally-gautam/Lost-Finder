import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/db';
import { CATEGORIES } from '../constants';
import { ItemPriority, GeoLocation, Item } from '../types';
import { Camera, MapPin, Lock, Navigation, ChevronLeft } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const EditItem: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { itemId } = useParams<{ itemId: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [item, setItem] = useState<Item | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<ItemPriority>('Medium');
    const [privateMarks, setPrivateMarks] = useState('');
    const [image, setImage] = useState<string>('');

    // Location State
    const [location, setLocation] = useState<GeoLocation>({
        lat: 0,
        lng: 0,
        address: ''
    });
    const [locationLoading, setLocationLoading] = useState(false);

    useEffect(() => {
        loadItem();
    }, [itemId]);

    const loadItem = async () => {
        if (!itemId) return;
        setLoading(true);
        const fetchedItem = await api.items.getById(itemId);
        if (fetchedItem) {
            // Check if user owns this item
            if (fetchedItem.userId !== user?.uid) {
                alert('You can only edit your own items');
                navigate('/profile');
                return;
            }
            setItem(fetchedItem);
            setTitle(fetchedItem.title || '');
            setCategory(fetchedItem.category || CATEGORIES[0]);
            setDescription(fetchedItem.description || '');
            setPriority(fetchedItem.priority || 'Medium');
            setPrivateMarks(fetchedItem.privateDetails?.distinguishingMarks || '');
            setImage(fetchedItem.image || '');
            setLocation(fetchedItem.location || { lat: 0, lng: 0, address: '' });
        } else {
            alert('Item not found');
            navigate('/profile');
        }
        setLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getCurrentLocation = async () => {
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

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: location.address || `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
            });
        } catch (error) {
            console.error('Error getting location:', error);
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setLocation({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            address: location.address || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                        });
                    },
                    () => alert('Could not get location')
                );
            }
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !itemId || !item) return;
        setSaving(true);

        const updates: Partial<Item> = {
            title: title || `${category} Item`,
            description,
            category,
            location: {
                lat: location.lat || 0,
                lng: location.lng || 0,
                address: location.address || 'Not specified'
            },
            priority,
            image,
            privateDetails: {
                distinguishingMarks: privateMarks
            }
        };

        await api.items.update(itemId, updates);
        setSaving(false);
        navigate('/profile');
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto space-y-4">
                <Skeleton className="h-10 w-48 bg-brand-800" />
                <Skeleton className="h-40 bg-brand-800" />
                <Skeleton className="h-40 bg-brand-800" />
            </div>
        );
    }

    if (!item) {
        return <div className="text-center py-20 text-slate-400">Item not found</div>;
    }

    return (
        <div className="max-w-xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-brand-800 transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-300" />
                </button>
                <h2 className="text-2xl font-bold">Edit {item.type === 'lost' ? 'Lost' : 'Found'} Item</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card className="space-y-4 bg-brand-800 p-4 border-brand-700">
                    <div>
                        <Label className="text-slate-300">Item Title</Label>
                        <Input
                            type="text"
                            required
                            className="mt-1 bg-brand-900 border-brand-700 text-white"
                            placeholder="e.g. Blue Backpack"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Category</Label>
                        <select
                            className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm outline-none text-white"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <Label className="text-slate-300">Description</Label>
                        <Textarea
                            className="mt-1 bg-brand-900 border-brand-700 text-white min-h-24"
                            placeholder="Describe the item..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </Card>

                {/* Location */}
                <Card className="space-y-4 bg-brand-800 p-4 border-brand-700">
                    <h3 className="text-sm font-bold text-brand-400 mb-2 flex items-center gap-2">
                        <MapPin size={16} />
                        Location
                    </h3>

                    <div>
                        <Label className="text-slate-300">Address / Area</Label>
                        <Input
                            type="text"
                            className="mt-1 bg-brand-900 border-brand-700 text-white"
                            placeholder="e.g. Central Park, Main Street"
                            value={location.address}
                            onChange={e => setLocation({ ...location, address: e.target.value })}
                        />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="w-full bg-brand-900 border-brand-700 text-white hover:bg-brand-700"
                    >
                        {locationLoading ? 'Getting Location...' : (
                            <>
                                <Navigation size={16} className="mr-2" />
                                Use Current Location
                            </>
                        )}
                    </Button>

                    {location.lat !== 0 && location.lng !== 0 && (
                        <p className="text-xs text-slate-400">
                            Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                    )}
                </Card>

                {/* Priority & Privacy (for lost items) */}
                {item.type === 'lost' && (
                    <Card className="space-y-4 bg-brand-800 p-4 border-brand-700 relative overflow-hidden">
                        <Badge className="absolute top-4 right-4 bg-brand-700 border-brand-600">
                            <Lock size={14} className="text-brand-400" />
                        </Badge>
                        <h3 className="text-sm font-bold text-brand-400 mb-2">Private Verification Details</h3>

                        <div>
                            <Label className="text-slate-300">Distinguishing Marks / Contents</Label>
                            <Textarea
                                className="mt-1 bg-brand-900 border-brand-700 text-white min-h-20"
                                placeholder="Scratches, specific contents..."
                                value={privateMarks}
                                onChange={e => setPrivateMarks(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {['Low', 'Medium', 'High'].map(p => (
                                <Button
                                    key={p}
                                    type="button"
                                    variant={priority === p ? 'default' : 'outline'}
                                    onClick={() => setPriority(p as ItemPriority)}
                                    className={`text-xs font-bold ${priority === p
                                        ? 'bg-brand-600 border-brand-500'
                                        : 'bg-brand-900 border-brand-700 text-slate-400'
                                        }`}
                                >
                                    {p}
                                </Button>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Image Upload */}
                <div className="border-2 border-dashed border-brand-700 rounded-xl p-6 text-center hover:bg-brand-800/50 transition-colors relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {image ? (
                        <img src={image} alt="Preview" className="h-32 mx-auto rounded-lg object-contain" />
                    ) : (
                        <div className="flex flex-col items-center text-slate-400">
                            <Camera size={32} className="mb-2" />
                            <span className="text-sm">Tap to change photo</span>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={saving}
                    size="lg"
                    className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 shadow-lg shadow-brand-500/20"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    );
};
