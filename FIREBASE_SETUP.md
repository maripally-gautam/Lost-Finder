# Firebase Setup Instructions

## 🔥 Setting up Firebase for LostLink AI

Follow these steps to configure Firebase for your app:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "LostLink AI")
4. Disable Google Analytics (optional for development)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project, click **Authentication** in the left sidebar
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Click on **Google** provider
5. Toggle **Enable**
6. Add your support email
7. Click **Save**

### 3. Configure Authorized Domains

1. Still in **Authentication > Settings > Authorized domains**
2. Make sure these domains are added:
   - `localhost` (for development)
   - Your production domain (if deploying)

### 4. Create Firestore Database

1. Click **Firestore Database** in the left sidebar
2. Click "Create database"
3. Start in **Test mode** (for development)
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2026, 3, 1);
       }
     }
   }
   ```
4. Choose a location (closest to your users)
5. Click **Enable**

### 5. Set Up Firestore Security Rules (Production)

Once you're ready for production, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Items collection
    match /items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                             resource.data.userId == request.auth.uid;
    }
    
    // Matches collection
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Chats collection
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid in resource.data.participants;
    }
    
    // Messages subcollection
    match /chats/{chatId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### 6. Get Your Firebase Configuration

1. In Firebase Console, click the **⚙️ Settings** icon
2. Select **Project settings**
3. Scroll down to "Your apps"
4. Click the **</>** (Web) icon
5. Register your app with a nickname (e.g., "LostLink Web")
6. Copy the `firebaseConfig` object

### 7. Create Environment File

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
   
   # Optional: Gemini API for AI matching
   VITE_GEMINI_API_KEY=your_gemini_key_here
   ```

### 8. Enable Storage (Optional)

If you want to upload images:

1. Click **Storage** in Firebase Console
2. Click "Get started"
3. Start in **Test mode**
4. Choose a location
5. Click **Done**

### 9. Configure for Android App (IMPORTANT!)

To fix authentication issues in the Android app, you need to add the SHA-1 certificate fingerprint:

#### Get your SHA-1 fingerprint:

**For Debug Builds:**
```bash
# Windows
cd android
.\gradlew signingReport

# macOS/Linux
cd android
./gradlew signingReport
```

Look for the **SHA-1** under `Variant: debug` in the output.

**Example output:**
```
Variant: debug
Config: debug
Store: C:\Users\YourName\.android\debug.keystore
Alias: androiddebugkey
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

#### Add SHA-1 to Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the ⚙️ **Settings** icon → **Project settings**
4. Scroll down to "Your apps"
5. Click on your **Android app** (if not added, click "Add app" → Android)
6. Under "SHA certificate fingerprints", click **"Add fingerprint"**
7. Paste your SHA-1 fingerprint
8. Click **Save**

#### Download google-services.json:

1. In the same section, click **"Download google-services.json"**
2. Place it in: `android/app/google-services.json`
3. This file is needed for Android authentication to work

**IMPORTANT:** After adding the SHA-1 fingerprint, wait 2-5 minutes for Firebase to update its configuration before testing.

### 10. Configure CORS for Android

To fix the "Cross-Origin-Opener-Policy" errors in Android:

1. In Firebase Console, go to **Authentication > Settings**
2. Under **Authorized domains**, make sure you have:
   - `localhost`
   - Your production domain (if deploying)

**Note:** The Android app now uses `signInWithRedirect` instead of `signInWithPopup`, which properly handles the authentication flow in mobile WebView.

### 11. Test Your Setup

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Try to sign up or sign in with Google
4. Check the browser console for any errors

**For Android Testing:**
```bash
npm run build
npx cap sync android
npx cap run android
```

The Android app will use redirect-based authentication which properly returns to the app after sign-in.

## 🔧 Troubleshooting

### "Unable to process request due to missing initial state"

- **Solution**: This happens when using popup-based auth in Android. The app now uses `signInWithRedirect` for mobile devices, which fixes this issue. Make sure to:
  1. Add SHA-1 fingerprint to Firebase (see step 9)
  2. Download and add `google-services.json` to `android/app/`
  3. Rebuild and sync: `npm run build && npx cap sync android`

### "Failed to get document because the client is offline"

- **Solution**: This is normal for the first load. Firebase is using offline persistence. Make sure your Firebase config is correct in `.env`

### "Pop-up was blocked"

- **Solution**: Allow pop-ups for `localhost` in your browser settings

### "Cross-Origin-Opener-Policy would block the window.closed call"

- **Solution**: This warning is normal for Google Sign-In in development. It won't affect functionality. For production, make sure your domain is added to authorized domains in Firebase.

### "Account not linked. You have to sign up first"

- **Solution**: This means you're trying to sign in with a Google account that hasn't been registered yet. Use the "Sign Up" flow first.

## 📱 Firebase for Android App

The Android app uses the same Firebase configuration. When you run:

```bash
npm run build
npx cap sync android
```

The Firebase config is automatically included in the Android build.

## 🎯 Next Steps

1. ✅ Set up Firebase project
2. ✅ Enable Google Authentication
3. ✅ Create Firestore database
4. ✅ Add environment variables
5. ✅ Test sign-up and sign-in flows
6. 🚀 Deploy to production

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
