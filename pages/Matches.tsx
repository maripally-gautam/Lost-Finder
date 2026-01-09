import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import { api } from '../services/db';
import { Match, Item } from '../types';
import { Link } from 'react-router-dom';
import { MessageCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

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

    // Filter out completed exchanges where items are deleted
    const validMatches = enriched.filter(m => m.lostItem || m.foundItem || m.status === 'completed');

    setMatches(validMatches);
    setLoading(false);
  };

  const getStatusBadge = (match: Match) => {
    if (match.status === 'completed' || match.exchangeStatus === 'completed') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
          <CheckCircle size={10} className="mr-1" />
          Completed
        </Badge>
      );
    }
    if (match.exchangeStatus === 'founder_confirmed') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] animate-pulse">
          <Clock size={10} className="mr-1" />
          Awaiting Confirmation
        </Badge>
      );
    }
    if (match.exchangeStatus === 'expired') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
          <AlertTriangle size={10} className="mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="bg-brand-500/20 text-brand-400 border-brand-500/30 text-[10px]">
        {match.status}
      </Badge>
    );
  };

  const isUserFounder = (match: Match & { foundItem?: Item }) => {
    return match.foundItem?.userId === user?.uid;
  };

  const isUserOwner = (match: Match & { lostItem?: Item }) => {
    return match.lostItem?.userId === user?.uid;
  };

  return (
    <div className="pb-10">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <span className="bg-brand-500 w-2 h-6 rounded-r mr-3"></span>
        AI Matches
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(k => <Skeleton key={k} className="h-40 bg-brand-800 rounded-xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <Card className="text-center py-20 text-slate-500 bg-brand-800/30 border-dashed border-brand-700">
          <p>No matches found yet.</p>
          <p className="text-sm mt-2">We will notify you when our AI finds something.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => (
            <Card key={match.id} className="bg-brand-800 border-brand-700 overflow-hidden p-0">
              <div className="p-4 border-b border-brand-700 flex justify-between items-center bg-brand-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                    {match.confidence}% Match
                  </span>
                  {isUserFounder(match) && (
                    <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
                      You Found
                    </Badge>
                  )}
                  {isUserOwner(match) && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400">
                      Your Item
                    </Badge>
                  )}
                </div>
                {getStatusBadge(match)}
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Lost Item</p>
                  <p className="font-semibold text-sm">{match.lostItem?.title || 'Deleted'}</p>
                  {match.lostItem?.category && (
                    <Badge variant="secondary" className="mt-1 text-[10px] bg-brand-700">
                      {match.lostItem.category}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Found Item</p>
                  <p className="font-semibold text-sm">{match.foundItem?.title || 'Deleted'}</p>
                  {match.foundItem?.category && (
                    <Badge variant="secondary" className="mt-1 text-[10px] bg-brand-700">
                      {match.foundItem.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Hints */}
              {match.exchangeStatus === 'founder_confirmed' && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-yellow-400 text-center">
                    {isUserOwner(match)
                      ? '⚠️ Please confirm you received the item within 5 minutes!'
                      : '⏳ Waiting for the owner to confirm...'}
                  </p>
                </div>
              )}

              <div className="px-4 pb-4">
                {match.status !== 'completed' && match.exchangeStatus !== 'completed' ? (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full bg-brand-700 hover:bg-brand-600"
                  >
                    <Link to={`/chat/${match.id}`} className="flex items-center justify-center space-x-2">
                      <MessageCircle size={16} />
                      <span>Open Secure Chat</span>
                    </Link>
                  </Button>
                ) : (
                  <div className="text-center text-sm text-green-400 py-2">
                    <CheckCircle size={16} className="inline mr-2" />
                    Exchange completed successfully!
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
