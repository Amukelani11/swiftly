# Google Maps Navigation SDK Setup Guide

This guide explains how to set up **Google's built-in turn-by-turn navigation UI** inside your Swiftly React Native app. When users tap "Google Navigation", they'll get the full Google Maps navigation experience without leaving your app. The implementation uses your Supabase Edge Function for secure API key management.

## 🚀 What's Been Implemented

### ✅ Completed Components

1. **React Native Bridge** (`src/native/navigation.ts`)
   - `startTurnByTurn()` - Launches native navigation
   - `isNativeNavigationAvailable()` - Checks if native module is linked

2. **Provider UI Integration** (`src/screens/provider/ProviderTrip.tsx`)
   - "Start Turn-by-Turn" button that appears when native navigation is available
   - Seamless integration with existing route planning

3. **Android Implementation**
   - `NavigationModule.kt` - React Native bridge module
   - `NavActivity.kt` - Hosts Google Navigation UI
   - `NavigationPackage.kt` - Registers the native module
   - Updated `MainApplication.kt` to include the package

4. **iOS Implementation**
   - `NavigationModule.swift` - React Native bridge module
   - `NavViewController.swift` - Hosts Google Navigation UI

5. **Configuration Updates**
   - Updated `app.json` with proper OS targets and permissions
   - Added Navigation SDK dependencies
   - Created Expo config plugin for automated setup

## 🛠️ Setup Instructions

### ⚠️ Windows Development Note

Since you're developing on Windows, you have a few options for iOS development:

- **EAS Build** (Recommended): Build iOS apps in the cloud
- **Expo Go**: Test on iOS devices without native builds
- **Mac Computer**: For full local iOS development

The setup below includes Windows-specific instructions.

### Step 1: API Key Setup

**Important**: Your implementation uses the Supabase Edge Function for secure API key management, so the API key stays server-side.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Navigation SDK** for your existing Google Maps API key
3. **No need to change `app.json`** - the API key is managed in your Supabase environment

### Step 2: Edge Function Environment

Make sure your Supabase Edge Function has the correct environment variable:

```bash
# In your Supabase project settings, ensure:
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

The edge function (`supabase/functions/google-maps-proxy/index.ts`) automatically uses this API key for all Google Maps requests.

### Step 3: Prebuild Your App

Since you're using Expo, run prebuild to generate native code:

```bash
# If using npm
npx expo prebuild

# If using pnpm
pnpm expo prebuild
```

This will:
- Generate native Android/iOS projects
- Apply the Expo config plugin for iOS permissions
- **Note**: Android Navigation SDK dependency needs to be verified (see Step 4)

### Step 4: Verify Dependencies

#### Android Dependencies
After prebuild, verify the Navigation SDK dependency is in `android/app/build.gradle`:

```gradle
dependencies {
    // ... other dependencies ...

    // Google Maps Navigation SDK
    implementation 'com.google.android.libraries.navigation:navigation:5.0.0'
}
```

If it's not there, add it manually to the dependencies block.

#### iOS Dependencies
The Navigation SDK pod is already added to `ios/Podfile`:
```ruby
pod 'GoogleNavigation', '5.0.0'
```

After prebuild, install iOS pods:

**For Windows users**: CocoaPods is not natively available on Windows. Use one of these approaches:

#### Option A: Use EAS Build (Recommended)
```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Build for iOS using EAS
npx eas build --platform ios --profile development
```

#### Option B: Use Expo Go (No native build needed)
```bash
npx expo start --clear
```
Then scan QR code with Expo Go app on iOS device.

#### Option C: Manual CocoaPods installation (Advanced)
If you must use local development:
```bash
# Install Ruby first, then:
gem install cocoapods
cd ios && pod install && cd ..
```

### Step 5: Build and Run

#### For Android (Windows Compatible):
```bash
# If using npm
npx expo run:android

# If using pnpm
pnpm expo run:android

