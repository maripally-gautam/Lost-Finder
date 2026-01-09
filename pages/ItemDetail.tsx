import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/db';
import { Item, UserProfile } from '../types';
import { MapPin, Clock, ChevronLeft, Edit2, User, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export const ItemDetail: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { itemId } = useParams<{ itemId: string }>();
    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState<Item | null>(null);
    const [owner, setOwner] = useState<UserProfile | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        loadItem();
    }, [itemId]);

    const loadItem = async () => {
        if (!itemId) return;
        setLoading(true);

        const fetchedItem = await api.items.getById(itemId);
        if (fetchedItem) {
            setItem(fetchedItem);
            setIsOwner(fetchedItem.userId === user?.uid);

            // Load owner info
            const ownerProfile = await api.users.get(fetchedItem.userId);
            setOwner(ownerProfile);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto space-y-4">
                <Skeleton className="h-10 w-48 bg-brand-800" />
                <Skeleton className="h-64 bg-brand-800" />
                <Skeleton className="h-40 bg-brand-800" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Item not found</p>
                <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-brand-800 transition-colors"
                    >
                        <ChevronLeft size={24} className="text-slate-300" />
                    </button>
                    <h2 className="text-xl font-bold">Item Details</h2>
                </div>
                {isOwner && (
                    <Button
                        onClick={() => navigate(`/edit-item/${item.id}`)}
                        variant="outline"
                        size="sm"
                        className="bg-brand-800 border-brand-700"
                    >
                        <Edit2 size={16} className="mr-2" />
                        Edit
                    </Button>
                )}
            </div>

            {/* Image */}
            {item.image && (
                <div className="mb-6 rounded-xl overflow-hidden">
                    <img
                        src={item.image}
                        alt={item.title}
                        className={`w-full h-64 object-cover ${!isOwner ? 'blur-sm' : ''}`}
                    />
                    {!isOwner && (
                        <p className="text-center text-xs text-slate-400 mt-2">
                            Image blurred for privacy. Contact the owner if this is your item.
                        </p>
                    )}
                </div>
            )}

            {/* Main Info */}
            <Card className="bg-brand-800 border-brand-700 mb-6">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Badge
                                className={`mb-2 ${item.type === 'lost'
                                    ? 'bg-red-500/20 text-red-400 border-0'
                                    : 'bg-green-500/20 text-green-400 border-0'
                                    }`}
                            >
                                {item.type === 'lost' ? 'Lost' : 'Found'}
                            </Badge>
                            <h1 className="text-2xl font-bold text-white">{item.title}</h1>
                        </div>
                        <Badge variant="secondary" className="bg-brand-700">
                            {item.category}
                        </Badge>
                    </div>

                    <p className="text-slate-300 mb-4">{item.description}</p>

                    <div className="space-y-2">
                        <div className="flex items-center text-sm text-slate-400">
                            <MapPin size={16} className="mr-2 text-brand-500" />
                            <span>{item.location?.address || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center text-sm text-slate-400">
                            <Clock size={16} className="mr-2" />
                            <span>{formatDistanceToNow(item.timestamp)} ago</span>
                        </div>
                    </div>

                    {item.priority && (
                        <Badge
                            className={`mt-4 ${item.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                                item.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}
                        >
                            {item.priority} Priority
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* Private Details (only for owner) */}
            {isOwner && item.privateDetails?.distinguishingMarks && (
                <Card className="bg-brand-800 border-brand-700 mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield size={16} className="text-brand-400" />
                            <h3 className="font-semibold text-brand-400">Private Details</h3>
                        </div>
                        <p className="text-slate-300 text-sm">{item.privateDetails.distinguishingMarks}</p>
                    </CardContent>
                </Card>
            )}

            {/* Owner Info (only for non-owners) */}
            {!isOwner && owner && (
                <Card className="bg-brand-800 border-brand-700 mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 bg-brand-600">
                                {owner.photoURL ? (
                                    <AvatarImage src={owner.photoURL} alt={owner.username} />
                                ) : (
                                    <AvatarFallback className="bg-gradient-to-br from-brand-500 to-brand-accent text-white">
                                        {owner.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium text-white">{owner.username}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="bg-brand-700 text-xs">
                                        Trust: {owner.trustScore}%
                                    </Badge>
                                    {owner.isVerified && (
                                        <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            {isOwner ? (
                <div className="space-y-3">
                    <Button
                        onClick={() => navigate(`/edit-item/${item.id}`)}
                        className="w-full bg-brand-500 hover:bg-brand-400"
                    >
                        <Edit2 size={16} className="mr-2" />
                        Edit Item
                    </Button>
                </div>
            ) : (
                <p className="text-center text-sm text-slate-400">
                    If this is your item, please report it as lost to get matched.
                </p>
            )}
        </div>
    );
};
