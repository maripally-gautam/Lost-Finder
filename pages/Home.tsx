import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Item } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Filter } from 'lucide-react';

export const Home: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRadius, setFilterRadius] = useState<string>('Global');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await api.items.getLostItems();
    setItems(data);
    setLoading(false);
  };

  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Lost Reports</h2>
        
        <div className="flex items-center space-x-2 bg-brand-800 rounded-lg p-1 border border-brand-700">
          {['2km', '10km', 'Global'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRadius(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterRadius === r ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
          <div className="px-2 text-slate-500">
            <Filter size={14} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
           {[1, 2, 3].map(i => (
             <div key={i} className="h-32 bg-brand-800 rounded-xl animate-pulse" />
           ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No lost items reported nearby.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
