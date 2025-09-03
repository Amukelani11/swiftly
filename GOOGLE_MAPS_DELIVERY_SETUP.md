# 🚚 **Google Maps Platform Setup for Delivery App**

## 📋 **Complete API Checklist for Swiftly Delivery**

### **1. Core Maps APIs (Required)**
| API | Enable In Console | Purpose | Usage |
|-----|------------------|---------|-------|
| **Maps SDK for Android** | ✅ Required | Display maps in Android app | `react-native-maps` |
| **Maps SDK for iOS** | ✅ Required | Display maps in iOS app | `react-native-maps` |
| **Directions API** | ✅ Required | Calculate routes between locations | Route optimization |
| **Distance Matrix API** | ✅ Required | Calculate distances/times for multiple locations | ETA calculations |
| **Geocoding API** | ✅ Required | Convert addresses ↔ coordinates | Address validation |
| **Places API** | ✅ Required | Find stores/restaurants | Pickup location discovery |

### **2. Enhanced Maps APIs (Recommended)**
| API | Enable In Console | Purpose | Usage |
|-----|------------------|---------|-------|
| **Places SDK for Android** | 🔸 Optional | Native place search on Android | Faster place discovery |
| **Places SDK for iOS** | 🔸 Optional | Native place search on iOS | Faster place discovery |
| **Routes API** | 🔸 Optional | Advanced routing with traffic | Better route optimization |
| **Roads API** | 🔸 Optional | Snap-to-road functionality | GPS accuracy improvement |
| **Address Validation API** | 🔸 Optional | Validate delivery addresses | Prevent failed deliveries |

### **3. Supporting APIs (Optional but Useful)**
| API | Enable In Console | Purpose | Usage |
|-----|------------------|---------|-------|
| **Geolocation API** | 🔸 Optional | Get user location from IP | Location services |
| **Elevation API** | 🔸 Optional | Get elevation data | Route planning |
| **Time Zone API** | 🔸 Optional | Get timezone information | Delivery scheduling |
| **Static Maps API** | 🔸 Optional | Generate map images | Order previews |
| **Street View API** | 🔸 Optional | Street-level imagery | Location verification |

---

## 🛠️ **Step-by-Step Setup Guide**

### **Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `swiftly-delivery-app`
3. Note your **Project ID**

### **Step 2: Enable Required APIs**
Navigate to **APIs & Services > Library** and enable:

#### **🔴 CRITICAL - Enable These First:**
```
✅ Maps SDK for Android
✅ Maps SDK for iOS
✅ Directions API
✅ Distance Matrix API
✅ Geocoding API
✅ Places API
```

#### **🟡 RECOMMENDED - Enable These Next:**
```
🔸 Places SDK for Android
🔸 Places SDK for iOS
🔸 Routes API
🔸 Roads API
🔸 Address Validation API
```

#### **🔵 OPTIONAL - Enable If Needed:**
```
🔸 Geolocation API
🔸 Elevation API
🔸 Time Zone API
🔸 Static Maps API
🔸 Street View API
```

### **Step 3: Create API Key**
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. **Restrict the API key** (IMPORTANT for security):
   - **Application restrictions**: Android apps + iOS apps
   - **API restrictions**: Select only the APIs you enabled
4. Copy the API key (keep it secure!)

### **Step 4: Mobile App Configuration**

#### **Android Setup** (`android/app/src/main/AndroidManifest.xml`):
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application>
        <!-- Add your API key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_API_KEY_HERE"/>
    </application>
</manifest>
```

#### **iOS Setup** (`ios/Swiftly/AppDelegate.m`):
```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [GMSServices provideAPIKey:@"YOUR_API_KEY_HERE"];
    return YES;
}
```

### **Step 5: Supabase Edge Function Setup**
1. Set your API key as a secret:
```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your_api_key_here
```

2. Deploy the edge function:
```bash
supabase functions deploy google-maps-proxy
```

---

## 🎯 **API Usage Examples for Delivery App**

### **Finding Pickup Locations**
```typescript
import { googleMaps } from '../lib/googleMaps';