# If using yarn
yarn expo run:android
```

#### For iOS on Windows:

**Option A: EAS Build (Recommended)**
```bash
# After installing EAS CLI
npm install -g @expo/eas-cli  # or pnpm add -g @expo/eas-cli
npx eas build --platform ios --profile development
# or: pnpm eas build --platform ios --profile development
```

**Option B: Expo Go (Quick Testing)**
```bash
npx expo start --clear
# or: pnpm expo start --clear
```
Then:
1. Install Expo Go on your iOS device
2. Scan the QR code displayed in terminal
3. Test navigation features on device

**Option C: Local Development (Requires Mac)**
```bash
npx expo run:ios
```

### ⚠️ Important: Google Navigation Requires Native Build

**Expo Go Limitation**: The Google Navigation SDK requires native modules that are not available in Expo Go. You need to build the app with native modules for Google Navigation to work.

**Solutions**:
- **Quick**: Use Android Studio emulator + `expo run:android`
- **Easier**: Use EAS Build (cloud build) + install on device
- **Simplest**: Stick with Expo Go + in-app navigation (already works!)

### 🛠️ Setting Up Android Development on Windows

#### Option A: Android Studio Emulator (Recommended)
1. **Download Android Studio**: https://developer.android.com/studio
2. **Install Android SDK** during setup
3. **Create Virtual Device**:
   - Open Android Studio
   - Tools → Device Manager
   - Create new device (Pixel 4 recommended)
4. **Run emulator** before `expo run:android`

#### Option B: Physical Android Device
1. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging (enable)
2. **Connect device** via USB
3. **Allow USB debugging** when prompted

#### Option C: EAS Build (No local setup needed)
```bash
npm install -g @expo/eas-cli  # or: pnpm add -g @expo/eas-cli
npx eas build --platform android --profile development
# or: pnpm eas build --platform android --profile development
```

Then install the APK on your device.

## 🔒 Security & Edge Function Integration

### Why Use Edge Functions?

- **API Key Security**: Your Google Maps API key stays server-side, never exposed to the client
- **Request Throttling**: Edge function can implement rate limiting and usage monitoring
- **Error Handling**: Centralized error handling and logging
- **Cost Control**: Better visibility into API usage and costs

### How Edge Function Calls Work

1. **Geocoding**: `src/native/navigation.ts` → Supabase Edge Function → Google Maps Geocoding API
2. **Directions**: ProviderTrip screen → Edge Function → Google Maps Directions API
3. **Navigation**: Native modules receive geocoded coordinates → Google Navigation SDK

### Request Flow

```
React Native App → Supabase Edge Function → Google Maps API → App
     ↓                    ↓                        ↓         ↓
   geocodeAddress() → google-maps-proxy → Geocoding API → Lat/Lng coords
   getDirections()  → google-maps-proxy → Directions API → Route data
```

## 🔧 How It Works

### User Flow
1. Provider opens a trip in `ProviderTrip` screen
2. "Google Navigation" button launches **Google's built-in navigation UI**
3. Provider gets **full Google Maps turn-by-turn experience** inside your app
4. Voice guidance, live traffic, lane guidance, speed limits - everything Google provides
5. **No app switching required** - stays within Swiftly

### Technical Flow
1. JavaScript calls `startTurnByTurn()` with origin, destination, and waypoints
2. React Native bridge passes data to native NavigationModule
3. Native module launches `NavActivity` (Android) or `NavViewController` (iOS)
4. **Google Navigation SDK creates full-screen navigation UI**
5. **Google handles all navigation logic**: voice guidance, live traffic, rerouting, lane guidance
6. User sees Google's professional navigation interface within Swiftly app

## 🐛 Troubleshooting

### Google Navigation Button Not Working
- Check console logs for "Navigation Module available:" messages
- Make sure you've run `expo prebuild` and built the native app
- Verify the Navigation SDK is enabled in your Google Cloud Console
- Check that your API key has Navigation SDK permissions
- For iOS: Make sure CocoaPods dependencies are installed
- For Android: Verify the Navigation SDK dependency is in build.gradle

### Build Errors

#### Android
- Ensure minSdkVersion is 23 or higher
- Check that Google Play Services are up to date
- Verify API key is properly configured

#### iOS
- Ensure deployment target is iOS 13.0 or higher
- Run `pod install` after prebuild
- Check that CocoaPods is installed (`gem install cocoapods`)

### Runtime Errors
- Check device logs for Navigation SDK errors
- Verify location permissions are granted
- Ensure Google Play Services (Android) or Maps app (iOS) is installed

## 📱 Features Included

- ✅ Full turn-by-turn navigation
- ✅ Voice guidance
- ✅ Live traffic updates
- ✅ Automatic rerouting
- ✅ Speed limit warnings
- ✅ Traffic light guidance
- ✅ Lane guidance
- ✅ Speedometer display

## 🎯 Fallback Behavior

If the native Navigation SDK isn't available:
- The "Start Turn-by-Turn" button won't appear
- Providers still get in-app route guidance with step-by-step instructions
- No functionality is lost

## 🚦 Next Steps

1. Test the implementation on physical devices
2. Customize the navigation UI colors/theme if needed
3. Add navigation-specific features (arrival notifications, etc.)
4. Consider adding navigation history/logging

## 📚 Additional Resources

- [Google Navigation SDK for Android](https://developers.google.com/maps/documentation/navigation/android-sdk)
- [Google Navigation SDK for iOS](https://developers.google.com/maps/documentation/navigation/ios-sdk)
- [Expo Native Modules Guide](https://docs.expo.dev/modules/native-module-tutorial/)

---

## 🔄 Updating Your Built APK App

**Question: How do I update the code in my APK after making changes?**

### 🎯 Four Ways to Update Your APK:

#### Method 1: Development Builds (Best for Development)
```bash
# Creates APK that auto-updates with code changes
eas build --platform android --profile development
```
- ✅ **Auto-updates** when you make code changes
- ✅ **No need to rebuild** for every change
- ✅ **Perfect for development**

#### Method 2: Preview Builds (Manual Updates)
```bash
# Creates new APK for each code change
eas build --platform android --profile preview
```
- ✅ **Clean APK** with latest code
- ✅ **Manual rebuild** required for changes
- ✅ **Good for testing specific versions**

#### Method 3: Expo Go (Instant Updates)
```bash
# Continue using Expo Go for development
pnpm expo start
```
- ✅ **Instant updates** - no rebuild needed
- ✅ **Perfect for rapid development**
- ✅ **Test changes immediately**

#### Method 4: OTA Updates (Production)
```bash
# Push updates to existing installed apps
eas update --platform android
```
- ✅ **Update without app store**
- ✅ **Works with published apps**
- ✅ **No user app store visits needed**

### 📋 Recommended Development Workflow:

1. **Development**: Use Expo Go (`pnpm expo start`)
2. **Testing**: Use Development builds (`eas build --platform android --profile development`)
3. **Production**: Use Preview builds + OTA updates

### 🚀 Quick Start for Updates:

```bash
# For instant development updates:
pnpm expo start

