import { Item, Match, UserProfile, ChatSession, Message } from '../types';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  ITEMS: 'items',
  MATCHES: 'matches',
  CHATS: 'chats',
  MESSAGES: 'messages',
};

// Check if Firebase is configured (fallback to localStorage if not)
const isFirebaseConfigured = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return projectId && projectId !== 'your_project_id';
};

// --- LOCAL STORAGE FALLBACK (for development without Firebase) ---
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

// Event emitter for local storage changes
const localStorageListeners: { [key: string]: ((data: any[]) => void)[] } = {};

const notifyLocalStorageListeners = (key: string) => {
  if (localStorageListeners[key]) {
    const data = getStore(key);
    localStorageListeners[key].forEach(callback => callback(data));
  }
};

// Subscribe to real-time item updates
export const subscribeToItems = (
  type: 'lost' | 'found',
  callback: (items: Item[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) {
    // Local storage fallback with polling
    const key = STORAGE_KEYS.ITEMS;
    const filterAndCallback = () => {
      const items = getStore<Item>(key);
      const filtered = items
        .filter(i => i.type === type && i.status === type)
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(filtered);
    };

    // Initial call
    filterAndCallback();

    // Add listener
    if (!localStorageListeners[key]) {
      localStorageListeners[key] = [];
    }
    localStorageListeners[key].push(filterAndCallback);

    // Return unsubscribe function
    return () => {
      const index = localStorageListeners[key].indexOf(filterAndCallback);
      if (index > -1) {
        localStorageListeners[key].splice(index, 1);
      }
    };
  }

  // Firebase real-time subscription
  const q = query(
    collection(db, COLLECTIONS.ITEMS),
    where('type', '==', type),
    where('status', '==', type),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    callback(items);
  });
};

// Subscribe to messages in a chat
export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured()) {
    const key = STORAGE_KEYS.MESSAGES;
    const filterAndCallback = () => {
      const messages = getStore<Message & { chatId: string }>(key);
      const filtered = messages
        .filter(m => m.chatId === chatId)
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(filtered);
    };

    filterAndCallback();

    if (!localStorageListeners[key]) {
      localStorageListeners[key] = [];
    }
    localStorageListeners[key].push(filterAndCallback);

    return () => {
      const index = localStorageListeners[key].indexOf(filterAndCallback);
      if (index > -1) {
        localStorageListeners[key].splice(index, 1);
      }
    };
  }

  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  });
};

// --- API METHODS ---

