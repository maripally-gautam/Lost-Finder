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
}

export interface AppSettings {
  notifications: boolean;
  theme: 'light' | 'dark';
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
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ChatSession {
  id: string;
  matchId: string;
  participants: string[];
  handoverStarted?: boolean;
  handoverConfirmedByFinder?: boolean;
  handoverConfirmedByLoser?: boolean;
  handoverStartTime?: number; // For the 5-minute timer
}
