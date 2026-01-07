import { Item, Match, UserProfile, ChatSession, Message } from '../types';
import { DEMO_MODE } from '../constants';

// --- MOCK DATA STORE (LocalStorage Wrapper) ---
const STORAGE_KEYS = {
  USERS: 'fg_users',
  ITEMS: 'fg_items',
  MATCHES: 'fg_matches',
  CHATS: 'fg_chats',
  MESSAGES: 'fg_messages',
};

const getStore = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setStore = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- API METHODS ---

export const api = {
  items: {
    // Get visible lost items (public feed)
    getLostItems: async (): Promise<Item[]> => {
      if (DEMO_MODE) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        return items.filter(i => i.type === 'lost' && i.status === 'lost')
                    .sort((a, b) => b.timestamp - a.timestamp);
      }
      return []; // Real Firebase implementation would go here
    },
    
    // Add new item
    add: async (item: Omit<Item, 'id'>): Promise<string> => {
      if (DEMO_MODE) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
        items.push(newItem);
        setStore(STORAGE_KEYS.ITEMS, items);
        return newItem.id;
      }
      return '';
    },

    getById: async (id: string): Promise<Item | undefined> => {
       if (DEMO_MODE) {
         return getStore<Item>(STORAGE_KEYS.ITEMS).find(i => i.id === id);
       }
       return undefined;
    },

    update: async (id: string, updates: Partial<Item>): Promise<void> => {
      if (DEMO_MODE) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...updates };
          setStore(STORAGE_KEYS.ITEMS, items);
        }
      }
    }
  },

  matches: {
    create: async (match: Omit<Match, 'id'>): Promise<string> => {
      if (DEMO_MODE) {
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const newMatch = { ...match, id: Math.random().toString(36).substr(2, 9) };
        matches.push(newMatch);
        setStore(STORAGE_KEYS.MATCHES, matches);
        return newMatch.id;
      }
      return '';
    },
    
    getUserMatches: async (userId: string): Promise<Match[]> => {
      if (DEMO_MODE) {
        // Find matches where user owns the lost item OR the found item
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        
        // Helper to find item owner
        const getOwner = (itemId: string) => items.find(i => i.id === itemId)?.userId;

        return matches.filter(m => {
           const lostOwner = getOwner(m.lostItemId);
           const foundOwner = getOwner(m.foundItemId);
           return lostOwner === userId || foundOwner === userId;
        });
      }
      return [];
    },

    update: async (id: string, updates: Partial<Match>) => {
      if (DEMO_MODE) {
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const idx = matches.findIndex(m => m.id === id);
        if(idx !== -1) {
          matches[idx] = { ...matches[idx], ...updates };
          setStore(STORAGE_KEYS.MATCHES, matches);
        }
      }
    }
  },

  users: {
    get: async (uid: string): Promise<UserProfile | null> => {
      if (DEMO_MODE) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        return users.find(u => u.uid === uid) || null;
      }
      return null;
    },
    create: async (user: UserProfile) => {
      if (DEMO_MODE) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        users.push(user);
        setStore(STORAGE_KEYS.USERS, users);
      }
    }
  }
};
