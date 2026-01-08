import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';

// Your Firebase configuration
// Replace these with your actual Firebase project config from Firebase Console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Check if running on native mobile platform
const isMobile = Capacitor.isNativePlatform();

// Enable offline persistence for better UX (optional but recommended)
if (typeof window !== 'undefined' && firebaseConfig.projectId) {
    enableIndexedDbPersistence(db)
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support offline persistence');
            }
        });
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Handle redirect result (for mobile apps)
export const handleAuthRedirect = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            return { user: result.user, error: null };
        }
        return { user: null, error: null };
    } catch (error: any) {
        console.error('Redirect result error:', error);
        return { user: null, error: error.message || 'Authentication failed' };
    }
};

// Sign in with Google (for new account registration)
export const signInWithGoogle = async () => {
    try {
        if (isMobile) {
            // Use redirect for mobile apps (Android/iOS)
            await signInWithRedirect(auth, googleProvider);
            // The redirect will happen, and we'll get the result when the app returns
            return { user: null, error: null, redirecting: true };
        } else {
            // Use popup for web browsers
            const result = await signInWithPopup(auth, googleProvider);
            return { user: result.user, error: null };
        }
    } catch (error: any) {
        console.error('Google Sign-In Error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            return { user: null, error: 'Sign-in cancelled. Please try again.' };
        } else if (error.code === 'auth/popup-blocked') {
            return { user: null, error: 'Pop-up was blocked. Please allow pop-ups for this site.' };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { user: null, error: 'Another sign-in attempt is in progress.' };
        }
        return { user: null, error: error.message || 'Failed to sign in with Google' };
    }
};

// Sign in with Google for existing users (checks if account exists)
export const signInWithGoogleForLogin = async () => {
    try {
        if (isMobile) {
            // Use redirect for mobile apps (Android/iOS)
            await signInWithRedirect(auth, googleProvider);
            // The redirect will happen, and we'll get the result when the app returns
            return { user: null, error: null, redirecting: true };
        } else {
            // Use popup for web browsers
            const result = await signInWithPopup(auth, googleProvider);
            return {
                user: result.user,
                error: null,
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            };
        }
    } catch (error: any) {
        console.error('Google Sign-In Error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            return { user: null, error: 'Sign-in cancelled. Please try again.' };
        } else if (error.code === 'auth/popup-blocked') {
            return { user: null, error: 'Pop-up was blocked. Please allow pop-ups for this site.' };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { user: null, error: 'Another sign-in attempt is in progress.' };
        }
        return { user: null, error: error.message || 'Failed to sign in with Google' };
    }
};

export const signOutUser = async () => {
    try {
        await signOut(auth);
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export default app;
