import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../services/db';
import { signOutUser } from '../services/firebase';
import { Item } from '../types';
import {
    ChevronLeft,
    Mail,
    LogOut,
    User,
    Package,
    Edit2,
    Trash2,
    Search,
    MapPin
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

export const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [userItems, setUserItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

    useEffect(() => {
        loadUserItems();
    }, [user]);

    const loadUserItems = async () => {
        if (!user) return;
        setLoading(true);
        const items = await api.items.getUserItems(user.uid);
        setUserItems(items);
        setLoading(false);
    };

    const handleSignOut = async () => {
        await signOutUser();
        logout();
        navigate('/onboarding');
    };

    const handleDeleteItem = async () => {
        if (!deleteItemId) return;
        await api.items.delete(deleteItemId);
        setUserItems(prev => prev.filter(item => item.id !== deleteItemId));
        setDeleteItemId(null);
    };

    if (!user) return null;

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
                <h1 className="text-xl font-bold text-white">Profile</h1>
            </div>

            {/* User Info Card */}
            <Card className="bg-brand-800 border-brand-700 mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 bg-brand-600">
                            {user.photoURL ? (
                                <AvatarImage src={user.photoURL} alt={user.username} />
                            ) : (
                                <AvatarFallback className="bg-gradient-to-br from-brand-500 to-brand-accent text-white text-xl">
                                    {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{user.username}</h2>
                            {user.email && (
                                <div className="flex items-center gap-2 mt-1 text-slate-400">
                                    <Mail size={14} />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="bg-brand-700 text-brand-400">
                                    Trust Score: {user.trustScore}
                                </Badge>
                                {user.isVerified && (
                                    <Badge className="bg-green-500/20 text-green-400 border-0">
                                        Verified
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* My Items Section */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Package size={20} />
                    My Items
                </h3>

                {loading ? (
                    <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : userItems.length === 0 ? (
                    <Card className="bg-brand-800 border-brand-700">
                        <CardContent className="p-8 text-center">
                            <Package size={40} className="mx-auto text-slate-500 mb-3" />
                            <p className="text-slate-400">No items posted yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {userItems.map(item => (
                            <Card key={item.id} className="bg-brand-800 border-brand-700">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                    className={`text-xs ${item.type === 'lost'
                                                        ? 'bg-red-500/20 text-red-400 border-0'
                                                        : 'bg-green-500/20 text-green-400 border-0'
                                                        }`}
                                                >
                                                    {item.type === 'lost' ? (
                                                        <><Search size={10} className="mr-1" /> Lost</>
                                                    ) : (
                                                        <><MapPin size={10} className="mr-1" /> Found</>
                                                    )}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs border-brand-600 text-slate-400">
                                                    {item.category}
                                                </Badge>
                                            </div>
                                            <h4 className="text-white font-medium">{item.title}</h4>
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                                                {item.description}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                {new Date(item.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 ml-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-brand-700"
                                                onClick={() => navigate(`/edit-item/${item.id}`)}
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => setDeleteItemId(item.id)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Sign Out Button */}
            <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={handleSignOut}
            >
                <LogOut size={18} className="mr-2" />
                Sign Out
            </Button>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
                <AlertDialogContent className="bg-brand-800 border-brand-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Item</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Are you sure you want to delete this item? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-brand-700 border-brand-600 text-white hover:bg-brand-600">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={handleDeleteItem}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
