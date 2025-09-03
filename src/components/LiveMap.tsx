import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { googleMaps } from '../lib/googleMaps';

const { width, height } = Dimensions.get('window');

interface Store {
  id: string;
  name: string;
  address: string;
  distance: number;
  rating?: number;
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
}

interface LiveMapProps {
  visible: boolean;
  providerLocation: {
    latitude: number;
    longitude: number;
  };
  onLocationPress: () => void;
  onStoreSelect: (store: Store) => void;
  showStores?: boolean;
}

const LiveMap: React.FC<LiveMapProps> = ({
  visible,
  providerLocation,
  onLocationPress,
  onStoreSelect,
  showStores = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (visible && showStores) {
      loadNearbyStores();
    } else if (!showStores) {
      setStores([]);
    }
  }, [visible, showStores]);

  // Debug: Monitor stores state changes
  useEffect(() => {
    console.log('ðŸ” STORES STATE CHANGED:', {
      storeCount: stores.length,
      visible,
      providerLocation: {
        latitude: providerLocation.latitude,
        longitude: providerLocation.longitude,
      },
    });

    if (stores.length > 0) {
      console.log('ðŸ“Š FIRST STORE DETAILS:', {
        id: stores[0].id,
        name: stores[0].name,
        address: stores[0].address,
        coordinates: {
          latitude: stores[0].latitude,
          longitude: stores[0].longitude,
        },
        rating: stores[0].rating,
        distance: stores[0].distance,
      });
    }
  }, [stores, visible, providerLocation]);

  // Debug: Check if MapView component is being rendered
  useEffect(() => {
    if (visible) {
      console.log('ðŸŽ¯ LiveMap COMPONENT RENDERING:', {
        visible,
        storeCount: stores.length,
        providerLocation: {
          latitude: providerLocation.latitude,
          longitude: providerLocation.longitude,
        },
      });
    }
  }, [visible, stores.length, providerLocation]);

  const loadNearbyStores = async () => {
    try {
      setLoading(true);
      console.log('Loading nearby stores...');

      // Use the Edge Function to get real stores
      const response = await googleMaps.findPickupLocations(
        { lat: providerLocation.latitude, lng: providerLocation.longitude },
        {
          radius: 2000,
          type: 'grocery_or_supermarket',
          openNow: true,
        }
      );

      console.log('Edge Function response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      console.log('Has results?', response.hasOwnProperty('results'));
      console.log('Results length:', response.results?.length);

      if (response.results && response.results.length > 0) {
        const realStores: Store[] = response.results.slice(0, 5).map((place: any, index: number) => ({
          id: place.place_id || `store-${index}`,
          name: place.name,
          address: place.vicinity,
          distance: place.distance ? place.distance / 1000 : 0.5 + index * 0.3,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now || true,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
        }));

        setStores(realStores);
      } else {
        // Fallback to mock data if no real stores found
        const mockStores: Store[] = [
          {
            id: '1',
            name: 'Spar Supermarket',
            address: '123 Main Street, Sandton',
            distance: 0.5,
            rating: 4.2,
            isOpen: true,
            latitude: -26.2041 + 0.002,
            longitude: 28.0473 + 0.002,
          },
          {
            id: '2',
            name: 'Pick n Pay',
            address: '456 Commerce Ave, Sandton',
            distance: 0.8,
            rating: 4.0,
            isOpen: true,
            latitude: -26.2041 - 0.003,
            longitude: 28.0473 + 0.001,
          },
          {
            id: '3',
            name: 'Woolworths',
            address: '789 Retail Blvd, Sandton',
            distance: 1.2,
            rating: 4.5,
            isOpen: false,
            latitude: -26.2041 + 0.001,
            longitude: 28.0473 - 0.004,
          },
        ];

        setStores(mockStores);
        console.log('âœ… Mock stores loaded (no real stores found)');
      }
    } catch (error) {
      console.error('Error loading nearby stores:', error);
      
      // Fallback to mock data on error
      const mockStores: Store[] = [
        {
          id: '1',
          name: 'Spar Supermarket',
          address: '123 Main Street, Sandton',
          distance: 0.5,
          rating: 4.2,
          isOpen: true,
          latitude: -26.2041 + 0.002,
          longitude: 28.0473 + 0.002,
        },
        {
          id: '2',
          name: 'Pick n Pay',
          address: '456 Commerce Ave, Sandton',
          distance: 0.8,
          rating: 4.0,
          isOpen: true,
          latitude: -26.2041 - 0.003,
          longitude: 28.0473 + 0.001,
        },
        {
          id: '3',
          name: 'Woolworths',
          address: '789 Retail Blvd, Sandton',
          distance: 1.2,
          rating: 4.5,
          isOpen: false,
          latitude: -26.2041 + 0.001,
          longitude: 28.0473 - 0.004,
        },
      ];

      setStores(mockStores);
      console.log('âœ… Mock stores loaded (error fallback)');
    } finally {
      setLoading(false);
    }
  };



  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Real Google Maps Display */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={{
            latitude: providerLocation.latitude,
            longitude: providerLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          zoomEnabled={true}
          scrollEnabled={true}
          mapType="standard"
        >
          {/* Provider Location Marker */}
          <Marker
            coordinate={{
              latitude: providerLocation.latitude,
              longitude: providerLocation.longitude,
            }}
            title="Your Location"
            description="Current provider location"
            pinColor="#00D4AA"
          />

          {/* Store Markers */}
          {showStores && stores.map((store, index) => (
            store.latitude && store.longitude && (
              <Marker
                key={store.id || `store-${index}`}
                coordinate={{
                  latitude: store.latitude,
                  longitude: store.longitude,
                }}
                title={store.name || 'Store'}
                description={`${store.address || 'Store location'} â€¢ ${store.distance?.toFixed(1)}km`}
                pinColor={store.isOpen ? "#4CAF50" : "#F44336"}
              />
            )
          ))}
        </MapView>

        {/* Map Overlay with Store Count */}
        {showStores && stores.length > 0 && (
          <View style={styles.mapOverlay}>
            <View style={styles.overlayBadge}>
              <Ionicons name="storefront" size={16} color="#FFFFFF" />
              <Text style={styles.overlayBadgeText}>{stores.length} stores nearby</Text>
            </View>
          </View>
        )}
      </View>

      {/* TEMPORARILY REMOVED: Stores List - testing map isolation */}
      {/*
      <View style={styles.storesContainer}>
        <Text style={styles.sectionTitle}>Nearby Stores</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Stores list temporarily disabled for map testing</Text>
        </View>
      </View>
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  dataDisplay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
    marginLeft: 8,
    flex: 1,
  },
  storeBadge: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  storeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  dataSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
  },
  dataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  sampleStore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  sampleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  sampleAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Poppins-Regular',
  },
  sampleCoords: {
    fontSize: 12,
    color: '#00D4AA',
    marginBottom: 4,
    fontFamily: 'Poppins-Medium',
  },
  sampleRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontFamily: 'Poppins-Medium',
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 6,
    fontFamily: 'Poppins-Medium',
  },

  storesContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontFamily: 'Poppins-Regular',
  },
  storesList: {
    flex: 1,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeCardClosed: {
    opacity: 0.6,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  coordinatesText: {
    fontSize: 11,
    color: '#00D4AA',
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
  },
  storeMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Poppins-Medium',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Poppins-Medium',
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeStatus: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  storeOpen: {
    color: '#4CAF50',
  },
  storeClosed: {
    color: '#F44336',
  },
  selectButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonDisabled: {
    backgroundColor: '#CCC',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  selectButtonTextDisabled: {
    color: '#999',
  },

  // Map Overlay Styles
  mapOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  overlayBadge: {
    backgroundColor: 'rgba(0, 212, 170, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  overlayBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
    fontFamily: 'Poppins-Bold',
  },
});

export default LiveMap;






