export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  photoURL?: string;
  trustScore: number;
  reportsCount: number;
  joinedAt: number;
  isVerified: boolean;
  pendingExchanges?: number; // Track pending item given confirmations
  failedExchanges?: number; // Track failed exchanges (trust penalty)
}

export interface AppSettings {
  notifications: boolean;
  theme: 'light' | 'dark';
  searchRadius: number; // 1-20 km
  showGlobal: boolean; // Show all items regardless of location
  locationMode: 'current' | 'live'; // Current = snapshot, live = continuous updates
  currentLocation?: GeoLocation; // Stored current location when using 'current' mode
}

export type ItemPriority = 'Low' | 'Medium' | 'High';
export type ItemStatus = 'lost' | 'found' | 'matched' | 'returned' | 'archived';

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Item {
  id: string;
  userId: string;
  type: 'lost' | 'found';
  title: string; // Generic title for lost items
  description: string;
  category: string;
  location: GeoLocation;
  radius?: number; // In meters, for lost items
  priority: ItemPriority;
  status: ItemStatus;
  timestamp: number;
  image?: string; // Base64 or URL

  // Privacy & Verification (Hidden from public)
  privateDetails?: {
    distinguishingMarks?: string;
    contents?: string;
    serialNumber?: string;
  };
}

export interface Match {
  id: string;
  lostItemId: string;
  foundItemId: string;
  confidence: number; // 0-100
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  chatId?: string;
  timestamp: number;
  lostUserId?: string; // Owner of lost item
  foundUserId?: string; // Owner of found item
  exchangeStatus?: 'none' | 'founder_confirmed' | 'owner_confirmed' | 'completed' | 'expired';
  exchangeStartTime?: number; // When founder clicked "Item Given"
  exchangeConfirmedBy?: string[]; // User IDs who confirmed
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  encrypted?: boolean; // Flag for encrypted messages
  iv?: string; // Initialization vector for encryption
}

export interface ChatSession {
  id: string;
  matchId: string;
  participants: string[];
  encryptionKey?: string; // Shared encryption key (stored securely)
  handoverStarted?: boolean;
  handoverConfirmedByFinder?: boolean;
  handoverConfirmedByLoser?: boolean;
  handoverStartTime?: number; // For the 5-minute timer
}

// Exchange timer constants
export const EXCHANGE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
