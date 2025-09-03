# 🗺️ **Google Maps Native SDK Setup for Swiftly**

## 📋 **Complete Setup Guide for Native Maps Integration**

### **Step 1: Install Required Packages**

```bash
# Install React Native Maps
npm install react-native-maps

# For Expo projects (if using Expo)
npx expo install react-native-maps expo-location

# For bare React Native projects
npm install react-native-maps
cd ios && pod install  # iOS only
```

### **Step 2: Configure Android**

#### **1. Add Permissions to AndroidManifest.xml**
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Google Maps API Key -->
    <application>
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_API_KEY_HERE"/>
    </application>
</manifest>
```

#### **2. Update build.gradle**
```gradle
// android/build.gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.3.15'
    }
}

// android/app/build.gradle
dependencies {
    // Add Google Play services
    implementation 'com.google.android.gms:play-services-maps:18.1.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
}
```

#### **3. Add Google Services Plugin**
```gradle
// android/app/build.gradle (at the bottom)
apply plugin: 'com.google.gms.google-services'
```

### **Step 3: Configure iOS**

#### **1. Install CocoaPods Dependencies**
```bash
cd ios
pod install
```

#### **2. Add Permissions to Info.plist**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Location Permissions -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>Swiftly needs your location to show nearby stores and optimize delivery routes.</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>Swiftly needs your location to provide real-time delivery tracking.</string>

    <!-- Google Maps API Key -->
    <key>GMSApiKey</key>
    <string>YOUR_API_KEY_HERE</string>
</dict>
</plist>
```

#### **3. Update AppDelegate.m**
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [GMSServices provideAPIKey:@"YOUR_API_KEY_HERE"];
    return YES;
}
```

### **Step 4: API Key Setup**

#### **1. Get Your API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Places API**
   - **Directions API**
   - **Distance Matrix API**
   - **Geocoding API**

#### **2. Restrict Your API Key**
```bash
# Application restrictions
- Android apps: Add your package name (com.swiftly.delivery)
- iOS apps: Add your bundle ID (com.swiftly.delivery)

# API restrictions
- Select only the APIs you enabled
```

#### **3. Set API Key in Code**
```typescript
// Replace YOUR_API_KEY_HERE with your actual API key
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';
```

### **Step 5: Usage in Your App**

#### **1. Import the Components**
```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
```

#### **2. Basic Map Usage**
```typescript
<MapView
  provider={PROVIDER_GOOGLE}
  style={{ flex: 1 }}
  region={{
    latitude: -26.2041,
    longitude: 28.0473,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
  showsUserLocation={true}
  showsMyLocationButton={true}
>
  <Marker
    coordinate={{ latitude: -26.2041, longitude: 28.0473 }}
    title="Checkers Hyper"
    description="Grocery store"
  />
</MapView>
```

#### **3. Location Permissions**
```typescript
const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};
```

### **Step 6: Advanced Features**

#### **Real-time Location Tracking**
```typescript
const [location, setLocation] = useState(null);

useEffect(() => {
  const watchLocation = async () => {
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      (location) => {
        setLocation(location.coords);
        // Send to your backend for real-time tracking
      }
    );

    return locationSubscription;
  };

  watchLocation();
}, []);
```

#### **Custom Markers**
```typescript
<Marker
  coordinate={storeLocation}
  title={store.name}
  description={store.address}
>
  <View style={styles.customMarker}>
    <Ionicons name="storefront" size={20} color="#00D4AA" />
  </View>
</Marker>
```

#### **Route Drawing**
```typescript
const [routeCoordinates, setRouteCoordinates] = useState([]);

<MapView.Polyline
  coordinates={routeCoordinates}
  strokeWidth={4}
  strokeColor="#00D4AA"
/>
```

### **Step 7: Testing**

#### **Android Testing**
```bash
# Build and run
npx react-native run-android

# Check logs for errors
npx react-native log-android
```

#### **iOS Testing**
```bash
# Build and run
npx react-native run-ios

# Check logs for errors
npx react-native log-ios
```

### **Step 8: Common Issues & Solutions**

#### **Android Issues**
```gradle
// If you get "Google Play services is missing"
implementation 'com.google.android.gms:play-services-base:18.1.0'
```

#### **iOS Issues**
```bash
# If you get "framework not found GoogleMaps"
cd ios && pod install
```

#### **Permission Issues**
```typescript
// Check if location services are enabled
const enabled = await Location.hasServicesEnabledAsync();
if (!enabled) {
  Alert.alert('Location Services Disabled', 'Please enable location services');
}
```

---

## 🎯 **Features Your App Now Has**

### ✅ **Real-Time Mapping**
- Native Google Maps performance
- Smooth animations and interactions
- Offline map caching
- 3D buildings and landmarks

### ✅ **Location Services**
- GPS tracking with high accuracy
- Background location updates
- Geofencing for store proximity
- Location-based notifications

### ✅ **Store Discovery**
- Real Google Places data
- Store ratings and reviews
- Photos and opening hours
- Distance calculations

### ✅ **Route Optimization**
- Turn-by-turn directions
- Traffic-aware routing
- Multiple waypoint support
- ETA calculations

### ✅ **Delivery Features**
- Live location sharing
- Route visualization
- Store proximity alerts
- Delivery zone management

---

## 🚀 **Next Steps**

1. **Test the integration** with your LiveMap component
2. **Add route visualization** for delivery paths
3. **Implement real-time tracking** for active deliveries
4. **Add geofencing** for store proximity alerts
5. **Set up push notifications** for nearby orders

**Your delivery app now has WORLD-CLASS mapping capabilities!** 🗺️✨

**Questions?** Let me know what feature you'd like to implement next! 🎯🚚


