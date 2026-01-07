import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { CATEGORIES } from '../constants';
import { ItemPriority, GeoLocation } from '../types';
import { Camera, MapPin, Lock } from 'lucide-react';

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

    await api.items.add({
      userId: user.uid,
      type: 'lost',
      title: title || `${category} Item`,
      description,
      category,
      location,
      priority,
      status: 'lost',
      timestamp: Date.now(),
      image,
      privateDetails: {
        distinguishingMarks: privateMarks
      }
    });

    setLoading(false);
    navigate('/');
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Report Lost Item</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="space-y-4 bg-brand-800 p-4 rounded-xl border border-brand-700">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Item Title (Generic)</span>
            <input 
              type="text"
              required
              className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g. Blue Backpack"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <select 
              className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm outline-none"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="block">
             <span className="text-sm font-medium text-slate-300">Public Description</span>
             <textarea 
               className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm outline-none h-24"
               placeholder="Describe visible features..."
               value={description}
               onChange={e => setDescription(e.target.value)}
             />
          </label>
        </div>

        {/* Priority & Privacy */}
        <div className="space-y-4 bg-brand-800 p-4 rounded-xl border border-brand-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-brand-700 rounded-bl-xl">
            <Lock size={14} className="text-brand-400" />
          </div>
          <h3 className="text-sm font-bold text-brand-400 mb-2">Private Verification Details</h3>
          <p className="text-xs text-slate-500 mb-4">
            This information is NEVER shown publicly. It is used by the system to verify ownership.
          </p>

          <label className="block">
             <span className="text-sm font-medium text-slate-300">Distinguishing Marks / Contents</span>
             <textarea 
               className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm outline-none h-20"
               placeholder="Scratches, specific contents, lock screen image..."
               value={privateMarks}
               onChange={e => setPrivateMarks(e.target.value)}
             />
          </label>

           <div className="grid grid-cols-3 gap-2 mt-4">
            {['Low', 'Medium', 'High'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p as ItemPriority)}
                className={`py-2 text-xs font-bold rounded-lg border ${
                  priority === p 
                  ? 'bg-brand-600 border-brand-500 text-white' 
                  : 'bg-brand-900 border-brand-700 text-slate-400'
                }`}
              >
                {p} Priority
              </button>
            ))}
          </div>
        </div>

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
        <button 
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Lost Item'}
        </button>

      </form>
    </div>
  );
};
