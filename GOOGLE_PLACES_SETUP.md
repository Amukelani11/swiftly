# Google Places Autocomplete Setup

## Steps to Add Google Places Autocomplete

1. **Get Google Places API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Places API (New)" and "Geocoding API"
   - Create API key and restrict it to your app

2. **Add API Key to Environment**:
   ```bash
   # Add to .env file
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_actual_api_key_here
   ```

3. **Replace TextInput with GooglePlacesAutocomplete**:
   - Uncomment the import in CustomerDashboard.tsx
   - Replace the TextInput in the modal with the GooglePlacesAutocomplete component
   - Use the handlePlaceSelect function instead of saveAddress

## Current Status
- ✅ Package installed: `react-native-google-places-autocomplete@2.5.7`
- ✅ Basic location modal working
- ✅ Address saving to database
- ✅ Distance calculation implemented
- ⏳ Need API key to enable Google Places

## Fallback
The current implementation uses a simple text input that works perfectly for now.
Users can manually enter addresses and they'll be saved to their profile.

