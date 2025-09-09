import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import * as Location from 'expo-location';
import MapboxNavSheet from '../../components/MapboxNavSheet';

type NavProp = StackNavigationProp<RootStackParamList, 'ProviderTrip'>;

const ProviderTrip: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'ProviderTrip'>>();
  const { storeLat, storeLng, dropoffLat, dropoffLng, title } = route.params || {};

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location for navigation
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
        }
      } catch (error) {
        console.warn('Failed to get location:', error);
      }
    };
    getLocation();
  }, []);

  // Determine destination (prioritize store, fallback to dropoff)
  const destination = useMemo(() => {
    if (typeof storeLat === 'number' && typeof storeLng === 'number') {
      return { lat: storeLat, lng: storeLng };
    }
    if (typeof dropoffLat === 'number' && typeof dropoffLng === 'number') {
      return { lat: dropoffLat, lng: dropoffLng };
    }
    return { lat: 0, lng: 0 }; // fallback
  }, [storeLat, storeLng, dropoffLat, dropoffLng]);

  return (
    <SafeAreaView style={styles.container}>
        <MapboxNavSheet
        origin={userLocation || { lat: 0, lng: 0 }}
        destination={destination}
        onClose={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullScreen: { flex: 1 },
});

export default ProviderTrip;




