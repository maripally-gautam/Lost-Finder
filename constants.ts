import { Users, Search, ShieldCheck, MapPin } from 'lucide-react';

export const APP_NAME = "FinderGuard";
export const DEMO_MODE = true; // Set to false to use real Firebase

export const CATEGORIES = [
  "Electronics",
  "Wallet/Keys",
  "Jewelry",
  "Clothing",
  "Pet",
  "Documents",
  "Other"
];

export const NAV_ITEMS = [
  { label: 'Lost Feed', path: '/', icon: Search },
  { label: 'Post Lost', path: '/post-lost', icon: MapPin },
  { label: 'Post Found', path: '/post-found', icon: ShieldCheck },
  { label: 'Matches', path: '/matches', icon: Users },
];
