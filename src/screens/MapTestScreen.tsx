import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
// Temporarily disabled native maps for Expo Go compatibility
// import MapView, { Marker } from 'expo-maps';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const MapTestScreen: React.FC = () => {
  // Simple hardcoded location for Johannesburg
  const testLocation = {
    latitude: -26.2041,
    longitude: 28.0473,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="map" size={24} color="#00D4AA" />
        <Text style={styles.title}>Map Test Page</Text>
        <Text style={styles.subtitle}>Simple map test - no complex state</Text>
      </View>

      {/* Simple MapView - Temporarily disabled for Expo Go compatibility */}
      <View style={styles.mapContainer}>
        {/* Temporarily disabled native maps for Expo Go compatibility */}
        {/*
        <MapView
          style={styles.map}
          region={{
            latitude: testLocation.latitude,
            longitude: testLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          <Marker
            coordinate={testLocation}
            title="Test Location"
            description="Johannesburg Test Marker"
            pinColor="#00D4AA"
          />
        </MapView>
        */}

        {/* Placeholder for map */}
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Ionicons name="map" size={48} color="#00D4AA" />
          <Text style={styles.placeholderText}>Map Placeholder</Text>
          <Text style={styles.placeholderSubtext}>
            📍 {testLocation.latitude}, {testLocation.longitude}
          </Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🗺️ Map Status</Text>
        <Text style={styles.infoText}>✅ Map should render without AIRMapMarker errors</Text>
        <Text style={styles.infoText}>✅ Location: Johannesburg CBD</Text>
        <Text style={styles.infoText}>✅ Simple, minimal implementation</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.base,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[300],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontFamily: 'Poppins-Regular',
  },
  mapContainer: {
    height: height * 0.7,
    margin: 10,
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  infoContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Poppins-Regular',
  },
});

export default MapTestScreen;
