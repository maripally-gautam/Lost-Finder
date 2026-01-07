import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { Match, Item } from '../types';
import { ShieldCheck, AlertTriangle, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Chat: React.FC = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<{id: string, text: string, sender: 'me'|'them'}[]>([]);
  const [input, setInput] = useState('');
  
  // Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [handoverActive, setHandoverActive] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Mock loading match data
    if (matchId) {
      // In a real app, verify user is participant
      setMatch({ id: matchId } as Match);
      setMessages([
        { id: '1', text: 'System: A potential match was found. Please verify details carefully.', sender: 'them' }
      ]);
    }
  }, [matchId]);

  useEffect(() => {
    let interval: any;
    if (handoverActive && timer > 0 && !confirmed) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [handoverActive, timer, confirmed]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), text: input, sender: 'me' }]);
    setInput('');
  };

  const startHandover = () => {
    setShowHandoverModal(true);
    setHandoverActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const confirmHandover = () => {
    setConfirmed(true);
    setHandoverActive(false);
    setTimeout(() => {
        navigate('/'); // Go home after success
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="bg-brand-800 p-4 rounded-t-xl border-b border-brand-700 flex justify-between items-center">
        <div>
          <h2 className="font-bold flex items-center">
            <ShieldCheck size={16} className="text-green-500 mr-2" />
            Secure Chat
          </h2>
          <p className="text-[10px] text-slate-400">Identity Hidden • End-to-End Encrypted</p>
        </div>
        <button 
           onClick={startHandover}
           className="bg-brand-500 hover:bg-brand-400 text-white text-xs px-3 py-2 rounded-lg font-bold"
        >
          Item Giving
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-900/50">
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-start">
           <AlertTriangle size={16} className="text-yellow-500 mr-2 mt-0.5" />
           <p className="text-xs text-yellow-100">
             Safety Tip: Meet in a public place. Do not share your personal phone number or home address.
           </p>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
              msg.sender === 'me' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-brand-800 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-brand-800 border-t border-brand-700 flex space-x-2">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-brand-900 border border-brand-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-brand-500"
          placeholder="Type a message..."
        />
        <button type="submit" className="bg-brand-600 px-4 py-2 rounded-lg font-bold text-sm">Send</button>
      </form>

      {/* Handover Modal */}
      <AnimatePresence>
        {showHandoverModal && (
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
              {!confirmed ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-brand-700 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                       <Clock size={32} className="text-brand-400" />
                       <svg className="absolute inset-0 w-full h-full -rotate-90">
                         <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-900" />
                         <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-500" strokeDasharray="188" strokeDashoffset={188 - (188 * timer) / 300} />
                       </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Confirm Handover</h2>
                    <p className="text-slate-400 text-sm">
                      Please verify the item and the person. Both parties must confirm within the time limit.
                    </p>
                  </div>
                  
                  <div className="bg-brand-900 p-4 rounded-xl mb-6">
                     <p className="text-center text-3xl font-mono font-bold text-brand-400">
                       {formatTime(timer)}
                     </p>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setShowHandoverModal(false)}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmHandover}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white transition-colors shadow-lg shadow-green-600/20"
                    >
                      Confirm Exchange
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                  <p className="text-slate-400 text-sm">
                    Item marked as returned. Trust scores updated.
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