# For APK with auto-updates:
eas build --platform android --profile development

# For production updates:
eas update --platform android
```

## 📱 APK Update Behavior

### ❓ "Will my downloaded APK update when I change code locally?"

**It depends on which build type you used:**

#### ✅ Development Builds (Auto-Update)
```bash
eas build --platform android --profile development
```
- ✅ **YES** - Updates automatically when you change code
- ✅ **Connects to your dev server**
- ✅ **Perfect for development**

#### ❌ Preview Builds (Static APK)
```bash
eas build --platform android --profile preview
```
- ❌ **NO** - Static APK, doesn't update with code changes
- ❌ **Must rebuild** for each code change
- ✅ **Good for testing specific versions**

#### ✅ Expo Go (Always Updates)
```bash
pnpm expo start
```
- ✅ **YES** - Always reflects your latest code instantly
- ✅ **Perfect for development**
- ✅ **No rebuild needed**

### 🔍 Check Your APK Type:

**Look at your APK filename:**
- `your-app-dev.apk` → Development build (auto-updates) ✅
- `your-app.apk` → Preview build (static) ❌

### 🎯 Recommendation:

**For development with auto-updates:**
```bash
eas build --platform android --profile development
```

**For instant updates (best for development):**
```bash
pnpm expo start  # Use Expo Go
```

## 🔄 Updating Your Development APK

### ⚡ Code Changes (Auto-Update):

**You DON'T need to rebuild for code changes!**

```javascript
// Make any code change
// Save file (Ctrl+S)
// APK updates automatically! 🎉
```

**Test it:**
- Change the red background to blue in ProviderDashboard.tsx
- Save file
- APK should update instantly with blue background

### 📦 Package Changes (Manual Rebuild):

**You DO need to rebuild when adding packages:**

```bash
# Add package
pnpm add new-package

# Rebuild APK (download new version)
eas build --platform android --profile development
```

### 🔍 Troubleshooting Auto-Updates:

**If APK doesn't auto-update:**

1. **Confirm it's a development build:**
   ```bash
   # Check EAS dashboard - should show "development" environment
   ```

2. **Restart development server:**
   ```bash
   pnpm expo start --clear
   ```

3. **Rebuild if needed:**
   ```bash
   eas build --platform android --profile development
   ```

### 📱 Quick Verification:

**Look for these signs your APK is auto-updating:**
- ✅ Red background (we added this)
- ✅ "🚀 APK UPDATED!" text in greeting
- ✅ Changes appear immediately after saving

## 🔧 Troubleshooting Development APK Connection

### 📱 "Searching for development server" Error:

**1. Check your IP address:**
```bash
# Run this to see your computer's IP:
(Get-NetIPAddress | Where-Object { $_.AddressFamily -eq "IPv4" -and $_.IPAddress -like "192.168.*" }).IPAddress
```

**2. Make sure APK and computer are on same network:**
- ✅ **Same WiFi network** (not mobile data)
- ✅ **No VPN active**
- ✅ **Firewall not blocking** (disable temporarily to test)

**3. Check development server URL:**
- ✅ Look for: `http://192.168.1.107:8081` (or similar)
- ✅ Make sure APK is trying to connect to this URL

**4. Restart development server:**
```bash
pnpm expo start --clear
```

**5. If still not working:**
```bash
# Try tunnel mode (works anywhere)
pnpm expo start --tunnel
```

### 🔍 Common Solutions:

**Firewall Issue:**
- Temporarily disable Windows Firewall
- Or add exception for port 8081

**Network Issue:**
- Connect APK device to same WiFi as computer
- Check if mobile data is disabled on APK device

**IP Address Issue:**
- Make sure APK is connecting to correct IP (192.168.1.107)
- Try different IP if you have multiple network adapters

**Note**: The Navigation SDK is now publicly available and doesn't require special access. Make sure your API key has the Navigation SDK enabled in Google Cloud Console.
