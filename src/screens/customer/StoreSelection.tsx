import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';
import { googleMaps } from '../../lib/googleMaps';
import { supabase } from '../../lib/supabase';
import { geocodeAddress } from '../../native/navigation';

type StoreSelectionNavigationProp = StackNavigationProp<RootStackParamList, 'StoreSelection'>;

interface Props {
  navigation: StoreSelectionNavigationProp;
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

const { width } = Dimensions.get('window');

// Mock data for stores
const mockStores: Store[] = [
  { id: '1', name: 'Checkers', distance: 2.1, rating: 4.2, image: '🏪' },
  { id: '2', name: 'Pick n Pay', distance: 3.8, rating: 4.5, image: '🛒' },
  { id: '3', name: 'Woolworths', distance: 4.2, rating: 4.7, image: '🏬' },
  { id: '4', name: 'Spar', distance: 1.5, rating: 3.8, image: '🏪' },
  { id: '5', name: 'Shoprite', distance: 5.2, rating: 4.0, image: '🏪' },
  { id: '6', name: 'Clicks', distance: 3.1, rating: 4.1, image: '🏥' },
];

const StoreSelection: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'StoreSelection'>>();
  const { items = [], selectedStore } = route.params as any || {};

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>(mockStores);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const searchDebounceRef = useRef<number | null>(null);

  // Load user's delivery address
  useEffect(() => {
    const loadUserAddress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('address')
          .eq('id', user.id)
          .single();

        if (profile?.address) {
          setDeliveryAddress(profile.address);
        }
      } catch (error) {
        console.log('Failed to load user address:', error);
      }
    };

