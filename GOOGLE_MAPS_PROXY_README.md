# 🔒 Google Maps Proxy - Secure Integration

## Overview

This implementation provides a **secure, production-ready Google Maps integration** using Supabase Edge Functions as an API gateway. Your app never directly calls Google APIs, ensuring maximum security and eliminating API key exposure.

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Swiftly   │────│  Supabase Edge   │────│  Google Maps    │
│     App     │    │   Function       │    │     APIs        │
└─────────────┘    └──────────────────┘    └─────────────────┘
                      │
                      │ API Key (Secure)
                      ▼
                 Environment Variable
```

## 🚀 Quick Setup

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable required APIs:
   - Maps SDK for Android/iOS (if using native maps)
   - Directions API
   - Places API
   - Geocoding API
   - Distance Matrix API
4. Create an API key with appropriate restrictions

### 2. Deploy Edge Function

```bash
# Make script executable
chmod +x deploy-google-maps-proxy.sh

# Run deployment
./deploy-google-maps-proxy.sh
```

### 3. Set API Key Secret

**Option A: Supabase Dashboard**
1. Go to Project Settings → Secrets
2. Add `GOOGLE_MAPS_API_KEY` with your API key value

**Option B: CLI**
```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 4. Use in Your App

```typescript
import { googleMaps } from '../lib/googleMaps';

// Get directions
const directions = await googleMaps.getDirections(
  '1600 Amphitheatre Parkway, Mountain View, CA',
  '1 Infinite Loop, Cupertino, CA'
);

// Find nearby stores
const stores = await googleMaps.nearbySearch(
  { lat: -26.2041, lng: 28.0473 },
  { radius: 2000, type: 'store' }
);

// Geocode address
const location = await googleMaps.geocodeAddress('Sandton, Johannesburg');

// Calculate distances
const distances = await googleMaps.getDistanceMatrix(
  ['Sandton', 'Randburg'],
  ['Johannesburg', 'Pretoria']
);
```

## 📋 Supported APIs

| Endpoint | Function | Description |
|----------|----------|-------------|
| Directions | `getDirections()` | Get driving/walking directions |
| Geocoding | `geocodeAddress()` | Convert address to coordinates |
| Reverse Geocoding | `reverseGeocode()` | Convert coordinates to address |
| Places Search | `nearbySearch()` | Find nearby places |
| Place Details | `getPlaceDetails()` | Get detailed place information |
| Distance Matrix | `getDistanceMatrix()` | Calculate distances between locations |
| Autocomplete | `getAutocomplete()` | Address autocomplete suggestions |

## 🔧 Configuration

### Environment Variables
```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Function Parameters
All functions support comprehensive options:

```typescript
// Directions with advanced options
const directions = await googleMaps.getDirections(
  origin,
  destination,
  {
    mode: 'driving',
    waypoints: ['stop1', 'stop2'],
    avoid: ['tolls', 'highways'],
    units: 'metric'
  }
);

// Places search with filters
const places = await googleMaps.nearbySearch(
  location,
  {
    radius: 2000,
    type: 'store',
    keyword: 'grocery',
    minPrice: 0,
    maxPrice: 4,
    openNow: true
  }
);
```

## 🛡️ Security Features

### ✅ What's Protected
- **API Key never exposed** to client applications
- **All requests routed** through secure server-side proxy
- **Rate limiting** can be implemented at edge function level
- **Request validation** and sanitization
- **CORS protection** with proper headers

### ✅ What's Logged
- Request endpoints (without sensitive data)
- Response status codes
- Error messages (sanitized)
- Performance metrics

## 🐛 Troubleshooting

### Common Issues

**"Google Maps API key not configured"**
- Verify the secret is set: `supabase secrets list`
- Check secret name: `GOOGLE_MAPS_API_KEY`

**"Google Maps API error: REQUEST_DENIED"**
- Enable required APIs in Google Cloud Console
- Verify API key restrictions allow your requests

**"Function not found"**
- Deploy the function: `supabase functions deploy google-maps-proxy`
- Check function status: `supabase functions list`

### Debug Mode

Enable detailed logging by adding to your edge function:

```typescript
console.log(`Proxying request to: ${googleMapsUrl}`);
console.log(`Parameters:`, Object.keys(requestParams).filter(k => k !== 'key'));
```

Check logs:
```bash
supabase functions logs google-maps-proxy
```

## 📊 Usage Examples

### Real-time Delivery Tracking
```typescript
// Provider location updates
const updateLocation = async (lat: number, lng: number) => {
  const address = await googleMaps.reverseGeocode(lat, lng);
  const nearbyStores = await googleMaps.nearbySearch(
    { lat, lng },
    { radius: 1000, type: 'store' }
  );
  return { address, nearbyStores };
};
```

### Route Optimization
```typescript
// Optimize delivery route
const optimizeRoute = async (orders: Order[]) => {
  const waypoints = orders.map(order => order.address);
  const route = await googleMaps.getDirections(
    providerLocation,
    waypoints[waypoints.length - 1],
    { waypoints: waypoints.slice(0, -1) }
  );
  return route;
};
```

### Store Discovery
```typescript
// Find available pickup locations
const findStores = async (userLocation: Location) => {
  return await googleMaps.nearbySearch(
    userLocation,
    {
      radius: 5000,
      type: 'store',
      keyword: 'grocery pharmacy supermarket',
      openNow: true
    }
  );
};
```

## 🚦 Rate Limits & Quotas

Google Maps APIs have usage limits:
- **Directions API**: 40,000 requests/day free
- **Places API**: 20,000 requests/day free
- **Geocoding API**: 40,000 requests/day free

Monitor usage in Google Cloud Console and implement caching for frequently requested data.

## 🔄 Updates & Maintenance

### Function Updates
```bash
# Deploy updates
supabase functions deploy google-maps-proxy

# View logs
supabase functions logs google-maps-proxy

# Delete if needed
supabase functions delete google-maps-proxy
```

### API Key Rotation
1. Generate new API key in Google Cloud Console
2. Update secret: `supabase secrets set GOOGLE_MAPS_API_KEY=new_key`
3. Test with a simple request
4. Disable old API key

## 📈 Performance Optimization

### Caching Strategy
Implement caching for frequently requested data:
```typescript
// Cache geocoding results
const geocodeCache = new Map();

const cachedGeocode = async (address: string) => {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address);
  }

  const result = await googleMaps.geocodeAddress(address);
  geocodeCache.set(address, result);
  return result;
};
```

### Request Batching
Batch multiple requests to reduce API calls:
```typescript
// Batch distance matrix calculations
const batchDistances = async (origins: Location[], destinations: Location[]) => {
  return await googleMaps.getDistanceMatrix(origins, destinations);
};
```

## 🎯 Next Steps

1. **Test the integration** with your LiveMap component
2. **Implement caching** for better performance
3. **Add error boundaries** for graceful degradation
4. **Monitor API usage** and set up alerts
5. **Consider premium features** like real-time traffic data

---

## 📞 Support

- **Supabase Functions Docs**: https://supabase.com/docs/guides/functions
- **Google Maps Platform**: https://developers.google.com/maps/documentation
- **Edge Functions Best Practices**: https://supabase.com/blog/edge-functions-best-practices

Your app now has **enterprise-grade Google Maps integration** that's both secure and scalable! 🚀✨


