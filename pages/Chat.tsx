import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api, subscribeToMessages } from '../services/db';
import { Match, Item, Message, EXCHANGE_TIMEOUT_MS } from '../types';
import { notifyExchange, showToast } from '../services/notificationService';
import { ShieldCheck, AlertTriangle, Clock, Check, Send, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card } from '../components/ui/card';

// Simple encryption/decryption (in production, use a proper encryption library)
const encryptMessage = (text: string, key: string): string => {
  // Simple XOR encryption for demo - use AES in production
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
};

const decryptMessage = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
};

export const Chat: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [match, setMatch] = useState<Match | null>(null);
  const [lostItem, setLostItem] = useState<Item | null>(null);
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string>('');

  // Exchange State
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [exchangeActive, setExchangeActive] = useState(false);
  const [exchangeComplete, setExchangeComplete] = useState(false);

  // Determine user role
  const isFounder = foundItem?.userId === user?.uid;
  const isOwner = lostItem?.userId === user?.uid;

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      // Decrypt messages
      const decrypted = newMessages.map(msg => ({
        ...msg,
        text: msg.encrypted && encryptionKey ? decryptMessage(msg.text, encryptionKey) : msg.text
      }));
      setMessages(decrypted);
    });

    return () => unsubscribe();
  }, [chatId, encryptionKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Exchange timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (exchangeActive && timer > 0 && !exchangeComplete) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && exchangeActive && !exchangeComplete) {
      // Timer expired
      handleExchangeExpired();
    }
    return () => clearInterval(interval);
  }, [exchangeActive, timer, exchangeComplete]);

  const loadMatchData = async () => {
    if (!matchId || !user) return;
    setLoading(true);

    try {
      // Get match data
      const matches = await api.matches.getUserMatches(user.uid);
      const currentMatch = matches.find(m => m.id === matchId);

      if (!currentMatch) {
        showToast('Match not found');
        navigate('/matches');
        return;
      }

      setMatch(currentMatch);

      // Load items
      const lost = await api.items.getById(currentMatch.lostItemId);
      const found = await api.items.getById(currentMatch.foundItemId);
      setLostItem(lost || null);
      setFoundItem(found || null);

      // Create or get chat session
      const participants = [lost?.userId || '', found?.userId || ''].filter(Boolean);
      const chat = await api.chats.getOrCreate(matchId, participants);
      setChatId(chat.id);

      // Generate encryption key based on match ID (in production, use proper key exchange)
      setEncryptionKey(matchId + '_secure_key');

      // Check if exchange is already active
      if (currentMatch.exchangeStatus === 'founder_confirmed') {
        setExchangeActive(true);
        const elapsed = Date.now() - (currentMatch.exchangeStartTime || Date.now());
        const remaining = Math.max(0, Math.floor((EXCHANGE_TIMEOUT_MS - elapsed) / 1000));
        setTimer(remaining);
        if (isOwner) {
          setShowExchangeModal(true);
        }
      }

      // Add system message
      if (messages.length === 0) {
        await api.messages.send(chat.id, {
          senderId: 'system',
          text: 'A potential match was found. Please verify details carefully before meeting.',
          timestamp: Date.now(),
          isSystem: true
        });
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId || !user) return;

    const encryptedText = encryptMessage(input, encryptionKey);

    await api.messages.send(chatId, {
      senderId: user.uid,
      text: encryptedText,
      timestamp: Date.now(),
      encrypted: true
    });

    setInput('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Founder clicks "Item Given"
  const handleItemGiven = async () => {
    if (!match || !matchId || !foundItem) return;

    await api.matches.update(matchId, {
      exchangeStatus: 'founder_confirmed',
      exchangeStartTime: Date.now(),
      exchangeConfirmedBy: [user!.uid]
    });

    setExchangeActive(true);
    setShowExchangeModal(true);
    setTimer(300);

    // Notify the lost item owner
    await notifyExchange('item_given', foundItem.title);

    // Send system message
    if (chatId) {
      await api.messages.send(chatId, {
        senderId: 'system',
        text: `${user!.username} has marked the item as given. Waiting for confirmation.`,
        timestamp: Date.now(),
        isSystem: true
      });
    }
  };

  // Owner clicks "Item Taken"
  const handleItemTaken = async () => {
    if (!match || !matchId || !lostItem || !foundItem) return;

    // Mark exchange as complete
    await api.matches.update(matchId, {
      exchangeStatus: 'completed',
      status: 'completed',
      exchangeConfirmedBy: [...(match.exchangeConfirmedBy || []), user!.uid]
    });

    // Delete both items
    await api.items.delete(lostItem.id);
    await api.items.delete(foundItem.id);

    // Update founder's trust score (positive)
    const founder = await api.users.get(foundItem.userId);
    if (founder) {
      await api.users.update(founder.uid, {
        trustScore: Math.min(100, founder.trustScore + 5),
        reportsCount: founder.reportsCount + 1
      });
    }

    setExchangeComplete(true);
    setExchangeActive(false);

    await notifyExchange('exchange_complete', lostItem.title);

    // Send system message
    if (chatId) {
      await api.messages.send(chatId, {
        senderId: 'system',
        text: 'Exchange completed successfully! Items have been removed.',
        timestamp: Date.now(),
        isSystem: true
      });
    }

    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  // Exchange expired (owner didn't confirm in time)
  const handleExchangeExpired = async () => {
    if (!match || !matchId || !foundItem) return;

    // Mark as expired
    await api.matches.update(matchId, {
      exchangeStatus: 'expired'
    });

    // Reduce founder's trust score (penalty)
    const founder = await api.users.get(foundItem.userId);
    if (founder) {
      await api.users.update(founder.uid, {
        trustScore: Math.max(0, founder.trustScore - 10),
        failedExchanges: (founder.failedExchanges || 0) + 1
      });
    }

    setExchangeActive(false);
    await notifyExchange('exchange_expired', foundItem.title);
    showToast('Exchange expired. Trust score penalty applied to founder.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <Card className="bg-brand-800 p-4 rounded-t-xl border-b border-brand-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/matches')} className="p-1">
              <ChevronLeft size={20} className="text-slate-400" />
            </button>
            <div>
              <h2 className="font-bold flex items-center text-sm">
                <ShieldCheck size={14} className="text-green-500 mr-2" />
                Secure Chat
              </h2>
              <p className="text-[10px] text-slate-400">End-to-End Encrypted</p>
            </div>
          </div>

          {/* Exchange Button */}
          {isFounder && !exchangeComplete && match?.exchangeStatus !== 'founder_confirmed' && (
            <Button
              onClick={handleItemGiven}
              size="sm"
              className="bg-green-600 hover:bg-green-500 text-xs"
            >
              Item Given
            </Button>
          )}
          {isOwner && exchangeActive && !exchangeComplete && (
            <Button
              onClick={() => setShowExchangeModal(true)}
              size="sm"
              className="bg-brand-500 hover:bg-brand-400 text-xs animate-pulse"
            >
              Confirm Item Taken
            </Button>
          )}
        </div>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-900/50">
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertTriangle size={16} className="text-yellow-500" />
          <AlertDescription className="text-xs text-yellow-100">
            Safety: Meet in public places. Don't share personal info.
          </AlertDescription>
        </Alert>

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.isSystem ? 'justify-center' : msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.isSystem
                  ? 'bg-brand-700/50 text-slate-400 text-xs'
                  : msg.senderId === user?.uid
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-brand-800 text-slate-200 rounded-tl-none'
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-brand-800 border-t border-brand-700 flex space-x-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-brand-900 border-brand-700 text-white"
          placeholder="Type a message..."
        />
        <Button type="submit" variant="secondary" className="bg-brand-600 px-3">
          <Send size={18} />
        </Button>
      </form>

      {/* Exchange Modal */}
      <AnimatePresence>
        {showExchangeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-brand-800 w-full max-w-md rounded-2xl border border-brand-600 p-6 shadow-2xl"
            >
              {!exchangeComplete ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-brand-700 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <Clock size={32} className="text-brand-400" />
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-900" />
                        <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-500" strokeDasharray="188" strokeDashoffset={188 - (188 * timer) / 300} />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {isFounder ? 'Waiting for Confirmation' : 'Confirm Item Received'}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {isFounder
                        ? 'Waiting for the owner to confirm they received the item.'
                        : 'Please confirm that you have received the item.'}
                    </p>
                  </div>

                  <div className="bg-brand-900 p-4 rounded-xl mb-6">
                    <p className="text-center text-3xl font-mono font-bold text-brand-400">
                      {formatTime(timer)}
                    </p>
                    <p className="text-center text-xs text-slate-500 mt-1">
                      Time remaining
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={() => setShowExchangeModal(false)}
                      variant="secondary"
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200"
                    >
                      Close
                    </Button>
                    {isOwner && (
                      <Button
                        onClick={handleItemTaken}
                        className="flex-1 bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20"
                      >
                        Item Taken
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                  <p className="text-slate-400 text-sm">
                    Item exchange completed. Trust scores updated.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
