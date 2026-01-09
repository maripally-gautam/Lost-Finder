import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { findMatchesForLostItem } from '../services/geminiService';
import { notifyMatch } from '../services/notificationService';
import { CATEGORIES } from '../constants';
import { ItemPriority, GeoLocation } from '../types';
import { Camera, MapPin, Lock } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export const PostLost: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ItemPriority>('Medium');
  const [privateMarks, setPrivateMarks] = useState('');
  const [image, setImage] = useState<string>('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Mock Location
    const location: GeoLocation = {
      lat: 34.0522,
      lng: -118.2437,
      address: 'Downtown Area'
    };

    const newItemData = {
      userId: user.uid,
      type: 'lost' as const,
      title: title || `${category} Item`,
      description,
      category,
      location,
      priority,
      status: 'lost' as const,
      timestamp: Date.now(),
      image,
      privateDetails: {
        distinguishingMarks: privateMarks
      }
    };

    // Save to DB
    const newItemId = await api.items.add(newItemData);
    const newItem = { ...newItemData, id: newItemId };

    // Check for matches against existing found items
    try {
      const matches = await findMatchesForLostItem(newItem);

      // Save matches and send notifications
      for (const match of matches) {
        if (match.foundItemId && match.confidence) {
          await api.matches.create({
            lostItemId: newItemId,
            foundItemId: match.foundItemId,
            confidence: match.confidence,
            status: 'pending',
            timestamp: Date.now()
          });

          // Send notification to both users
          await notifyMatch(newItemId, match.foundItemId, match.confidence);
        }
      }
    } catch (error) {
      console.error('Error matching lost item:', error);
    }

    setLoading(false);
    navigate('/');
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Report Lost Item</h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <Card className="space-y-4 bg-brand-800 p-4 border-brand-700">
          <div>
            <Label className="text-slate-300">Item Title (Generic)</Label>
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
            <Label className="text-slate-300">Public Description</Label>
            <Textarea
              className="mt-1 bg-brand-900 border-brand-700 text-white min-h-24"
              placeholder="Describe visible features..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </Card>

        {/* Priority & Privacy */}
        <Card className="space-y-4 bg-brand-800 p-4 border-brand-700 relative overflow-hidden">
          <Badge className="absolute top-4 right-4 bg-brand-700 border-brand-600">
            <Lock size={14} className="text-brand-400" />
          </Badge>
          <h3 className="text-sm font-bold text-brand-400 mb-2">Private Verification Details</h3>
          <p className="text-xs text-slate-500 mb-4">
            This information is NEVER shown publicly. It is used by the system to verify ownership.
          </p>

          <div>
            <Label className="text-slate-300">Distinguishing Marks / Contents</Label>
            <Textarea
              className="mt-1 bg-brand-900 border-brand-700 text-white min-h-20"
              placeholder="Scratches, specific contents, lock screen image..."
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
                {p} Priority
              </Button>
            ))}
          </div>
        </Card>

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
              <span className="text-sm">Tap to upload photo</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 shadow-lg shadow-brand-500/20"
        >
          {loading ? 'Posting...' : 'Post Lost Item'}
        </Button>

      </form>
    </div>
  );
};
