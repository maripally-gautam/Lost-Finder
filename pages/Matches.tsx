import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import { api } from '../services/db';
import { Match, Item } from '../types';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';

export const Matches: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState<(Match & { lostItem?: Item, foundItem?: Item })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMatches();
    }
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;
    setLoading(true);
    const userMatches = await api.matches.getUserMatches(user.uid);
    
    // Enrich with item details
    const enriched = await Promise.all(userMatches.map(async (m) => {
      const lostItem = await api.items.getById(m.lostItemId);
      const foundItem = await api.items.getById(m.foundItemId);
      return { ...m, lostItem, foundItem };
    }));

    setMatches(enriched);
    setLoading(false);
  };

  return (
    <div className="pb-10">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <span className="bg-brand-500 w-2 h-6 rounded-r mr-3"></span>
        AI Matches
      </h2>

      {loading ? (
        <div className="animate-pulse space-y-4">
           {[1,2].map(k => <div key={k} className="h-40 bg-brand-800 rounded-xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-brand-800/30 rounded-xl border border-dashed border-brand-700">
          <p>No matches found yet.</p>
          <p className="text-sm mt-2">We will notify you when our AI finds something.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="bg-brand-800 rounded-xl border border-brand-700 overflow-hidden">
              <div className="p-4 border-b border-brand-700 flex justify-between items-center bg-brand-800/50">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                  {match.confidence}% Confidence
                </span>
                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold
                  ${match.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}
                `}>
                  {match.status}
                </span>
              </div>
              
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Lost Item</p>
                  <p className="font-semibold text-sm">{match.lostItem?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Found Item</p>
                  <p className="font-semibold text-sm">{match.foundItem?.title}</p>
                </div>
              </div>

              <div className="px-4 pb-4">
                 <Link 
                   to={`/chat/${match.id}`}
                   className="block w-full text-center bg-brand-700 hover:bg-brand-600 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
                 >
                   <MessageCircle size={16} />
                   <span>Open Secure Chat</span>
                 </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
