import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapboxGL from '@react-native-mapbox-gl/maps';

interface Coord {
  latitude: number;
  longitude: number;
}

interface Props {
  destination: Coord;
  currentLocation: Coord;
  onEndNavigation: () => void;
}

const MAPBOX_TOKEN = 'sk.eyJ1IjoiZG9yaXNtYWR1bmEiLCJhIjoiY21mYmxxaHMwMDY3ZDJsczA4Z2VxMjMzYSJ9.AkCgJYDxiZunrXP-xFR6xgOn';

const MapboxNavigator: React.FC<Props> = ({ destination, currentLocation, onEndNavigation }) => {
  const [loading, setLoading] = useState(true);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any | null>(null);
  const [nextManeuver, setNextManeuver] = useState<string | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      try {
        setLoading(true);
        const coords = `${currentLocation.longitude},${currentLocation.latitude};${destination.longitude},${destination.latitude}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&steps=true&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!isMounted) return;
        if (data && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const geojson = {
            type: 'Feature',
            geometry: route.geometry,
          };
          setRouteGeoJSON(geojson);
          // Get first maneuver instruction if available
          const firstStep = route.legs?.[0]?.steps?.[0];
          if (firstStep && firstStep.maneuver && firstStep.maneuver.instruction) {
            setNextManeuver(firstStep.maneuver.instruction);
          } else {
            setNextManeuver('Head to destination');
          }
          // ETA
          const durationMin = Math.round((route.duration || 0) / 60);
          setEtaText(`${durationMin} min`);
        }
      } catch (e) {
        console.warn('Failed to fetch Mapbox route', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRoute();

    return () => { isMounted = false; };
  }, [destination.latitude, destination.longitude, currentLocation.latitude, currentLocation.longitude]);

  if (loading) {
    return (
      <View style={styles.navigatorContainer}>
        <ActivityIndicator size="small" color="#00D4AA" />
        <Text style={styles.loadingText}>Preparing route...</Text>
      </View>
    );
  }

  return (
    <View style={styles.navigatorWrapper} pointerEvents="box-none">
      {/* Route overlay on map */}
      {routeGeoJSON && (
        <MapboxGL.ShapeSource id="navigationRoute" shape={routeGeoJSON}>
          <MapboxGL.LineLayer id="navigationRouteLine" style={layerStyles.routeLine} />
        </MapboxGL.ShapeSource>
      )}

      {/* Compact navigation UI */}
      <View style={styles.navigatorContainer}>
        <View style={styles.instructionRow}>
          <Text style={styles.instructionText}>{nextManeuver}</Text>
          {etaText && <Text style={styles.etaText}>{etaText}</Text>}
        </View>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.endButton} onPress={onEndNavigation}>
            <Text style={styles.endButtonText}>End Navigation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navigatorWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
  },
  navigatorContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 8,
  },
  etaText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  endButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

const layerStyles = {
  routeLine: {
    lineColor: '#00D4AA',
    lineWidth: 4,
    lineCap: 'round',
    lineJoin: 'round',
  } as any,
};

export default MapboxNavigator;

