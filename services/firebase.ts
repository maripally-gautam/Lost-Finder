import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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

// Listen for auth state changes (useful for debugging)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

// Handle redirect result - not needed for native, kept for web fallback
export const handleAuthRedirect = async () => {
    // For native apps, we use the direct sign-in method
    // This is kept for backward compatibility but returns immediately on mobile
    if (isMobile) {
        return { user: null, error: null };
    }
    return { user: null, error: null };
};

// Sign in with Google using native account picker on Android
export const signInWithGoogle = async () => {
    try {
        if (isMobile) {
            // Use native Google Sign-In via Capacitor Firebase Authentication
            // This opens the native account chooser popup (not browser)
            const result = await FirebaseAuthentication.signInWithGoogle();

            if (result.user) {
                // Get the ID token to sign in with Firebase Web SDK
                const idToken = result.credential?.idToken;

                if (idToken) {
                    // Create credential and sign in with Firebase Web SDK
                    const credential = GoogleAuthProvider.credential(idToken);
                    const userCredential = await signInWithCredential(auth, credential);

                    return {
                        user: userCredential.user,
                        error: null,
                        redirecting: false
                    };
                }

                // If no ID token, return the native user info
                return {
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName,
                        photoURL: result.user.photoUrl
                    } as any,
                    error: null,
                    redirecting: false
                };
            }

            return { user: null, error: 'Sign-in was cancelled', redirecting: false };
        } else {
            // Use popup for web browsers
            const result = await signInWithPopup(auth, googleProvider);
            return { user: result.user, error: null, redirecting: false };
        }
    } catch (error: any) {
        console.error('Google Sign-In Error:', error);

        // Handle specific error codes
        if (error.code === 'auth/popup-closed-by-user' ||
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled')) {
            return { user: null, error: 'Sign-in cancelled. Please try again.', redirecting: false };
        } else if (error.code === 'auth/popup-blocked') {
            return { user: null, error: 'Pop-up was blocked. Please allow pop-ups for this site.', redirecting: false };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { user: null, error: 'Another sign-in attempt is in progress.', redirecting: false };
        } else if (error.code === 'auth/network-request-failed') {
            return { user: null, error: 'Network error. Please check your connection.', redirecting: false };
        }

        return { user: null, error: error.message || 'Failed to sign in with Google', redirecting: false };
    }
};

// Sign in with Google for existing users (checks if account exists)
export const signInWithGoogleForLogin = async () => {
    try {
        if (isMobile) {
            // Use native Google Sign-In via Capacitor Firebase Authentication
            const result = await FirebaseAuthentication.signInWithGoogle();

            if (result.user) {
                // Get the ID token to sign in with Firebase Web SDK
                const idToken = result.credential?.idToken;

                if (idToken) {
                    // Create credential and sign in with Firebase Web SDK
                    const credential = GoogleAuthProvider.credential(idToken);
                    const userCredential = await signInWithCredential(auth, credential);

                    return {
                        user: userCredential.user,
                        error: null,
                        redirecting: false,
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                        displayName: userCredential.user.displayName,
                        photoURL: userCredential.user.photoURL
                    };
                }

                // If no ID token, return the native user info
                return {
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName,
                        photoURL: result.user.photoUrl
                    } as any,
                    error: null,
                    redirecting: false,
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoUrl
                };
            }

            return { user: null, error: 'Sign-in was cancelled', redirecting: false };
        } else {
            // Use popup for web browsers
            const result = await signInWithPopup(auth, googleProvider);
            return {
                user: result.user,
                error: null,
                redirecting: false,
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            };
        }
    } catch (error: any) {
        console.error('Google Sign-In Error:', error);

        if (error.code === 'auth/popup-closed-by-user' ||
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled')) {
            return { user: null, error: 'Sign-in cancelled. Please try again.', redirecting: false };
        } else if (error.code === 'auth/popup-blocked') {
            return { user: null, error: 'Pop-up was blocked. Please allow pop-ups for this site.', redirecting: false };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { user: null, error: 'Another sign-in attempt is in progress.', redirecting: false };
        } else if (error.code === 'auth/network-request-failed') {
            return { user: null, error: 'Network error. Please check your connection.', redirecting: false };
        }

        return { user: null, error: error.message || 'Failed to sign in with Google', redirecting: false };
    }
};

export const signOutUser = async () => {
    try {
        // Sign out from both Firebase Web SDK and native
        await signOut(auth);

        if (isMobile) {
            await FirebaseAuthentication.signOut();
        }

        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// Check if Firebase is properly configured
export const isFirebaseConfigured = (): boolean => {
    return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

// Get current user
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

export default app;
