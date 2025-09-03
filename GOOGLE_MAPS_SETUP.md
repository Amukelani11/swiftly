# Google Maps SDK Setup Guide

This guide will help you set up the Google Maps SDKs for both iOS and Android platforms in your Swiftly React Native app.

## Prerequisites

1. A Google Cloud Console account
2. A Google Maps API key

## Step 1: Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (if using Places functionality)
4. Create an API key in the Credentials section
5. Restrict the API key to your app:
   - For Android: Add your package name `com.swifty.app`
   - For iOS: Add your bundle ID `com.swifty.app`

## Step 2: Configure API Keys in app.json

Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key in the following locations:

### For iOS:
```json
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
  }
}
```

### For Android:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  }
}
```

## Step 3: Additional iOS Setup

For iOS, you may need to add the Google Maps SDK manually if using Expo's bare workflow:

1. Add the following to your `ios/Podfile`:
```ruby
pod 'GoogleMaps', '8.4.0'
```

2. Run `cd ios && pod install`

## Step 4: Test the Integration

1. Run the app on iOS/Android:
   ```bash
   # For iOS
   npx expo run:ios

   # For Android
   npx expo run:android
   ```

2. The LiveMap component should now display:
   - An interactive Google Map
   - Your current location marker
   - Nearby store markers
   - A list of stores below the map

## Features Included

- ✅ Native Google Maps SDK integration
- ✅ Location permissions configured
- ✅ MapView with markers for provider location and stores
- ✅ Interactive map with zoom and scroll
- ✅ Store list with details and selection functionality
- ✅ Real-time store data from Google Places API

## Troubleshooting

### iOS Issues:
- Ensure you have the latest version of Xcode
- Check that location permissions are properly set in Info.plist
- Verify the API key is correctly configured

### Android Issues:
- Ensure you have the correct package name
- Check that the API key has the right restrictions
- Verify Google Play Services is up to date on the device

### Common Errors:
- **"Google Maps SDK not configured"**: Check your API key configuration
- **Location permission denied**: Ensure permissions are requested properly
- **Map not loading**: Verify internet connection and API key validity

## Security Note

The app is configured to use a secure proxy system through Supabase Edge Functions for API calls, which helps protect your API keys and provides additional security layers.


