import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Colors } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { googleMaps } from '../../lib/googleMaps';
import { isNativeNavigationAvailable, startTurnByTurn, geocodeAddress, getDirections } from '../../native/navigation';

type NavProp = StackNavigationProp<RootStackParamList, 'ProviderTrip'>;

const ProviderTrip: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'ProviderTrip'>>();
  const { requestId, storeLat, storeLng, dropoffLat, dropoffLng, title, description } = route.params || {} as any;

  // State for fallback coordinate resolution
  const [resolvedStoreCoords, setResolvedStoreCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedDropoffCoords, setResolvedDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [providerLoc, setProviderLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [routeToStore, setRouteToStore] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [routeToDropoff, setRouteToDropoff] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [stepsToStore, setStepsToStore] = useState<any[] | null>(null);
  const [stepsToDropoff, setStepsToDropoff] = useState<any[] | null>(null);
  const [activeLeg, setActiveLeg] = useState<'store' | 'dropoff'>('store');
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Subscribe to provider_status to keep provider location fresh
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, try to get current location immediately
      try {
        console.log('Getting current location for navigation...');
        setIsLoadingLocation(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 10000,
          });
          setProviderLoc({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          console.log('Current location obtained:', location.coords);
        } else {
          console.log('Location permission denied');
          Alert.alert('Location Permission', 'Location permission is required for navigation. Please grant permission and try again.');
        }
      } catch (error) {
        console.warn('Failed to get current location:', error);
        Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      } finally {
        setIsLoadingLocation(false);
      }

      // Subscribe to provider_status for real-time updates
      const ch = supabase
        .channel('prov_trip_loc')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_status', filter: `user_id=eq.${user.id}` }, (p: any) => {
          const row = p?.new || p?.record;
          if (row && typeof row.lat === 'number' && typeof row.lng === 'number') {
            setProviderLoc({ latitude: row.lat, longitude: row.lng });
            console.log('Location updated from provider_status:', row);
          }
        })
        .subscribe();
      return () => { try { ch.unsubscribe(); } catch {} };
    })();
  }, []);

  // Fallback coordinate resolution
  useEffect(() => {
    const resolveMissingCoords = async () => {
      try {
        // Resolve store coordinates if missing
        if (typeof storeLat !== 'number' || typeof storeLng !== 'number') {
          if (title && title !== 'Shopping Request') {
            console.log('Attempting to geocode store address:', title);
            try {
              const coords = await geocodeAddress(title);
              setResolvedStoreCoords(coords);
              console.log('Store coordinates resolved:', coords);
            } catch (error) {
              console.warn('Failed to geocode store address:', error);
            }
          }
        }

        // Resolve dropoff coordinates if missing
        if (typeof dropoffLat !== 'number' || typeof dropoffLng !== 'number') {
          if (description) {
            console.log('Attempting to geocode dropoff address:', description);
            try {
              const coords = await geocodeAddress(description);
              setResolvedDropoffCoords(coords);
              console.log('Dropoff coordinates resolved:', coords);
            } catch (error) {
              console.warn('Failed to geocode dropoff address:', error);
            }
          }
        }
      } catch (error) {
        console.warn('Coordinate resolution failed:', error);
      }
    };

    // Only attempt resolution if we have some missing coordinates
    const hasMissingCoords = (
      (typeof storeLat !== 'number' || typeof storeLng !== 'number') ||
      (typeof dropoffLat !== 'number' || typeof dropoffLng !== 'number')
    );

    if (hasMissingCoords) {
      console.log('Some coordinates missing, attempting to resolve...');
      resolveMissingCoords();
    }
  }, [storeLat, storeLng, dropoffLat, dropoffLng, title, description]);

  // Fetch route polylines using edge function
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof storeLat === 'number' && typeof storeLng === 'number' && typeof dropoffLat === 'number' && typeof dropoffLng === 'number') {
          const d = await getDirections(
            { lat: storeLat, lng: storeLng },
            { lat: dropoffLat, lng: dropoffLng },
            { mode: 'driving' }
          );
          const pts = d?.routes?.[0]?.overview_polyline?.points;
          if (pts) setRouteToDropoff(decodePolyline(pts));
          const legs = d?.routes?.[0]?.legs?.[0]?.steps || null;
          setStepsToDropoff(legs);
        }
        if (providerLoc && typeof storeLat === 'number' && typeof storeLng === 'number') {
          const d2 = await getDirections(
            { lat: providerLoc.latitude, lng: providerLoc.longitude },
            { lat: storeLat, lng: storeLng },
            { mode: 'driving' }
          );
          const pts2 = d2?.routes?.[0]?.overview_polyline?.points;
          if (pts2) setRouteToStore(decodePolyline(pts2));
          const legs2 = d2?.routes?.[0]?.legs?.[0]?.steps || null;
          setStepsToStore(legs2);
        }
      } catch (error) {
        console.error('Error fetching directions:', error);
      }
    };
    run();
  }, [providerLoc?.latitude, providerLoc?.longitude, storeLat, storeLng, dropoffLat, dropoffLng]);

  const decodePolyline = (encoded: string) => {
    let index = 0, lat = 0, lng = 0; const coords: any[] = [];
    while (index < encoded.length) {
      let b = 0, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += dlat;
      shift = 0; result = 0; do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += dlng;
      coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return coords;
  };

  // In-app navigation helpers
  const instruction = useMemo(() => {
    const steps = activeLeg === 'store' ? stepsToStore : stepsToDropoff;
    if (!steps || !steps[stepIndex]) return 'Calculating route…';
    const s = steps[stepIndex];
    // prefer maneuver + street name
    const text = s?.html_instructions?.replace(/<[^>]+>/g, '') || 'Continue';
    const dist = s?.distance?.text || '';
    return `${text}${dist ? ` • ${dist}` : ''}`;
  }, [stepsToStore, stepsToDropoff, stepIndex, activeLeg]);

  // Advance step if close to end of current step
  useEffect(() => {
    const steps = activeLeg === 'store' ? stepsToStore : stepsToDropoff;
    if (!providerLoc || !steps || !steps[stepIndex]) return;
    const end = steps[stepIndex]?.end_location;
    if (typeof end?.lat !== 'number' || typeof end?.lng !== 'number') return;
    const d = haversine(providerLoc.latitude, providerLoc.longitude, end.lat, end.lng);
    if (d < 0.05) { // <50m
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      // if we reached end of leg, move to next leg
      if (stepIndex >= steps.length - 1) {
        if (activeLeg === 'store' && typeof dropoffLat === 'number' && typeof dropoffLng === 'number') {
          setActiveLeg('dropoff');
          setStepIndex(0);
        }
      }
    }
  }, [providerLoc?.latitude, providerLoc?.longitude, stepIndex, activeLeg, stepsToStore, stepsToDropoff, dropoffLat, dropoffLng]);

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a));
  };

  useEffect(() => {
    // Fit map to important points
    const pts: any[] = [];
    if (providerLoc) pts.push(providerLoc);
    if (typeof storeLat === 'number' && typeof storeLng === 'number') pts.push({ latitude: storeLat, longitude: storeLng });
    if (typeof dropoffLat === 'number' && typeof dropoffLng === 'number') pts.push({ latitude: dropoffLat, longitude: dropoffLng });
    if (pts.length && mapRef.current) {
      try { mapRef.current.fitToCoordinates(pts, { edgePadding: { top: 60, bottom: 280, left: 60, right: 60 }, animated: true }); } catch {}
    }
  }, [providerLoc?.latitude, providerLoc?.longitude, storeLat, storeLng, dropoffLat, dropoffLng]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={22} color={Colors.text.primary} /></TouchableOpacity>
        <Text style={styles.title}>{title || 'Navigation'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapWrap}>
        {/* Instruction banner */}
        <View style={styles.instructionBar}>
          <Ionicons name="navigate" size={18} color={Colors.white} />
          <Text style={styles.instructionText} numberOfLines={1}>{instruction}</Text>
          <View style={{ width: 18 }} />
        </View>
        <MapView ref={mapRef} style={styles.map}>
          {providerLoc && <Marker coordinate={providerLoc} title="You" pinColor="#3B82F6" />}
          {typeof storeLat === 'number' && typeof storeLng === 'number' && (
            <Marker coordinate={{ latitude: storeLat, longitude: storeLng }} title="Store" />
          )}
          {typeof dropoffLat === 'number' && typeof dropoffLng === 'number' && (
            <Marker coordinate={{ latitude: dropoffLat, longitude: dropoffLng }} title="Customer" pinColor="#10B981" />
          )}
          {routeToStore && <Polyline coordinates={routeToStore} strokeColor="#3B82F6" strokeWidth={4} lineDashPattern={[6,6]} />}
          {routeToDropoff && <Polyline coordinates={routeToDropoff} strokeColor="#10B981" strokeWidth={5} />}
        </MapView>
      </View>

      <View style={styles.bottomSheet}>
        <Text style={styles.desc} numberOfLines={2}>{description || 'Pickup and deliver to customer'}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: '#111827' },
              (isLoadingLocation || !providerLoc) && { opacity: 0.6 }
            ]}
            disabled={isLoadingLocation || !providerLoc}
            onPress={async () => {
              try {
                // Use resolved coordinates as fallbacks
                const finalStoreLat = typeof storeLat === 'number' ? storeLat : resolvedStoreCoords?.lat;
                const finalStoreLng = typeof storeLng === 'number' ? storeLng : resolvedStoreCoords?.lng;
                const finalDropoffLat = typeof dropoffLat === 'number' ? dropoffLat : resolvedDropoffCoords?.lat;
                const finalDropoffLng = typeof dropoffLng === 'number' ? dropoffLng : resolvedDropoffCoords?.lng;

                // Debug coordinate availability
                console.log('Navigation coordinates check:', {
                  providerLoc: providerLoc,
                  storeLat: storeLat, resolvedStoreCoords: resolvedStoreCoords,
                  dropoffLat: dropoffLat, resolvedDropoffCoords: resolvedDropoffCoords,
                  final: { finalStoreLat, finalStoreLng, finalDropoffLat, finalDropoffLng }
                });

                if (!providerLoc || typeof finalStoreLat !== 'number' || typeof finalStoreLng !== 'number' || typeof finalDropoffLat !== 'number' || typeof finalDropoffLng !== 'number') {
                  const missing = [];
                  if (!providerLoc) missing.push('provider location');
                  if (typeof finalStoreLat !== 'number' || typeof finalStoreLng !== 'number') missing.push('store coordinates');
                  if (typeof finalDropoffLat !== 'number' || typeof finalDropoffLng !== 'number') missing.push('dropoff coordinates');

                  Alert.alert('Navigation', `Missing coordinates: ${missing.join(', ')}. Please wait for location to load or check your GPS settings.`);
                  return;
                }

                // Handle navigation based on platform
                if (Platform.OS === 'ios') {
                  // iOS: Open Apple Maps
                  console.log('🍎 Opening Apple Maps for iOS navigation...');
                  const destination = activeLeg === 'store'
                    ? { lat: finalStoreLat, lng: finalStoreLng }
                    : { lat: finalDropoffLat, lng: finalDropoffLng };

                  const mapsUrl = `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d`;
                  console.log('Apple Maps URL:', mapsUrl);

                  const supported = await Linking.canOpenURL(mapsUrl);
                  if (supported) {
                    await Linking.openURL(mapsUrl);
                    console.log('✅ Apple Maps opened successfully');
                    Alert.alert(
                      'Navigation Started',
                      'Apple Maps has opened with your route. When you arrive at your destination, come back to Swiftly and tap "Start Shopping".',
                      [{ text: 'OK' }]
                    );
                  } else {
                    console.log('❌ Apple Maps not available');
                    Alert.alert('Navigation', 'Unable to open Apple Maps. Please check your device settings.');
                  }
                } else {
                  // Android: Try Google Navigation SDK first
                  console.log('📱 Android detected - checking Google Navigation SDK...');
                  const navAvailable = isNativeNavigationAvailable();
                  console.log('🎯 Google Navigation SDK available:', navAvailable);
                  console.log('🔧 Platform:', Platform.OS);
                  console.log('📍 Current location available:', !!providerLoc);

                  if (navAvailable) {
                    console.log('🚀 LAUNCHING GOOGLE NAVIGATION SDK...');
                    console.log('📍 Origin:', { lat: providerLoc.latitude, lng: providerLoc.longitude });
                    console.log('🎯 Destination:', activeLeg === 'store'
                      ? { lat: finalStoreLat, lng: finalStoreLng }
                      : { lat: finalDropoffLat, lng: finalDropoffLng });

                    try {
                      await startTurnByTurn({
                        origin: { lat: providerLoc.latitude, lng: providerLoc.longitude },
                        destination: activeLeg === 'store' ? { lat: finalStoreLat, lng: finalStoreLng } : { lat: finalDropoffLat, lng: finalDropoffLng },
                        waypoints: activeLeg === 'store' && typeof finalDropoffLat === 'number' && typeof finalDropoffLng === 'number' ? [{ lat: finalDropoffLat, lng: finalDropoffLng }] : undefined,
                        title: title || 'Trip',
                      });

                      console.log('✅ GOOGLE NAVIGATION SDK LAUNCHED SUCCESSFULLY!');
                      Alert.alert('Success', 'Google Navigation launched!');
                    } catch (navError) {
                      console.error('❌ Google Navigation SDK failed:', navError);
                      Alert.alert('Navigation Failed', `Google Navigation error: ${navError?.message || 'Unknown error'}`);
                    }
                  } else {
                    console.log('❌ GOOGLE NAVIGATION SDK NOT AVAILABLE');
                    console.log('🔄 Falling back to in-app navigation');
                    Alert.alert(
                      'Google Navigation Not Available',
                      'The Google Navigation SDK was not included in this APK build. Use Store Route or Customer Route buttons for in-app navigation.',
                      [
                        { text: 'Use Store Route', onPress: () => setActiveLeg('store') },
                        { text: 'Use Customer Route', onPress: () => setActiveLeg('dropoff') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  }
                }
              } catch (e: any) {
                console.error('Navigation error:', e);
                Alert.alert('Navigation Error', String(e?.message || e));
              }
            }}
          >
            <Ionicons name="compass" size={18} color="#fff" />
            <Text style={styles.actionText}>
              {isLoadingLocation ? 'Getting Location...' :
               Platform.OS === 'ios' ? 'Start Navigation' :
               isNativeNavigationAvailable() ? '🚀 Google Navigation' : '📱 In-App Navigation'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setActiveLeg('store'); setStepIndex(0); }}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.actionText}>Store Route</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => { setActiveLeg('dropoff'); setStepIndex(0); }}>
            <Ionicons name="flag" size={18} color="#fff" />
            <Text style={styles.actionText}>Customer Route</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => {/* TODO: chat */}}>
            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
            <Text style={styles.secondaryText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={Colors.error} />
            <Text style={[styles.secondaryText, { color: Colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.secondary, borderRadius: 20 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  desc: { color: Colors.text.secondary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  actionBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  actionText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: Colors.background.secondary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
});

export default ProviderTrip;
