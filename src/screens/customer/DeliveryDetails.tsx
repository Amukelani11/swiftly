import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';
import { formatCurrencySafe } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { googleMaps } from '../../lib/googleMaps';

type DeliveryDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'DeliveryDetails'>;

interface Props {
  navigation: DeliveryDetailsNavigationProp;
}

interface ShoppingItem {
  id: string;
  text: string;
  quantity: number;
  notes?: string | undefined;
  allowSubstitute?: boolean;
  substituteNotes?: string;
}

interface Store {
  id: string;
  name: string;
  distance: number;
  rating: number;
  image: string;
}

const DeliveryDetails: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'DeliveryDetails'>>();
  const { items = [], stores = [], selectedStore } = route.params as any || {};

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');
  const [pricingData, setPricingData] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tip] = useState<number>(0);

  // Mock stores data for display
  const mockStores: Store[] = [
    { id: '1', name: 'Checkers', distance: 2.1, rating: 4.2, image: '🏪' },
    { id: '2', name: 'Pick n Pay', distance: 3.8, rating: 4.5, image: '🛒' },
    { id: '3', name: 'Woolworths', distance: 4.2, rating: 4.7, image: '🏬' },
    { id: '4', name: 'Spar', distance: 1.5, rating: 3.8, image: '🏪' },
    { id: '5', name: 'Shoprite', distance: 5.2, rating: 4.0, image: '🏪' },
    { id: '6', name: 'Clicks', distance: 3.1, rating: 4.1, image: '🏥' },
  ];

  const selectedStoresData = stores.map((storeId: string) => {
    if (selectedStore && storeId === String(selectedStore.id)) {
      return {
        ...selectedStore,
        image: '🛍️',
      };
    }
    return mockStores.find(s => s.id === storeId) || { id: storeId, name: 'Unknown Store', distance: 0, rating: 0, image: '🏪' };
  });

  // Load current shopper's address from profile
  useEffect(() => {
    (async () => {
      try {
        setAddressLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('address, full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && profile?.address) {
          setDeliveryAddress(profile.address);
        }
      } catch (e) {
        console.log('Failed to load profile address', e);
      } finally {
        setAddressLoading(false);
      }
    })();
  }, []);

  const calculatePricing = useCallback(async () => {
    if (!items || items.length === 0) return;

    setPricingLoading(true);
    try {
      // Calculate basket value (this is a rough estimate since we don't have real prices)
      // In a real app, you'd get actual prices from the stores' APIs
      const estimatedBasketValue = items.reduce((total: number, item: ShoppingItem) => {
        // Rough estimate: assume average item price of R50
        return total + (item.quantity * 50);
      }, 0);

      const { data, error } = await supabase.functions.invoke('calculate-pricing', {
        body: {
          basketValue: estimatedBasketValue,
          storeCount: stores.length,
          items: items.map((item: ShoppingItem) => ({
            name: item.text,
            quantity: item.quantity,
            price: 50, // Estimated price
          }))
        }
      });

      if (error) {
        console.error('Pricing calculation error:', error);
        Alert.alert('Error', 'Failed to calculate pricing. Please try again.');
        return;
      }

      if (data?.success) {
        console.log('✅ Pricing calculation successful:', data.data);
        setPricingData(data.data);
      } else {
        console.error('❌ Pricing calculation failed:', data);
        Alert.alert('Error', 'Failed to calculate pricing. Please try again.');
      }
    } catch (error) {
      console.error('Error calling pricing function:', error);
      Alert.alert('Error', 'Failed to calculate pricing. Please try again.');
    } finally {
      setPricingLoading(false);
    }
  }, [items, stores]);

  // Calculate pricing when component mounts or items/stores change
  useEffect(() => {
    console.log('🔄 DeliveryDetails useEffect triggered:', {
      itemsCount: items.length,
      storesCount: stores.length,
      hasPricingData: !!pricingData
    });

    if (items.length > 0) {
      console.log('📊 Calculating pricing for', items.length, 'items and', stores.length, 'stores');
      calculatePricing();
    } else {
      console.log('⚠️ No items to calculate pricing for');
    }
  }, [items, stores, calculatePricing]);

  const handleSubmit = useCallback(async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Delivery Address', 'Please enter a delivery address.');
      return;
    }

    if (!pricingData) {
      Alert.alert('Error', 'Pricing information is still loading. Please wait.');
      return;
    }

    // Tip selection removed; defaulting to R0

    try {
      setSubmitting(true);
      console.log('Submitting with tip:', tip);

      // Geocode dropoff address for coordinates
      let dropLat: number | undefined;
      let dropLng: number | undefined;
      try {
        const geo = await googleMaps.geocodeAddress(deliveryAddress);
        const loc = geo?.results?.[0]?.geometry?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          dropLat = loc.lat; dropLng = loc.lng;
        }
      } catch (e) {
        console.warn('Geocode failed for dropoff; proceeding without coords', e);
      }

      // Optionally geocode selected store name
      let storeName: string | undefined = selectedStore?.name || selectedStoresData?.[0]?.name;
      let storeLat: number | undefined;
      let storeLng: number | undefined;
      if (storeName) {
        try {
          const sgeo = await googleMaps.geocodeAddress(storeName);
          const sloc = sgeo?.results?.[0]?.geometry?.location;
          if (sloc && typeof sloc.lat === 'number' && typeof sloc.lng === 'number') {
            storeLat = sloc.lat; storeLng = sloc.lng;
          }
        } catch (e) {
          console.warn('Geocode failed for store; proceeding without coords', e);
        }
      }

      // Create shopping request via Edge Function
      console.log('Invoking create-shopping-request with items:', items.length);
      const { data: createData, error: createErr } = await supabase.functions.invoke('create-shopping-request', {
        body: {
          storeName,
          storeLat,
          storeLng,
          dropoffAddress: deliveryAddress,
          dropoffLat: dropLat,
          dropoffLng: dropLng,
          subtotalFees: pricingData.subtotal,
          serviceFeeAmount: pricingData.breakdown?.serviceFee?.amount ?? 0,
          pickPackFeeAmount: pricingData.breakdown?.pickPackFee?.amount ?? 0,
          tip: 0,
          items: items.map((it: any) => ({ title: it.text, qty: it.quantity || 1 })),
        },
      });
      console.log('create-shopping-request result:', { ok: !createErr, createData });
      if (createErr || !createData?.success) {
        console.error('create-shopping-request failed', createErr || createData);
        Alert.alert('Error', 'Failed to post request. Please try again.');
        setSubmitting(false);
        return;
      }

      const requestId = createData.request?.id;

      // Skip push notifications; in-app provider popup handles new orders via realtime

      // Navigate to tracking screen
      navigation.navigate('OrderTracking' as any, {
        taskId: requestId || ('new_task_' + Date.now()),
        task: {
          items,
          stores,
          selectedStore,
          deliveryAddress,
          deliveryTime,
          notes,
          pricing: pricingData,
          selectedStoresData,
        }
      } as any);
    } finally {
      setSubmitting(false);
    }
  }, [deliveryAddress, pricingData, selectedStore, selectedStoresData, items, stores, deliveryTime, notes, navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.summaryText}>
            {items.length} item{items.length !== 1 ? 's' : ''} from {stores.length} store{stores.length !== 1 ? 's' : ''}
          </Text>
          {/* Tip selection removed */}
          {/* Items list */}
          {items?.length > 0 && (
            <View style={styles.itemsSummaryList}>
              {items.map((it: ShoppingItem, idx: number) => (
                <Text key={it.id || idx.toString()} style={styles.itemLine} numberOfLines={1}>
                  {`${it.quantity || 1} × ${it.text}`}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Selected Stores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping At</Text>
          <View style={styles.storesList}>
            {selectedStoresData.map((store: Store) => (
              <View key={store.id} style={styles.storeItem}>
                <Text style={styles.storeIcon}>{store.image}</Text>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeMeta}>{store.distance}km away • ⭐ {store.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delivery Address</Text>
            {!editingAddress ? (
              <TouchableOpacity style={styles.input} onPress={() => setEditingAddress(true)} activeOpacity={0.8}>
                <Text style={deliveryAddress ? styles.inputText : styles.inputPlaceholder} numberOfLines={2}>
                  {addressLoading ? 'Loading your address…' : (deliveryAddress || 'No address on profile. Tap to add.')}
                </Text>
                <Ionicons name="create-outline" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Enter delivery address"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setEditingAddress(false)}
                    style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg }}
                  >
                    <Text style={{ color: Colors.text.primary, fontFamily: Typography.fontFamily.medium }}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setDeliveryAddress(''); setEditingAddress(false); }}
                    style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg }}
                  >
                    <Text style={{ color: Colors.text.primary, fontFamily: Typography.fontFamily.medium }}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Preferred Time</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => Alert.alert('Time Picker', 'Time picker coming soon!')}
            >
              <Text style={deliveryTime ? styles.inputText : styles.inputPlaceholder}>
                {deliveryTime || 'Select preferred delivery time'}
              </Text>
              <Ionicons name="time-outline" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Special Instructions (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Apartment number, gate code, delivery preferences..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Fee Summary */}
        <View style={styles.feeSummary}>
          <Text style={styles.feeTitle}>Fee Breakdown</Text>

          {pricingLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Calculating pricing...</Text>
            </View>
          ) : pricingData ? (
            <>
              {/* Removed basket value from summary per request */}

              {/* Commitment Fee */}
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{pricingData.breakdown.commitmentFee.label}</Text>
                <Text style={styles.feeValue}>{formatCurrencySafe(pricingData.breakdown.commitmentFee.amount)}</Text>
              </View>

              {/* Service Fee */}
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{pricingData.breakdown.serviceFee.label}</Text>
                <Text style={styles.feeValue}>{formatCurrencySafe(pricingData.breakdown.serviceFee.amount)}</Text>
              </View>

              {/* Multi-Store Surcharge */}
              {pricingData.breakdown.multiStoreSurcharge.amount > 0 && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>{pricingData.breakdown.multiStoreSurcharge.label}</Text>
                  <Text style={styles.feeValue}>{formatCurrencySafe(pricingData.breakdown.multiStoreSurcharge.amount)}</Text>
                </View>
              )}

              {/* Pick & Pack Fee */}
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{pricingData.breakdown.pickPackFee.label}</Text>
                <Text style={styles.feeValue}>{formatCurrencySafe(pricingData.breakdown.pickPackFee.amount)}</Text>
              </View>

              {/* Total Fees */}
              <View style={[styles.feeRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Total Fees</Text>
                <Text style={styles.subtotalValue}>{formatCurrencySafe(pricingData.subtotal)}</Text>
              </View>

              {/* Upfront Payment (fees only) */}
              <View style={[styles.feeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Payment</Text>
                <Text style={styles.totalValue}>{formatCurrencySafe(pricingData.subtotal)}</Text>
              </View>

              {/* Fee Notes */}
              <Text style={styles.feeNote}>
                {pricingData.breakdown.commitmentFee.description}
              </Text>
              <Text style={styles.feeNote}>
                {pricingData.breakdown.serviceFee.description}
              </Text>
              {pricingData.breakdown.multiStoreSurcharge.amount > 0 && (
                <Text style={styles.feeNote}>
                  {pricingData.breakdown.multiStoreSurcharge.description}
                </Text>
              )}
              <Text style={styles.feeNote}>
                {pricingData.breakdown.pickPackFee.description}
              </Text>
            </>
          ) : (
            <Text style={styles.errorText}>Unable to calculate pricing. Please try again.</Text>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!deliveryAddress.trim() || !pricingData || pricingLoading || submitting) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!deliveryAddress.trim() || !pricingData || pricingLoading || submitting}
        >
          <Text style={styles.submitButtonText}>
            {pricingLoading ? 'Calculating...' : (submitting ? 'Posting…' : `Pay ${formatCurrencySafe(pricingData?.subtotal || 0)} & Post Request`)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
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
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  summarySection: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  summaryTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  itemsSummaryList: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.md,
  },
  itemLine: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  storesList: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  storeIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  storeMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputText: {
    color: Colors.text.primary,
    flex: 1,
  },
  inputPlaceholder: {
    color: Colors.text.tertiary,
    flex: 1,
  },
  feeSummary: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  feeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  feeLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  feeValue: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  totalValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
  },
  feeNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  subtotalLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  subtotalValue: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.error || '#e74c3c',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  disabledButton: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
});

export default DeliveryDetails;
