import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../styles/theme';
import * as Location from 'expo-location';

type LatLng = { lat: number; lng: number };

interface Props {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  onClose?: () => void;
}

// Google Maps polyline decoder
const decodeGooglePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  let index = 0, lat = 0, lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];
  while (index < encoded.length) {
    let b = 0, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += dlat;
    shift = 0; result = 0; do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += dlng;
    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coordinates;
};

export default function MapboxNavSheet({ origin, destination, waypoints = [], onClose }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const googleApiKey = (Constants?.expoConfig as any)?.extra?.GOOGLE_MAPS_API_KEY || '';

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation([location.coords.longitude, location.coords.latitude]);
        }
      } catch (error) {
        console.warn('Failed to get location:', error);
      }
    };
    getLocation();
  }, []);

  // Generate Google Maps HTML
  const html = useMemo(() => {
    if (!googleApiKey) {
      return `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;"><h3>Google Maps API key not configured</h3></body></html>`;
    }

    const wp = waypoints.map(w => `${w.lng},${w.lat}`).join('|');
    const coords = [
      `${origin.lng},${origin.lat}`,
      ...(wp ? [wp] : []),
      `${destination.lng},${destination.lat}`
    ].join('|');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(0,0,0,0.7);
        border-radius: 50%;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255,255,255,0.9);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 999;
      }
    </style>
  </head>
  <body>
    <button id="close-btn" onclick="window.ReactNativeWebView.postMessage('close')">✕</button>
    <div id="map"></div>

    <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=geometry,places,directions&callback=initMap"></script>
    <script>
      let map;
      let directionsService;
      let directionsRenderer;

      window.initMap = function() {
        const centerLatLng = ${userLocation ? `{lat: ${userLocation[1]}, lng: ${userLocation[0]}}` : `{lat: ${origin.lat}, lng: ${origin.lng}}`};

        map = new google.maps.Map(document.getElementById('map'), {
          center: centerLatLng,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy'
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#2563EB',
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        });

        // Add custom markers
        new google.maps.Marker({
          position: { lat: ${origin.lat}, lng: ${origin.lng} },
          map: map,
          title: 'Pickup Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="12" fill="#2563EB" stroke="white" stroke-width="3"/></svg>'),
            scaledSize: new google.maps.Size(30, 30)
          }
        });

        new google.maps.Marker({
          position: { lat: ${destination.lat}, lng: ${destination.lng} },
          map: map,
          title: 'Drop-off Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><circle cx="15" cy="15" r="12" fill="#10B981" stroke="white" stroke-width="3"/></svg>'),
            scaledSize: new google.maps.Size(30, 30)
          }
        });

        ${waypoints.map((w, i) => `
        new google.maps.Marker({
          position: { lat: ${w.lat}, lng: ${w.lng} },
          map: map,
          title: 'Stop ${i + 1}',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg"><circle cx="12.5" cy="12.5" r="10" fill="#F59E0B" stroke="white" stroke-width="3"/></svg>'),
            scaledSize: new google.maps.Size(25, 25)
          }
        });
        `).join('')}

        // Calculate and display route
        calculateRoute();

        // Notify parent that map is loaded
        window.ReactNativeWebView.postMessage('mapLoaded');
      };

      function calculateRoute() {
        const waypoints = ${waypoints.length > 0 ? `[${waypoints.map(w => `{location: {lat: ${w.lat}, lng: ${w.lng}}, stopover: true}`).join(',')}]` : '[]'};

        const request = {
          origin: { lat: ${origin.lat}, lng: ${origin.lng} },
          destination: { lat: ${destination.lat}, lng: ${destination.lng} },
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false
        };

        directionsService.route(request, function(result, status) {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);

            // Fit bounds to show entire route
            const bounds = new google.maps.LatLngBounds();
            const route = result.routes[0];
            route.legs.forEach(function(leg) {
              leg.steps.forEach(function(step) {
                step.path.forEach(function(latLng) {
                  bounds.extend(latLng);
                });
              });
            });
            map.fitBounds(bounds);
          } else {
            console.error('Directions request failed: ' + status);
          }
        });
      }
    </script>
  </body>
</html>`;
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, waypoints, googleApiKey, userLocation]);

  const handleMessage = (event: any) => {
    const message = event.nativeEvent.data;
    if (message === 'close' && onClose) {
      onClose();
    } else if (message === 'mapLoaded') {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://localhost' }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webView}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Google Maps...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webView: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  loadingText: { marginTop: 12, color: Colors.text.secondary, fontSize: 16 },
});

