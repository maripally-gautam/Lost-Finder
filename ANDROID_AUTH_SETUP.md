# Android Authentication Setup Guide

## 🚨 IMPORTANT: Follow these steps to fix Google Sign-In on Android

### Problem
- Sign-in button stays on "Signing in..."
- Browser doesn't return to app after selecting Google account
- Error: "Unable to process request due to missing initial state"

### Solution
The app now uses `signInWithRedirect` for Android (instead of popup), but you need to configure Firebase properly.

---

## Step-by-Step Fix

### 1. Get Your SHA-1 Fingerprint

Open terminal in your project directory and run:

**Windows:**
```powershell
cd android
.\gradlew signingReport
```

**macOS/Linux:**
```bash
cd android
./gradlew signingReport
```

### 2. Find Your SHA-1

Look for output like this:
```
Variant: debug
Config: debug
Store: C:\Users\YourName\.android\debug.keystore
Alias: androiddebugkey
MD5: A1:B2:C3:...
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA-256: ...
```

**Copy the SHA1 value** (e.g., `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`)

### 3. Add SHA-1 to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** → **Project settings**
4. Scroll down to **"Your apps"** section
5. If you don't have an Android app yet:
   - Click **"Add app"** → Select **Android**
   - Package name: `com.lostlink.ai` (from capacitor.config.ts)
   - App nickname: `LostLink AI`
   - Click **Register app**

6. Under your Android app, find **"SHA certificate fingerprints"**
7. Click **"Add fingerprint"**
8. Paste your SHA-1 fingerprint
9. Click **Save**

### 4. Download google-services.json

1. In the same Firebase Console page, click **"Download google-services.json"**
2. Save the file
3. Copy it to: `android/app/google-services.json`

**Verify the file location:**
```
Lost-Finder/
└── android/
    └── app/
        └── google-services.json  ← File should be here
```

### 5. Verify google-services.json Content

Open `android/app/google-services.json` and make sure it has your project info:
```json
{
  "project_info": {
    "project_id": "your-project-id",
    ...
  },
  "client": [
    {
      "client_info": {
        "android_client_info": {
          "package_name": "com.lostlink.ai"
        }
      },
      ...
    }
  ]
}
```

### 6. Rebuild and Test

```bash
npm run build
npx cap sync android
npx cap run android
```

### 7. Wait 2-5 Minutes

After adding the SHA-1 fingerprint, **Firebase needs 2-5 minutes** to update its configuration. If it still doesn't work immediately, wait a few minutes and try again.

---

## How It Works Now

### Web Browser (localhost)
- Uses `signInWithPopup` ✅
- Opens Google Sign-In in a popup window
- Works immediately

### Android App  
- Uses `signInWithRedirect` ✅
- Opens Google Sign-In in the browser
- Returns to app after selecting account
- Automatically processes the result

---

## Testing Checklist

- [ ] SHA-1 fingerprint added to Firebase
- [ ] `google-services.json` downloaded and placed in `android/app/`
- [ ] Waited 2-5 minutes after adding SHA-1
- [ ] Rebuilt app: `npm run build`
- [ ] Synced Capacitor: `npx cap sync android`
- [ ] Tested on Android device
- [ ] Sign-in redirects to Google
- [ ] Returns to app after selecting account
- [ ] Successfully logs in

---

## Common Issues

### Issue: "Sign-in cancelled. Please try again."
**Solution:** This happens if you close the browser before completing sign-in. Try again and complete the sign-in flow.

### Issue: Still showing "Signing in..." forever
**Solutions:**
1. Make sure SHA-1 is added correctly in Firebase
2. Verify `google-services.json` is in the correct location
3. Wait 5 minutes after adding SHA-1
4. Clear app data: Settings → Apps → LostLink AI → Storage → Clear Data
5. Rebuild: `npm run build && npx cap sync android`

### Issue: App crashes when clicking sign-in
**Solution:** Check `google-services.json` is present and has correct package name (`com.lostlink.ai`)

### Issue: "Developer Error" in Google Sign-In
**Solution:**
1. Wrong SHA-1 fingerprint → Re-run `gradlew signingReport` and verify
2. Wrong package name in Firebase → Must be exactly `com.lostlink.ai`
3. Need to wait for Firebase to update → Wait 5 minutes

---

## Production Release

For production builds, you'll need to add **both** SHA-1 fingerprints:

1. **Debug SHA-1** (from debug.keystore) - for development
2. **Release SHA-1** (from your release keystore) - for production

Get release SHA-1:
```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your_alias
```

---

## Quick Reference

**Package Name:** `com.lostlink.ai`
**Debug Keystore Location:** `C:\Users\YourName\.android\debug.keystore`
**google-services.json Location:** `android/app/google-services.json`

**Firebase Console:** https://console.firebase.google.com/
**Android Settings:** Project Settings → Your Apps → Android app

---

## Need Help?

If you're still having issues:
1. Check the Android Logcat for errors: `adb logcat | grep -i firebase`
2. Verify Firebase Authentication is enabled in Firebase Console
3. Make sure Google Sign-In provider is enabled in Authentication → Sign-in method
4. Check that your Firebase project has the correct configuration