    loadUserAddress();
  }, []);

  // Auto-select store if coming from home and add it to available stores
  useEffect(() => {
    if (selectedStore?.id) {
      const customStore = {
        id: String(selectedStore.id),
        name: selectedStore.name || 'Selected Store',
        distance: selectedStore.distance || 0,
        rating: selectedStore.rating || 4.6,
        image: '🛍️',
        isCustom: true,
      };

      // Add custom store to available stores if not already there
      setAvailableStores(prev => {
        const exists = prev.find(s => s.id === customStore.id);
        if (!exists) {
          return [customStore, ...prev];
        }
        return prev;
      });

      // Auto-select the store
      setSelectedStores([String(selectedStore.id)]);
    }
  }, [selectedStore]);

  const handleStoreSelect = useCallback((storeId: string) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  }, []);

  const handleContinue = useCallback(async () => {
    if (selectedStores.length === 0) {
      Alert.alert('Select Store', 'Please select at least one store.');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Delivery Address', 'Please set a delivery address in your profile.');
      return;
    }

    try {
      setIsCreatingRequest(true);

      // Get selected store details
      const selectedStoreData = availableStores.find(s => s.id === selectedStores[0]);
      if (!selectedStoreData) {
        Alert.alert('Error', 'Selected store not found.');
        return;
      }

      // Calculate estimated pricing (simple version)
      const estimatedBasketValue = items.reduce((total: number, item: ShoppingItem) => {
        return total + (item.quantity * 50); // Rough estimate: R50 per item
      }, 0);

      // Geocode dropoff address using edge function
      let dropLat: number | undefined;
      let dropLng: number | undefined;
      try {
        const coords = await geocodeAddress(deliveryAddress);
        dropLat = coords.lat;
        dropLng = coords.lng;
      } catch (e) {
        console.warn('Geocode failed for dropoff; proceeding without coords', e);
      }

      // Geocode store using edge function
      let storeLat: number | undefined;
      let storeLng: number | undefined;
      try {
        const coords = await geocodeAddress(selectedStoreData.name);
        storeLat = coords.lat;
        storeLng = coords.lng;
      } catch (e) {
        console.warn('Geocode failed for store; proceeding without coords', e);
      }

      // Create shopping request via Edge Function
      console.log('Creating shopping request with', items.length, 'items');
      const { data: createData, error: createErr } = await supabase.functions.invoke('create-shopping-request', {
        body: {
          storeName: selectedStoreData.name,
          storeLat,
          storeLng,
          dropoffAddress: deliveryAddress,
          dropoffLat: dropLat,
          dropoffLng: dropLng,
          subtotalFees: Math.round(estimatedBasketValue * 0.04), // 4% service fee
          tip: 10, // Default tip
          items: items.map((it: ShoppingItem) => ({ title: it.text, qty: it.quantity || 1 })),
        },
      });

      console.log('Create shopping request result:', { ok: !createErr, createData });

      if (createErr || !createData?.success) {
        console.error('Create shopping request failed:', createErr || createData);
        Alert.alert('Error', 'Failed to create shopping request. Please try again.');
        return;
      }

      const requestId = createData.request?.id;

      // Navigate to order tracking
      navigation.navigate('OrderTracking' as any, {
        taskId: requestId || ('new_task_' + Date.now()),
        task: {
          items,
          stores: selectedStores,
          selectedStore: selectedStoreData,
          deliveryAddress,
          pricing: {
            subtotal: Math.round(estimatedBasketValue * 0.04),
            total: Math.round(estimatedBasketValue * 0.04) + 10,
          },
        }
      } as any);

    } catch (error) {
      console.error('Error creating shopping request:', error);
      Alert.alert('Error', 'Failed to create shopping request. Please try again.');
    } finally {
      setIsCreatingRequest(false);
    }
  }, [selectedStores, deliveryAddress, items, availableStores, navigation]);

  const handleAddAnotherStore = useCallback(() => {
    // Toggle search mode
    setShowSearchResults(!showSearchResults);
    if (!showSearchResults) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showSearchResults]);

  const searchStores = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await googleMaps.getPlaceAutocomplete(query, {
        types: 'establishment',
        components: 'country:za', // Bias towards South Africa
      });

      setSearchResults(response?.predictions || []);
    } catch (error) {
      console.error('Error searching stores:', error);
      Alert.alert('Error', 'Failed to search for stores. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce search
    if (text.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        searchStores(text);
      }, 500);
    } else {
      setSearchResults([]);
    }
  }, [searchStores]);

  const addCustomStore = useCallback((prediction: any) => {
    const customStoreId = `custom_${Date.now()}_${Math.random()}`;
    const customStore = {
      id: customStoreId,
      name: prediction.structured_formatting?.main_text || prediction.description || 'Custom Store',
      distance: 0, // Will be calculated later
      rating: 0,
      image: '🛍️',
      isCustom: true,
      placeData: prediction,
    };

    // Add to available stores
    setAvailableStores(prev => [customStore, ...prev]);

    // Auto-select the new store
    setSelectedStores(prev => [...prev, customStoreId]);

    // Hide search results
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);

    Alert.alert('Store Added', `${customStore.name} has been added to your selection!`);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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
        <Text style={styles.title}>Choose Stores</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Items Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Your Shopping List</Text>
          <Text style={styles.summaryText}>
            {items.length} item{items.length !== 1 ? 's' : ''} • Select where to shop
          </Text>
        </View>

        {/* Add Store Search */}
        {showSearchResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search for Stores</Text>
            <Text style={styles.sectionSubtitle}>Find and add stores not in our list</Text>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={Colors.primary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for stores..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  autoFocus={showSearchResults}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </View>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                <FlatList
                  data={searchResults.slice(0, 5)} // Limit to 5 results
                  keyExtractor={(item) => item.place_id || item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => addCustomStore(item)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultName}>
                          {item.structured_formatting?.main_text || item.description || 'Unknown Store'}
                        </Text>
                        <Text style={styles.searchResultAddress}>
                          {item.structured_formatting?.secondary_text || item.description || ''}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  style={styles.searchResultsList}
                />
              </View>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No stores found for "{searchQuery}"</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
          </View>
        )}

        {/* Store Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Stores</Text>
          <Text style={styles.sectionSubtitle}>Choose one or more stores for your items</Text>

          <View style={styles.storesGrid}>
            {availableStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeCard,
                  selectedStores.includes(store.id) && styles.storeCardSelected,
                ]}
                onPress={() => handleStoreSelect(store.id)}
              >
                <Text style={styles.storeIcon}>{store.image}</Text>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeDistance}>{store.distance}km away</Text>
                <View style={styles.storeRating}>
                  <Text style={styles.ratingText}>⭐ {store.rating}</Text>
                </View>
                {selectedStores.includes(store.id) && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Stores Summary */}
        {selectedStores.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              Selected Stores ({selectedStores.length})
            </Text>
            <View style={styles.selectedStores}>
              {selectedStores.map(storeId => {
                const store = availableStores.find(s => s.id === storeId);
                return (
                  <View key={storeId} style={styles.selectedStoreChip}>
                    <Text style={styles.selectedStoreText}>{store?.name || 'Unknown Store'}</Text>
                    <TouchableOpacity
                      onPress={() => handleStoreSelect(storeId)}
                      style={styles.removeChip}
                    >
                      <Ionicons name="close" size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (selectedStores.length === 0 || isCreatingRequest) && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={selectedStores.length === 0 || isCreatingRequest}
          >
            {isCreatingRequest ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.secondaryButtonText}>
                  Post Shopping Request
                </Text>
                <Ionicons name="send" size={18} color={Colors.primary} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddAnotherStore}
          >
            <Ionicons name="add-circle" size={18} color={Colors.white} />
            <Text style={styles.primaryButtonText}>
              Add Another Store
            </Text>
          </TouchableOpacity>
        </View>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  storesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storeCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  storeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  storeIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  storeName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  storeDistance: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  storeRating: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSection: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  selectedTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  selectedStores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedStoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedStoreText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    marginRight: Spacing.sm,
  },
  removeChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Search styles
  searchContainer: {
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.xs,
  },
  searchResults: {
    marginTop: Spacing.md,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  searchResultAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noResultsText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  noResultsSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
});

export default StoreSelection;
