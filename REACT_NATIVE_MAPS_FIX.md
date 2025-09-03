# 🚨 **React Native Maps TurboModule Error - Complete Fix**

## ❌ **Error: TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found**

This error occurs when `react-native-maps` is not properly installed or linked. Here's the complete fix:

---

## 🔧 **Complete Installation Guide**

### **Step 1: Clean Install**

```bash
# Remove existing installation
npm uninstall react-native-maps

# Clear caches
npm cache clean --force
cd android && ./gradlew clean
cd ..
```

### **Step 2: Fresh Installation**

```bash
# Install with correct version
npm install react-native-maps@1.8.0

# For Expo projects
npx expo install react-native-maps expo-location

# For bare React Native (iOS)
cd ios && pod install
```

### **Step 3: Android Configuration**

#### **1. MainApplication.java**
```java
import com.airbnb.android.react.maps.MapsPackage;

public class MainApplication extends Application implements ReactApplication {
    @Override
    protected List<ReactPackage> getPackages() {
        return Arrays.<ReactPackage>asList(
            new MainReactPackage(),
            new MapsPackage()  // Add this line
        );
    }
}
```

#### **2. android/settings.gradle**
```gradle
include ':react-native-maps'
project(':react-native-maps').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-maps/lib/android')
```

#### **3. android/app/build.gradle**
```gradle
dependencies {
    implementation project(':react-native-maps')

    // Add Google Play services
    implementation 'com.google.android.gms:play-services-maps:18.1.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    implementation 'com.google.android.gms:play-services-base:18.1.0'
}
```

#### **4. AndroidManifest.xml**
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

### **Step 4: iOS Configuration**

#### **1. Podfile**
```ruby
platform :ios, '11.0'

target 'Swiftly' do
  use_react_native!

  pod 'react-native-maps', path: '../node_modules/react-native-maps'
  pod 'GoogleMaps'
  pod 'Google-Maps-iOS-Utils'
end
```

#### **2. Install Pods**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

#### **3. AppDelegate.m**
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [GMSServices provideAPIKey:@"YOUR_API_KEY_HERE"];
    return YES;
}
```

#### **4. Info.plist**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Swiftly needs your location to show nearby stores and optimize delivery routes.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Swiftly needs your location to provide real-time delivery tracking.</string>
<key>GMSApiKey</key>
<string>YOUR_API_KEY_HERE</string>
```

---

## 🐛 **Alternative Quick Fix Methods**

### **Method 1: Clear Metro Bundler**
```bash
# Stop Metro bundler
# Close all terminals

# Clear all caches
npx react-native start --reset-cache

# Rebuild
npx react-native run-android
```

### **Method 2: Clean Build**
```bash
# Android
cd android
./gradlew clean
cd ..
npx react-native run-android --clean

# iOS
cd ios
rm -rf build
cd ..
npx react-native run-ios --clean
```

### **Method 3: Reinstall Everything**
```bash
# Complete reset
rm -rf node_modules package-lock.json
npm install

# Reinstall maps
npm install react-native-maps@1.8.0

# Clean and rebuild
cd android && ./gradlew clean
cd ..
npx react-native run-android
```

---

## 📱 **Expo Projects - Special Setup**

If you're using Expo, use this simplified setup:

```bash
# Install with Expo
npx expo install react-native-maps expo-location

# Update app.json
{
  "expo": {
    "plugins": [
      [
        "react-native-maps",
        {
          "ios": {
            "config": {
              "googleMapsApiKey": "YOUR_API_KEY_HERE"
            }
          },
          "android": {
            "config": {
              "googleMaps": {
                "apiKey": "YOUR_API_KEY_HERE"
              }
            }
          }
        }
      ]
    ]
  }
}
```

---

## 🧪 **Test Your Installation**

### **1. Basic Map Test**
```typescript
import MapView from 'react-native-maps';

export default function TestScreen() {
  return (
    <MapView
      style={{ flex: 1 }}
      region={{
        latitude: -26.2041,
        longitude: 28.0473,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    />
  );
}
```

### **2. Check Installation**
```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios

# Check for errors in logs
npx react-native log-android
```

---

## 🔍 **Common Issues & Solutions**

### **"Could not find method google()"**
```gradle
// android/build.gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

### **"Google Play services out of date"**
```gradle
// android/app/build.gradle
dependencies {
    implementation 'com.google.android.gms:play-services-maps:18.1.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
}
```

### **iOS Build Errors**
```bash
# Clean and reinstall
cd ios
rm -rf Pods Podfile.lock build
pod install
cd ..
```

### **Metro Bundler Issues**
```bash
# Kill Metro
pkill -f "metro"

# Clear cache
npx react-native start --reset-cache
```

---

## 🎯 **Verify Everything Works**

Once installed, test your LiveMap component:

```typescript
import LiveMap from '../components/LiveMap';

export default function ProviderDashboard() {
  return (
    <LiveMap
      visible={true}
      providerLocation={{ latitude: -26.2041, longitude: 28.0473 }}
      onLocationPress={() => console.log('Location pressed')}
      onStoreSelect={(store) => console.log('Store selected:', store)}
    />
  );
}
```

---

## 🚀 **Success Checklist**

- ✅ `react-native-maps` installed
- ✅ Native modules linked (Android/iOS)
- ✅ Google Maps API key configured
- ✅ Permissions added
- ✅ Pods installed (iOS)
- ✅ Build succeeds without errors
- ✅ Map renders in app

**If you still get errors, share the exact error message and I'll help you fix it!** 🛠️

**Ready to see your native Google Maps working?** 🗺️✨


