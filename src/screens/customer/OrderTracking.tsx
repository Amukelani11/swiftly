import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated, PanResponder, Easing, ScrollView, Alert, TextInput, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { googleMaps } from '../../lib/googleMaps';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Colors } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Image } from 'react-native';

type OrderTrackingNavigationProp = StackNavigationProp<RootStackParamList, 'OrderTracking'>;

interface Props {
  navigation: OrderTrackingNavigationProp;
}

const TIP_PRESETS = [0, 10, 20, 30];

const OrderTracking: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderTracking'>>();
  const { taskId, task } = (route.params as any) || {};

  const pricing = task?.pricing || null;
  const subtotal = pricing?.subtotal ?? 0;

  const [tip, setTip] = useState<number>(0);
  const [phase, setPhase] = useState<'tip' | 'searching'>('searching');
  const [processing, setProcessing] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customTipText, setCustomTipText] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [customerCoord, setCustomerCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [storeCoord, setStoreCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [providerCoord, setProviderCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [providerProfile, setProviderProfile] = useState<any | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [loaderWidth, setLoaderWidth] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  // Simple animated spinner + pulse
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase === 'searching') {
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(barAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        })
      ).start();
    } else {
      spin.stopAnimation();
      spin.setValue(0);
      pulse.stopAnimation();
      pulse.setValue(0);
      barAnim.stopAnimation();
      barAnim.setValue(0);
    }
  }, [phase]);

  const spinStyle = {
    transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
  };
  const pulseStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.15] }),
  };

  const totalToPay = useMemo(() => subtotal + (tip || 0), [subtotal, tip]);

  // Geocode customer and store when entering searching phase
  useEffect(() => {
    const run = async () => {
      if (!task) return;
      try {
        setGeoLoading(true);
        // Customer
        if (task.deliveryAddress) {
          try {
            const geo = await googleMaps.geocodeAddress(task.deliveryAddress);
            const loc = geo?.results?.[0]?.geometry?.location;
            if (loc) setCustomerCoord({ latitude: loc.lat, longitude: loc.lng });
          } catch (e) {}
        }
        // Store (best-effort)
        if (task.selectedStore?.latitude && task.selectedStore?.longitude) {
          setStoreCoord({ latitude: task.selectedStore.latitude, longitude: task.selectedStore.longitude });
        } else if (task.selectedStore?.name) {
          const storeQuery = task.selectedStore.name;
          try {
            const geo2 = await googleMaps.geocodeAddress(storeQuery);
            const loc2 = geo2?.results?.[0]?.geometry?.location;
            if (loc2) setStoreCoord({ latitude: loc2.lat, longitude: loc2.lng });
          } catch (e) {}
        }
      } finally {
        setGeoLoading(false);
      }
    };
    if (phase === 'searching') run();
  }, [phase, task]);

  // Subscribe to acceptance and provider live location
  useEffect(() => {
    let reqCh: any; let provCh: any;
    (async () => {
      if (!taskId) return;
      reqCh = supabase
        .channel(`cust_req_${taskId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_requests', filter: `id=eq.${taskId}` }, async (pl: any) => {
          const row = pl?.new || pl?.record;
          if (row?.accepted_by) {
            try {
              const { data: prof } = await supabase.from('profiles').select('*').eq('id', row.accepted_by).maybeSingle();
              if (prof) setProviderProfile(prof);
            } catch {}
            try { provCh?.unsubscribe?.(); } catch {}
            provCh = supabase
              .channel(`prov_${row.accepted_by}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_status', filter: `user_id=eq.${row.accepted_by}` }, (p: any) => {
                const r = p?.new || p?.record;
                if (typeof r?.lat === 'number' && typeof r?.lng === 'number') setProviderCoord({ latitude: r.lat, longitude: r.lng });
              })
              .subscribe();
          }
        })
        .subscribe();
    })();
    return () => { try { reqCh?.unsubscribe?.(); } catch {}; try { provCh?.unsubscribe?.(); } catch {} };
  }, [taskId]);

  // Fit map to coordinates when both are available
  useEffect(() => {
    if (phase !== 'searching' || !mapRef.current) return;
    const points: Array<{ latitude: number; longitude: number }> = [];
    if (customerCoord) points.push(customerCoord);
    if (storeCoord) points.push(storeCoord);
    if (points.length === 0) return;
    if (points.length === 1) {
      const p = points[0];
      mapRef.current.animateToRegion({ latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 300);
      return;
    }
    setTimeout(() => {
      try {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 80, right: 80, bottom: 200, left: 80 },
          animated: true,
        });
      } catch {}
    }, 100);
  }, [phase, customerCoord, storeCoord]);

  const handleProcessPayment = async () => {
    try {
      setProcessing(true);
      // TODO: integrate real payment; for now simulate
      await new Promise((res) => setTimeout(res, 1200));
      setPhase('searching');
    } catch (e) {
      Alert.alert('Payment Error', 'Failed to process payment.');
    } finally {
      setProcessing(false);
    }
  };

  // Bottom sheet animation
  const sheetHeightCollapsed = 180;
  const sheetHeightExpanded = 440;
  const sheetY = useRef(new Animated.Value(sheetHeightCollapsed)).current;
  const [expanded, setExpanded] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderMove: (_, gesture) => {
          const newH = Math.min(Math.max(sheetHeightCollapsed, sheetHeightExpanded - gesture.dy), sheetHeightExpanded);
          sheetY.setValue(newH);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldExpand = gesture.vy < 0 || sheetY.__getValue() > (sheetHeightCollapsed + sheetHeightExpanded) / 2;
          Animated.spring(sheetY, { toValue: shouldExpand ? sheetHeightExpanded : sheetHeightCollapsed, useNativeDriver: false }).start(() => setExpanded(shouldExpand));
        },
      }),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{phase === 'tip' ? 'Confirm & Tip' : 'Finding Your Shopper'}</Text>
        <View style={styles.placeholder} />
      </View>

      {phase === 'tip' ? (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Upfront Payment</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Fees Subtotal</Text>
              <Text style={styles.value}>R{subtotal.toFixed(2)}</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: Spacing.sm }]}>
              <Text style={styles.label}>Personal Shopper Tip</Text>
              <Text style={styles.value}>R{(tip || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.rowBetween, styles.totalRow]}> 
              <Text style={styles.totalLabel}>Total to Pay</Text>
              <Text style={styles.totalValue}>R{totalToPay.toFixed(2)}</Text>
            </View>

            <Text style={styles.subtleText}>Tip goes 100% to your personal shopper.</Text>

            <View style={styles.tipRow}>
              {TIP_PRESETS.map((t) => (
                <TouchableOpacity key={t} style={[styles.tipChip, tip === t && styles.tipChipActive]} onPress={() => setTip(t)}>
                  <Text style={[styles.tipChipText, tip === t && styles.tipChipTextActive]}>R{t}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.tipChip} onPress={() => setTip(Math.max(0, (tip || 0) + 10))}>
                <Text style={styles.tipChipText}>+ R10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tipChip, customMode && styles.tipChipActive]} onPress={() => setCustomMode((v) => !v)}>
                <Text style={[styles.tipChipText, customMode && styles.tipChipTextActive]}>{customMode ? 'Custom ✓' : 'Custom'}</Text>
              </TouchableOpacity>
            </View>

            {customMode && (
              <View style={styles.tipCustomRow}>
                <View style={styles.tipCustomFieldWrap}>
                  <Text style={styles.tipCurrency}>R</Text>
                  <TextInput
                    style={styles.tipCustomInput}
                    keyboardType="numeric"
                    placeholder="0"
                    value={customTipText}
                    onChangeText={(txt) => {
                      // keep only digits and dot/comma
                      const cleaned = txt.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setCustomTipText(cleaned);
                    }}
                    onEndEditing={() => {
                      const val = parseFloat(customTipText || '0');
                      if (!isNaN(val) && val >= 0) setTip(Math.round(val * 100) / 100);
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.tipApplyBtn}
                  onPress={() => {
                    const val = parseFloat(customTipText || '0');
                    if (isNaN(val) || val < 0) {
                      Alert.alert('Invalid Amount', 'Enter a valid tip (R0 or more).');
                      return;
                    }
                    setTip(Math.round(val * 100) / 100);
                  }}
                >
                  <Text style={styles.tipApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[styles.payButton, processing && styles.payButtonDisabled]} onPress={handleProcessPayment} disabled={processing}>
              <Text style={styles.payButtonText}>{processing ? 'Processing…' : `Pay R${totalToPay.toFixed(2)} & Post Request`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            ref={(r) => (mapRef.current = r)}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            region={{
              latitude: customerCoord?.latitude || -26.2041,
              longitude: customerCoord?.longitude || 28.0473,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={false}
          >
            {customerCoord && (
              <Marker coordinate={customerCoord} title="Your Delivery" description={task?.deliveryAddress}>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.pulseMarkerWrap}>
                    <Animated.View style={[styles.pulseCircle, pulseStyle]} />
                    <View style={styles.dot} />
                  </View>
                  <View style={styles.markerLabel}><Text style={styles.markerLabelText}>Customer</Text></View>
                </View>
              </Marker>
            )}
            {storeCoord && (
              <Marker coordinate={storeCoord} title={task?.selectedStore?.name || 'Store'}>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.storePin}>
                    <Ionicons name="storefront" size={16} color={Colors.white} />
                  </View>
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      {task?.selectedStore?.name || 'Store'}
                    </Text>
                  </View>
                </View>
              </Marker>
            )}
            {providerCoord && (
              <Marker coordinate={providerCoord} title="Shopper">
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.storePin, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="person" size={16} color={Colors.white} />
                  </View>
                  <View style={styles.markerLabel}><Text style={styles.markerLabelText}>Shopper</Text></View>
                </View>
              </Marker>
            )}
            {storeCoord && customerCoord && (
              <Polyline coordinates={[storeCoord, customerCoord]} strokeColor="#10B981" strokeWidth={5} />
            )}
            {providerCoord && storeCoord && (
              <Polyline coordinates={[providerCoord, storeCoord]} strokeColor="#3B82F6" strokeWidth={3} lineDashPattern={[6,6]} />
            )}
          </MapView>

          <Animated.View style={[styles.sheet, { height: sheetY }]} {...panResponder.panHandlers}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Looking for a driver…</Text>
            <View style={styles.loadingRow}>
              <View style={styles.progressWrap} onLayout={(e) => setLoaderWidth(e.nativeEvent.layout.width)}>
                {loaderWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        width: Math.max(60, loaderWidth * 0.35),
                        transform: [
                          {
                            translateX: barAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-(loaderWidth * 0.4), loaderWidth],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.loadingRowText}>Posting your request and notifying shoppers</Text>
            </View>
            {providerProfile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm }}>
                {providerProfile.avatar_url ? (
                  <Image source={{ uri: providerProfile.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={20} color={Colors.text.secondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text.primary, fontFamily: Typography.fontFamily.semibold }}>{providerProfile.full_name || 'Your shopper'}</Text>
                  <Text style={{ color: Colors.text.secondary, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs }}>
                    {(providerProfile.vehicle_make || 'Vehicle') + ' ' + (providerProfile.vehicle_model || '') + (providerProfile.vehicle_plate ? ` • ${providerProfile.vehicle_plate}` : '')}
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.sectionHeading}>Delivery Options</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <TouchableOpacity style={styles.actionTile} activeOpacity={0.85} onPress={() => Alert.alert('Add Item', 'Feature coming soon!')}>
                <View style={styles.actionIconWrap}><Ionicons name="add" size={18} color={Colors.primary} /></View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Add another item</Text>
                  <Text style={styles.actionSubtitle}>Update your list before a shopper accepts</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionTile} activeOpacity={0.85} onPress={() => Alert.alert('Change Address', 'Feature coming soon!')}>
                <View style={styles.actionIconWrap}><Ionicons name="location" size={18} color={Colors.primary} /></View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Change delivery address</Text>
                  <Text style={styles.actionSubtitle}>Use a different dropoff for this order</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionTile, styles.actionDanger]} activeOpacity={0.85} onPress={() => Alert.alert('Cancel Order', 'Are you sure you want to cancel?', [
                { text: 'No' },
                { text: 'Yes, cancel', style: 'destructive', onPress: () => navigation.goBack() },
              ])}>
                <View style={styles.actionIconWrapDanger}><Ionicons name="close" size={18} color={'#FFFFFF'} /></View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Cancel this order</Text>
                  <Text style={styles.actionSubtitle}>You can post again any time</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xl, color: Colors.text.primary },
  placeholder: { width: 40 },
  content: { flex: 1, padding: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm },
  sectionTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.text.primary, marginBottom: Spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.text.secondary },
  value: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: Colors.text.primary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border.light, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  totalLabel: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.text.primary },
  totalValue: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.lg, color: Colors.primary },
  subtleText: { marginTop: Spacing.sm, color: Colors.text.tertiary, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs },
  tipRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, marginBottom: Spacing.md, flexWrap: 'wrap' },
  tipChip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.full },
  tipChipActive: { backgroundColor: Colors.primary },
  tipChipText: { color: Colors.text.primary, fontFamily: Typography.fontFamily.medium },
  tipChipTextActive: { color: Colors.white },
  tipCustomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  tipCustomFieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, paddingHorizontal: 10, paddingVertical: 8, flex: 1 },
  tipCurrency: { color: Colors.text.tertiary, marginRight: 6 },
  tipCustomInput: { flex: 1, color: Colors.text.primary, fontFamily: Typography.fontFamily.medium },
  tipApplyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  tipApplyText: { color: Colors.white, fontFamily: Typography.fontFamily.bold },
  payButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center', ...Shadows.md },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { color: Colors.white, fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md },

  searchCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  spinner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  searchTitle: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.fontSize.lg, color: Colors.text.primary },
  searchSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.text.secondary, marginTop: 4 },

  mapWrap: { flex: 1 },
  map: { flex: 1 },
  pulseMarkerWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '33' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  storePin: { backgroundColor: Colors.primary, borderRadius: 12, padding: 6 },
  markerLabel: { marginTop: 6, backgroundColor: Colors.white, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border.light, ...Shadows.sm, maxWidth: 220 },
  markerLabelText: { color: Colors.text.primary, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  loadingRowText: { color: Colors.text.secondary, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm },
  progressWrap: { flex: 1, height: 8, backgroundColor: Colors.background.secondary, borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: Colors.primary, borderRadius: 999, opacity: 0.9 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  grabber: { alignSelf: 'center', width: 60, height: 6, borderRadius: 999, backgroundColor: Colors.border.light, marginBottom: Spacing.md },
  sheetTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.text.primary, marginBottom: Spacing.sm },
  sectionHeading: { marginTop: Spacing.sm, marginBottom: Spacing.sm, color: Colors.text.secondary, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs },
  actionTile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.light, backgroundColor: Colors.white, marginBottom: 10 },
  actionIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  actionIconWrapDanger: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.md, color: Colors.text.primary },
  actionSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.text.secondary, marginTop: 2 },
});

export default OrderTracking;
