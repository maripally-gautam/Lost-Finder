import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { findPotentialMatches } from '../services/geminiService';
import { CATEGORIES } from '../constants';
import { GeoLocation } from '../types';
import { Camera, Sparkles, AlertTriangle } from 'lucide-react';

export const PostFound: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
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

  const handlePostAndMatch = async () => {
    if (!user) return;
    setIsAnalyzing(true);

    // 1. Create Found Item Object
    const newItemData = {
      userId: user.uid,
      type: 'found' as const,
      title: `Found ${category}`,
      description,
      category,
      location: { lat: 34.0522, lng: -118.2437, address: 'Near Park' } as GeoLocation, // Mock
      priority: 'Medium' as const,
      status: 'found' as const,
      timestamp: Date.now(),
      image,
    };

    // 2. Save to DB
    const newItemId = await api.items.add(newItemData);
    const newItem = { ...newItemData, id: newItemId };

    // 3. Trigger AI Matching
    try {
      const matches = await findPotentialMatches(newItem);
      
      // 4. Save Matches
      for (const match of matches) {
        if (match.lostItemId && match.confidence) {
          await api.matches.create({
            lostItemId: match.lostItemId,
            foundItemId: newItemId,
            confidence: match.confidence,
            status: 'pending',
            timestamp: Date.now()
          });
        }
      }

      // 5. Redirect
      navigate('/matches');
      
    } catch (e) {
      console.error(e);
      // Even if AI fails, we posted the item
      navigate('/');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start space-x-3">
        <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
        <div>
          <h3 className="font-bold text-yellow-500 text-sm">Strictly Private</h3>
          <p className="text-xs text-yellow-200/80 mt-1">
            This item will NOT be shown on the public feed. It is only visible to our AI to find a match.
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Report Found Item</h2>

      <div className="space-y-6">
        <div className="space-y-4 bg-brand-800 p-4 rounded-xl border border-brand-700">
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
             <span className="text-sm font-medium text-slate-300">Description</span>
             <textarea 
               className="mt-1 w-full bg-brand-900 border border-brand-700 rounded-lg p-3 text-sm outline-none h-24"
               placeholder="Describe the item clearly..."
               value={description}
               onChange={e => setDescription(e.target.value)}
             />
          </label>
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
              <span className="text-sm">Upload Photo (Required for AI)</span>
            </div>
          )}
        </div>

        <button 
          onClick={handlePostAndMatch}
          disabled={isAnalyzing || !description}
          className="w-full bg-gradient-to-r from-brand-500 to-brand-accent text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Matches...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Post & Find Owner</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