export const api = {
  items: {
    // Get visible lost items (public feed)
    getLostItems: async (): Promise<Item[]> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        return items.filter(i => i.type === 'lost' && i.status === 'lost')
          .sort((a, b) => b.timestamp - a.timestamp);
      }

      // Firebase implementation
      const q = query(
        collection(db, COLLECTIONS.ITEMS),
        where('type', '==', 'lost'),
        where('status', '==', 'lost'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    },

    // Get found items
    getFoundItems: async (): Promise<Item[]> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        return items.filter(i => i.type === 'found' && i.status === 'found')
          .sort((a, b) => b.timestamp - a.timestamp);
      }

      const q = query(
        collection(db, COLLECTIONS.ITEMS),
        where('type', '==', 'found'),
        where('status', '==', 'found'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    },

    // Add new item
    add: async (item: Omit<Item, 'id'>): Promise<string> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
        items.push(newItem);
        setStore(STORAGE_KEYS.ITEMS, items);
        notifyLocalStorageListeners(STORAGE_KEYS.ITEMS);
        return newItem.id;
      }

      // Firebase implementation
      const docRef = await addDoc(collection(db, COLLECTIONS.ITEMS), {
        ...item,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },

    getById: async (id: string): Promise<Item | undefined> => {
      if (!isFirebaseConfigured()) {
        return getStore<Item>(STORAGE_KEYS.ITEMS).find(i => i.id === id);
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.ITEMS, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Item;
      }
      return undefined;
    },

    update: async (id: string, updates: Partial<Item>): Promise<void> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...updates };
          setStore(STORAGE_KEYS.ITEMS, items);
          notifyLocalStorageListeners(STORAGE_KEYS.ITEMS);
        }
        return;
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.ITEMS, id);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    },

    // Delete an item
    delete: async (id: string): Promise<void> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const filtered = items.filter(i => i.id !== id);
        setStore(STORAGE_KEYS.ITEMS, filtered);
        notifyLocalStorageListeners(STORAGE_KEYS.ITEMS);
        return;
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.ITEMS, id);
      await deleteDoc(docRef);
    },

    // Get user's items (both lost and found)
    getUserItems: async (userId: string): Promise<Item[]> => {
      if (!isFirebaseConfigured()) {
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        return items.filter(i => i.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
      }

      // Firebase implementation
      const q = query(
        collection(db, COLLECTIONS.ITEMS),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
    }
  },

  matches: {
    create: async (match: Omit<Match, 'id'>): Promise<string> => {
      if (!isFirebaseConfigured()) {
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const newMatch = { ...match, id: Math.random().toString(36).substr(2, 9) };
        matches.push(newMatch);
        setStore(STORAGE_KEYS.MATCHES, matches);
        return newMatch.id;
      }

      // Firebase implementation
      const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), {
        ...match,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },

    getUserMatches: async (userId: string): Promise<Match[]> => {
      if (!isFirebaseConfigured()) {
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const items = getStore<Item>(STORAGE_KEYS.ITEMS);
        const getOwner = (itemId: string) => items.find(i => i.id === itemId)?.userId;
        return matches.filter(m => {
          const lostOwner = getOwner(m.lostItemId);
          const foundOwner = getOwner(m.foundItemId);
          return lostOwner === userId || foundOwner === userId;
        });
      }

      // Firebase implementation
      const itemsQuery = query(
        collection(db, COLLECTIONS.ITEMS),
        where('userId', '==', userId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const userItemIds = itemsSnapshot.docs.map(doc => doc.id);

      if (userItemIds.length === 0) return [];

      const matchesSnapshot = await getDocs(collection(db, COLLECTIONS.MATCHES));
      return matchesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Match))
        .filter(m => userItemIds.includes(m.lostItemId) || userItemIds.includes(m.foundItemId));
    },

    update: async (id: string, updates: Partial<Match>) => {
      if (!isFirebaseConfigured()) {
        const matches = getStore<Match>(STORAGE_KEYS.MATCHES);
        const idx = matches.findIndex(m => m.id === id);
        if (idx !== -1) {
          matches[idx] = { ...matches[idx], ...updates };
          setStore(STORAGE_KEYS.MATCHES, matches);
        }
        return;
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.MATCHES, id);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    }
  },

  users: {
    get: async (uid: string): Promise<UserProfile | null> => {
      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        return users.find(u => u.uid === uid) || null;
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    },

    // Check if username already exists
    isUsernameTaken: async (username: string): Promise<boolean> => {
      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        return users.some(u => u.username.toLowerCase() === username.toLowerCase());
      }

      // Firebase implementation
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('usernameLower', '==', username.toLowerCase()),
        limit(1)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    },

    create: async (user: UserProfile): Promise<{ success: boolean; error?: string }> => {
      // First check if username is taken
      const isTaken = await api.users.isUsernameTaken(user.username);
      if (isTaken) {
        return { success: false, error: 'Username already exists. Please choose a different username.' };
      }

      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        users.push(user);
        setStore(STORAGE_KEYS.USERS, users);
        return { success: true };
      }

      // Firebase implementation - use uid as document ID
      const docRef = doc(db, COLLECTIONS.USERS, user.uid);
      await setDoc(docRef, {
        ...user,
        usernameLower: user.username.toLowerCase(), // For case-insensitive lookups
        createdAt: serverTimestamp(),
      });
      return { success: true };
    },

    // Get user by username
    getByUsername: async (username: string): Promise<UserProfile | null> => {
      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
      }

      // Firebase implementation
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('usernameLower', '==', username.toLowerCase()),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserProfile;
      }
      return null;
    },

    // Update user profile
    update: async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        const index = users.findIndex(u => u.uid === uid);
        if (index !== -1) {
          users[index] = { ...users[index], ...updates };
          setStore(STORAGE_KEYS.USERS, users);
        }
        return;
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    },

    // Check if user exists by Firebase UID (for sign-in)
    existsByUid: async (uid: string): Promise<boolean> => {
      if (!isFirebaseConfigured()) {
        const users = getStore<UserProfile>(STORAGE_KEYS.USERS);
        return users.some(u => u.uid === uid);
      }

      // Firebase implementation
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    }
  },

  chats: {
    // Create or get existing chat session
    getOrCreate: async (matchId: string, participants: string[]): Promise<ChatSession> => {
      if (!isFirebaseConfigured()) {
        const chats = getStore<ChatSession>(STORAGE_KEYS.CHATS);
        let chat = chats.find(c => c.matchId === matchId);
        if (!chat) {
          chat = {
            id: Math.random().toString(36).substr(2, 9),
            matchId,
            participants,
          };
          chats.push(chat);
          setStore(STORAGE_KEYS.CHATS, chats);
        }
        return chat;
      }

      // Firebase - check for existing chat
      const q = query(
        collection(db, COLLECTIONS.CHATS),
        where('matchId', '==', matchId),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ChatSession;
      }

      // Create new chat
      const docRef = await addDoc(collection(db, COLLECTIONS.CHATS), {
        matchId,
        participants,
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, matchId, participants };
    },

    getById: async (id: string): Promise<ChatSession | null> => {
      if (!isFirebaseConfigured()) {
        const chats = getStore<ChatSession>(STORAGE_KEYS.CHATS);
        return chats.find(c => c.id === id) || null;
      }

      const docRef = doc(db, COLLECTIONS.CHATS, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ChatSession;
      }
      return null;
    },

    update: async (id: string, updates: Partial<ChatSession>): Promise<void> => {
      if (!isFirebaseConfigured()) {
        const chats = getStore<ChatSession>(STORAGE_KEYS.CHATS);
        const index = chats.findIndex(c => c.id === id);
        if (index !== -1) {
          chats[index] = { ...chats[index], ...updates };
          setStore(STORAGE_KEYS.CHATS, chats);
        }
        return;
      }

      const docRef = doc(db, COLLECTIONS.CHATS, id);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    }
  },

  messages: {
    send: async (chatId: string, message: Omit<Message, 'id'>): Promise<string> => {
      if (!isFirebaseConfigured()) {
        const messages = getStore<Message & { chatId: string }>(STORAGE_KEYS.MESSAGES);
        const newMessage = {
          ...message,
          id: Math.random().toString(36).substr(2, 9),
          chatId
        };
        messages.push(newMessage);
        setStore(STORAGE_KEYS.MESSAGES, messages);
        notifyLocalStorageListeners(STORAGE_KEYS.MESSAGES);
        return newMessage.id;
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
        ...message,
        chatId,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },

    getForChat: async (chatId: string): Promise<Message[]> => {
      if (!isFirebaseConfigured()) {
        const messages = getStore<Message & { chatId: string }>(STORAGE_KEYS.MESSAGES);
        return messages.filter(m => m.chatId === chatId)
          .sort((a, b) => a.timestamp - b.timestamp);
      }

      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    }
  }
};