// Find grocery stores for pickup
const stores = await googleMaps.findPickupLocations(
  { lat: -26.2041, lng: 28.0473 }, // Sandton coordinates
  {
    radius: 2000,
    type: 'grocery_or_supermarket',
    openNow: true,
    keyword: 'checkers OR woolworths OR pnp'
  }
);
```

### **Calculating Delivery Routes**
```typescript
// Calculate route with multiple stops
const route = await googleMaps.calculateDeliveryRoute(
  'Store Location',
  [
    'Customer 1 Address',
    'Customer 2 Address',
    'Customer 3 Address'
  ],
  {
    optimizeWaypoints: true,
    mode: 'driving',
    avoid: ['tolls']
  }
);
```

### **Real-time ETAs**
```typescript
// Get ETA for active delivery
const eta = await googleMaps.getDeliveryETA(
  providerLocation,
  customerAddress,
  {
    departureTime: 'now',
    trafficModel: 'best_guess'
  }
);

console.log(`ETA: ${eta.duration.text} (${eta.distance.text})`);
console.log(`Route Polyline: ${eta.polyline}`); // For map display
```

### **Address Validation**
```typescript
// Validate delivery address before accepting order
const validation = await googleMaps.validateDeliveryAddress(
  '123 Main Street, Sandton'
);

if (validation.isValid) {
  console.log(`Confirmed: ${validation.formattedAddress}`);
} else {
  console.log(`Invalid address: ${validation.error}`);
}
```

### **Address Autocomplete**
```typescript
// Help customers enter delivery addresses
const suggestions = await googleMaps.getDeliveryAddressSuggestions(
  '123 Main St',
  {
    location: { lat: -26.2041, lng: 28.0473 },
    radius: 50000,
    components: { country: 'za' }
  }
);
```

---

## 🚦 **API Quotas & Pricing**

### **Free Tier Limits (Monthly)**
| API | Free Requests | Cost After |
|-----|--------------|------------|
| Directions API | 40,000 | $0.005/request |
| Distance Matrix API | 40,000 | $0.005/request |
| Geocoding API | 40,000 | $0.005/request |
| Places API | 20,000 | $0.017/request |
| Maps SDK (Mobile) | Unlimited | $0.007/request |

### **Billing Alerts Setup**
1. Go to **Billing > Budgets & alerts**
2. Set up alerts at $50, $100, $500
3. Monitor usage in **APIs & Services > Dashboard**

---

## 🔒 **Security Best Practices**

### **API Key Restrictions**
```bash
# Restrict to your domain (if using web)
# Restrict to your mobile apps
# Never expose in client-side code (we're using proxy!)
```

### **Mobile App Security**
- Use **App Check** to prevent abuse
- Implement **API key restrictions** by app package/bundle ID
- Use **IP restrictions** for development
- Rotate keys regularly

### **Edge Function Security**
- Our proxy automatically handles API key security
- All requests are logged for monitoring
- Rate limiting can be added at edge function level

---

## 🐛 **Troubleshooting**

### **"API key not valid"**
- Verify the key is enabled for required APIs
- Check application restrictions match your app
- Ensure billing is enabled on the project

### **"Daily quota exceeded"**
- Monitor usage in Google Cloud Console
- Implement caching for frequently requested data
- Upgrade to paid plan if needed

### **"Invalid request"**
- Check parameter formats in our edge function
- Verify coordinates are in correct format (lat,lng)
- Ensure addresses are properly encoded

---

## 🎉 **Ready to Launch!**

Your delivery app now has **enterprise-grade mapping capabilities**:

✅ **Secure API proxy** - No exposed keys
✅ **All delivery APIs** - From pickup to delivery
✅ **Real-time routing** - With traffic updates
✅ **Address validation** - Prevent failed deliveries
✅ **Store discovery** - Find pickup locations
✅ **Mobile optimized** - Native Android/iOS support

**Time to revolutionize delivery logistics!** 🚚✨

---

## 📚 **Additional Resources**

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Maps SDK for React Native](https://github.com/react-native-maps/react-native-maps)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Mobile App Security Best Practices](https://developers.google.com/maps/api-security-best-practices)

**Questions?** The setup is complete and ready to scale! 🚀


