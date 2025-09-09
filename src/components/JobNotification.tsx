import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { formatCurrencySafe } from '../utils/format';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { googleMaps } from '../lib/googleMaps';

interface JobNotificationProps {
  visible: boolean;
  order: {
    id: string;
    title: string;
    description: string;
    budget_max: number;
    city: string;
    distance: number;
    dropoffLat?: number;
    dropoffLng?: number;
    storeLat?: number;
    storeLng?: number;
    net?: number;
  };
  providerLat?: number | null;
  providerLng?: number | null;
  onAccept: (orderId: string) => void;
  onDismiss: () => void;
}

const JobNotification: React.FC<JobNotificationProps> = ({
  visible,
  order,
  providerLat,
  providerLng,
  onAccept,
  onDismiss,
}) => {
  const slideAnimation = useRef(new Animated.Value(300)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  const [secondsLeft, setSecondsLeft] = useState(60);
  const mapRef = useRef<MapView | null>(null);
  const [routeStoreToCust, setRouteStoreToCust] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [routeProvToStore, setRouteProvToStore] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [etaStoreMinutes, setEtaStoreMinutes] = useState<number | null>(null);
  const [etaDropoffMinutes, setEtaDropoffMinutes] = useState<number | null>(null);

  // Decode encoded polyline from Google Directions
  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    let index = 0, lat = 0, lng = 0;
    const coords: Array<{ latitude: number; longitude: number }> = [];
    while (index < encoded.length) {
      let b = 0, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return coords;
  };

  // Fetch smoothed polylines when visible
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof order.storeLat === 'number' && typeof order.storeLng === 'number' && typeof order.dropoffLat === 'number' && typeof order.dropoffLng === 'number') {
          const d = await googleMaps.getDirections({ lat: order.storeLat, lng: order.storeLng }, { lat: order.dropoffLat, lng: order.dropoffLng }, { mode: 'driving', region: 'za' });
          const points = d?.routes?.[0]?.overview_polyline?.points;
          setRouteStoreToCust(points ? decodePolyline(points) : null);
          // ETA store -> customer
          try {
            const dm = await googleMaps.getDistanceMatrix(
              { lat: order.storeLat, lng: order.storeLng },
              [{ lat: order.dropoffLat, lng: order.dropoffLng }],
              { mode: 'driving', departure_time: 'now', units: 'metric' }
            );
            const e = dm?.rows?.[0]?.elements?.[0];
            const mins = e?.duration_in_traffic?.value || e?.duration?.value;
            setEtaDropoffMinutes(mins ? Math.round(mins / 60) : null);
          } catch {}
        } else {
          setRouteStoreToCust(null);
          }
        if (typeof providerLat === 'number' && typeof providerLng === 'number' && typeof order.storeLat === 'number' && typeof order.storeLng === 'number') {
          const d2 = await googleMaps.getDirections({ lat: providerLat!, lng: providerLng! }, { lat: order.storeLat, lng: order.storeLng }, { mode: 'driving', region: 'za' });
          const pts2 = d2?.routes?.[0]?.overview_polyline?.points;
          setRouteProvToStore(pts2 ? decodePolyline(pts2) : null);
          // ETA provider -> store
          try {
            const dm2 = await googleMaps.getDistanceMatrix(
              { lat: providerLat!, lng: providerLng! },
              [{ lat: order.storeLat, lng: order.storeLng }],
              { mode: 'driving', departure_time: 'now', units: 'metric' }
            );
            const e2 = dm2?.rows?.[0]?.elements?.[0];
            const mins2 = e2?.duration_in_traffic?.value || e2?.duration?.value;
            setEtaStoreMinutes(mins2 ? Math.round(mins2 / 60) : null);
          } catch {}
        } else {
          setRouteProvToStore(null);
          }
      } catch {
        setRouteStoreToCust(null);
        setRouteProvToStore(null);
      }
    };
    if (visible) run();
  }, [visible, order.storeLat, order.storeLng, order.dropoffLat, order.dropoffLng, providerLat, providerLng]);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(60);
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down animation
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnimation, opacityAnimation]);

  // Countdown auto-dismiss
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onDismiss();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible, onDismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnimation.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          onDismiss();
        } else {
          Animated.spring(slideAnimation, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnimation }],
          opacity: opacityAnimation,
        },
      ]}
      {...panResponder.current.panHandlers}
    >
      <View style={styles.notification}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
            <Text style={styles.headerTitle}>New Order Available!</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={{ marginLeft: 6, color: '#666', fontWeight: '600' }}>{secondsLeft}s</Text>
            <TouchableOpacity onPress={onDismiss} style={[styles.closeButton, { marginLeft: 12 }]}>
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Preview */}
        {(typeof order.storeLat === 'number' || typeof order.dropoffLat === 'number') && (
          <View style={{ height: 220, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              onMapReady={() => {
                try {
                  const coords: Array<{ latitude: number; longitude: number }> = [];
                  if (typeof order.storeLat === 'number' && typeof order.storeLng === 'number') coords.push({ latitude: order.storeLat, longitude: order.storeLng });
                  if (typeof order.dropoffLat === 'number' && typeof order.dropoffLng === 'number') coords.push({ latitude: order.dropoffLat, longitude: order.dropoffLng });
                  // @ts-ignore provider props are added on parent
                  if (typeof (arguments as any)?.providerLat === 'number' && typeof (arguments as any)?.providerLng === 'number') {
                    // skip; parent will pass separate markers
                  }
                  if (coords.length > 0) {
                    mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 30, bottom: 30, left: 30, right: 30 }, animated: true });
                  }
                } catch {}
              }}
            >
              {typeof order.storeLat === 'number' && typeof order.storeLng === 'number' && (
                <Marker coordinate={{ latitude: order.storeLat, longitude: order.storeLng }} title="Store" />
              )}
              {typeof order.dropoffLat === 'number' && typeof order.dropoffLng === 'number' && (
                <Marker coordinate={{ latitude: order.dropoffLat, longitude: order.dropoffLng }} title="Customer" pinColor="#10B981" />
              )}
              {typeof (providerLat as number) === 'number' && typeof (providerLng as number) === 'number' && (
                <Marker coordinate={{ latitude: providerLat as number, longitude: providerLng as number }} title="You" pinColor="#3B82F6" opacity={0.7} />
              )}
              {routeStoreToCust
                ? (<Polyline coordinates={routeStoreToCust} strokeColor="#10B981" strokeWidth={4} />)
                : (typeof order.storeLat === 'number' && typeof order.storeLng === 'number' && typeof order.dropoffLat === 'number' && typeof order.dropoffLng === 'number'
                    ? (<Polyline coordinates={[{ latitude: order.storeLat, longitude: order.storeLng }, { latitude: order.dropoffLat, longitude: order.dropoffLng }]} strokeColor="#10B981" strokeWidth={4} />)
                    : null)}
              {routeProvToStore
                ? (<Polyline coordinates={routeProvToStore} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[6,6]} />)
                : (typeof (providerLat as number) === 'number' && typeof (providerLng as number) === 'number' && typeof order.storeLat === 'number' && typeof order.storeLng === 'number'
                    ? (<Polyline coordinates={[{ latitude: providerLat as number, longitude: providerLng as number }, { latitude: order.storeLat, longitude: order.storeLng }]} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[6, 6]} />)
                    : null)}
            </MapView>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle}>{order.title}</Text>
            <Text style={styles.orderDescription} numberOfLines={2}>
              {order.description}
            </Text>
          </View>

          <View style={styles.orderMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color={Colors.text.secondary} />
              <Text style={styles.metaText}>
                {order.city} • {order.distance}km away
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cash" size={16} color="#F59E0B" />
              <Text style={styles.metaText}>{formatCurrencySafe(order.budget_max)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="wallet" size={16} color="#10B981" />
              <Text style={styles.metaText}>Net: {formatCurrencySafe(order.net ?? order.budget_max)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Not Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(order.id)}
          >
            <Text style={styles.acceptText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.15)'
  },
  notification: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  newText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    fontFamily: 'Poppins-Bold',
  },
  closeButton: {
    padding: 4,
  },
  orderDetails: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  orderHeader: {
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  orderDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 6,
    fontFamily: 'Poppins-Regular',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: Colors.background.base,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  dismissText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#00D4AA',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default JobNotification;


