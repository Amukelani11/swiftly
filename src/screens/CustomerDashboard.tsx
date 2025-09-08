import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Image,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
// Avoid importing view-shot at module scope on iOS Expo Go (not included there)
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { googleMaps } from '../lib/googleMaps';
import * as SecureStore from 'expo-secure-store';
import BottomNavigation from '../components/BottomNavigation';

const { width, height: viewportHeight } = Dimensions.get('window');

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  slug?: string;
}

interface Store {
  id: number;
  name: string;
  description: string;
  address: string;
  rating: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  delivery_fee: number;
  logo_url?: string;
  banner_image_url?: string;
  image_url: string;
  category: string;
  distance: number;
  is_featured?: boolean;
  is_open?: boolean;
  eta?: number;
}

interface Promotion {
  id: number;
  title: string;
  description: string;
  discount: number;
  end_date: string;
  store_id: number;
  image_url: string;
}

interface CMSSection {
  section_key: string;
  section_title: string;
  section_type?: string;
  layout?: 'list' | 'grid' | 'carousel' | 'pills' | 'banner' | 'text';
  max_items?: number;
  sort_order?: number;
  is_visible?: boolean;
  filters?: { 
    category?: string; 
    featured_only?: boolean; 
    open_only?: boolean; 
    sort?: 'eta' | 'rating' | 'distance' 
  };
}

interface CMSPage {
  page_key: string;
  title: string;
  content: {
    sections: CMSSection[];
  };
  is_active: boolean;
}

const CustomerDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    categories: Category[];
    stores: Store[];
    promotions: Promotion[];
  }>({
    categories: [],
    stores: [],
    promotions: [],
  });
  const [cmsPage, setCmsPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{
    address: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  // Custom Store (Aggregator) modal state
  const [showCustomStoreModal, setShowCustomStoreModal] = useState(false);
  const [customStoreQuery, setCustomStoreQuery] = useState('');
  const [customSuggestions, setCustomSuggestions] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [selectingCustom, setSelectingCustom] = useState(false);
  const [savedCustomStores, setSavedCustomStores] = useState<any[]>([]);
  const [showConfirmCustomModal, setShowConfirmCustomModal] = useState(false);
  const [pendingCustom, setPendingCustom] = useState<any | null>(null);
  const [customName, setCustomName] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const placesDebounceRef = useRef<number | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionPositionsRef = useRef<Record<string, number>>({});
  const sectionLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const horizontalRefs = useRef<Record<string, ScrollView | null>>({});
  const horizontalOffsetsRef = useRef<Record<string, number>>({});
  const outOfViewRef = useRef<Record<string, boolean>>({});

  // No header animations (static header)

  useFocusEffect(
    React.useCallback(() => {
      try {
        const target = (route.params as any)?.scrollToSection;
        if (target && scrollRef.current) {
          const y = sectionPositionsRef.current[target];
          if (typeof y === 'number') {
            setTimeout(() => {
              scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
            }, 0);
          }
        }
      } catch {}
      return () => {};
    }, [route?.params])
  );

  const fetchCMSData = async () => {
    try {
      // Fetch CMS page directly from database
      const { data: cmsData, error: cmsError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('page_key', 'customer_dashboard')
        .eq('is_active', true)
        .single();

      if (cmsError) {
        console.log('CMS page not found in database:', cmsError.message);
      } else if (cmsData) {
        console.log('CMS data loaded successfully from database');
        console.log('CMS sections count:', cmsData.content?.sections?.length || 0);
        setCmsPage(cmsData);
        return cmsData;
      }
    } catch (error) {
      console.log('Error fetching CMS data from database:', error);
    }

    // Fallback to mock data if CMS page is not available in database
    const fallbackCMS: CMSPage = {
      page_key: 'customer_dashboard',
      title: 'Welcome to Swiftly',
      is_active: true,
      content: {
        sections: [
          {
            section_key: 'categories',
            section_title: 'What would you like?',
            layout: 'pills',
            is_visible: true,
            sort_order: 10,
            max_items: 8
          },
          {
            section_key: 'promotions',
            section_title: 'Deals for you',
            layout: 'banner',
            is_visible: true,
            sort_order: 20,
            max_items: 3
          },
          {
            section_key: 'featured_stores',
            section_title: 'Featured',
            layout: 'carousel',
            is_visible: true,
            sort_order: 30,
            max_items: 6,
            filters: { featured_only: true }
          },
          {
            section_key: 'popular_nearby',
            section_title: 'Popular near you',
            layout: 'list',
            is_visible: true,
            sort_order: 40,
            max_items: 10,
            filters: { open_only: true, sort: 'rating' }
          }
        ]
      }
    };
    
    setCmsPage(fallbackCMS);
    return fallbackCMS;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch CMS configuration first
      const cms = await fetchCMSData();
      
      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

      // Fetch all stores (we'll filter based on CMS config)
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select(`
          id,
          name,
          description,
          address,
          rating,
          delivery_fee,
          delivery_time_min,
          delivery_time_max,
          logo_url,
          banner_image_url,
          category,
          latitude,
          longitude,
          is_featured,
          is_open,
          is_active
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (storesError) {
        console.error('Error fetching stores:', storesError);
      }

      // Fetch active promotions
      const { data: promotions, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('end_date');

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
      }

      // Add distance calculation for stores (Haversine fallback)
      let storesWithDistance = (stores || []).map((store: any, index: number) => {
        let distance = (Math.random() * 5 + 0.5).toFixed(1); // Default random distance
        
        // Calculate actual distance if both user and store have coordinates
        if (userLocation?.latitude && userLocation?.longitude && store.latitude && store.longitude) {
          const earthRadius = 6371; // Earth's radius in km
          const dLat = (store.latitude - userLocation.latitude) * Math.PI / 180;
          const dLon = (store.longitude - userLocation.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = (earthRadius * c).toFixed(1);
          console.log(`Store ${store.name}: calculated distance ${distance}km from user location`);
        } else {
          console.log(`Store ${store.name}: using random distance ${distance}km (no coords: user=${!!userLocation}, store=${!!store.latitude})`);
        }
        
        return {
          ...store,
          distance: parseFloat(distance),
          image_url: store.banner_image_url || store.logo_url || `https://images.unsplash.com/photo-${1571091718767 + index}?w=400&h=300&fit=crop`,
        };
      });

      // If we have user location, enrich with Google Distance Matrix for more accurate ETA and distance
      try {
        if (userLocation?.latitude && userLocation?.longitude) {
          const origin = { lat: userLocation.latitude, lng: userLocation.longitude };
          // Build destination list from stores that have coordinates
          const storesWithCoords = storesWithDistance.filter((s: any) => s.latitude && s.longitude);
          // Limit to first 25 for API efficiency; nearest first by current distance estimate
          const sortedByApprox = [...storesWithCoords].sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
          const batch = sortedByApprox.slice(0, 25);
          if (batch.length > 0) {
            const matrix = await googleMaps.getDistanceMatrix(
              origin,
              batch.map((s: any) => ({ lat: s.latitude, lng: s.longitude })),
              { mode: 'driving', departure_time: 'now', units: 'metric' }
            );
            const elements = matrix?.rows?.[0]?.elements || [];
            // Map results back to storesWithDistance by place index
            storesWithDistance = storesWithDistance.map((s: any) => {
              const idx = batch.findIndex((b: any) => b.id === s.id);
              if (idx >= 0 && elements[idx] && elements[idx].status === 'OK') {
                const meters = elements[idx]?.distance?.value;
                const secsTraffic = elements[idx]?.duration_in_traffic?.value;
                const secs = elements[idx]?.duration?.value;
                const etaMinutes = Math.round(((secsTraffic || secs || 0) as number) / 60);
                const km = meters ? Math.max(0.1, Math.round((meters / 1000) * 10) / 10) : s.distance;
                return { ...s, eta: etaMinutes || s.eta, distance: km ?? s.distance };
              }
              return s;
            });
          }
        }
      } catch (e) {
        console.warn('Distance Matrix lookup failed, falling back to approximations:', e);
      }

      setData({
        categories: categories || [],
        stores: storesWithDistance,
        promotions: promotions || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      await loadUserLocation();
      await fetchDashboardData();
      await loadSavedCustomStores();
    };
    
    initializeDashboard();

    // Set up realtime subscription for CMS page updates
    const channel = supabase
      .channel('cms_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_pages' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Refresh dashboard data when user location changes (for distance calculations)
  useEffect(() => {
    if (userLocation?.latitude && userLocation?.longitude) {
      console.log('User location changed, refreshing dashboard data for distance calculations');
      fetchDashboardData();
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleCategoryPress = (category: Category) => {
    // navigation.navigate('CategoryStores', { category });
  };

  const handleStorePress = (store: Store) => {
    try {
      const selectedStore = {
        id: String(store.id),
        name: store.name,
        image: (store as any).banner_image_url || (store as any).logo_url || (store as any).image_url,
        rating: store.rating,
        distance: (store as any).distance,
        eta: (store as any).eta,
        deliveryFee: (store as any).delivery_fee,
        isOpen: (store as any).is_open ?? true,
        category: store.category,
      };
      console.log('Navigating to CreateShoppingList with selectedStore:', selectedStore);
      // Navigate to shopping list preloaded with this store
      navigation.navigate('CreateShoppingList', { selectedStore });
    } catch (e) {
      console.error('Failed to navigate to CreateShoppingList:', e);
    }
  };

  const handlePromotionPress = (promotion: Promotion) => {
    // navigation.navigate('StoreDetail', { storeId: promotion.store_id });
  };

  // See All: navigate to AllStores with the full list for that section
  const handleSeeAllSection = (section: any) => {
    try {
      const sectionType = section.section_type || section.section_key;
      let storesForSection: any[] = [...data.stores];

      if (sectionType === 'stores' || sectionType === 'featured_stores' || sectionType === 'popular_nearby' || sectionType === 'category-stores') {
        // Apply same filters as getDataForSection but without slicing
        if (section.selected_category) {
          storesForSection = storesForSection.filter(store => 
            store.description?.toLowerCase().includes(section.selected_category.toLowerCase()) ||
            store.name?.toLowerCase().includes(section.selected_category.toLowerCase())
          );
        }
        if (section.filters?.featured_only) {
          storesForSection = storesForSection.filter(store => store.is_featured);
        }
        if (section.filters?.open_only) {
          storesForSection = storesForSection.filter(store => store.is_open);
        }
        // Sort according to section intent
        if (sectionType === 'popular_nearby') {
          storesForSection = storesForSection.sort((a, b) => {
            const aDist = typeof a.distance === 'number' && !isNaN(a.distance) ? a.distance : 999;
            const bDist = typeof b.distance === 'number' && !isNaN(b.distance) ? b.distance : 999;
            return aDist - bDist;
          });
        } else if (section.sort_by_distance || section.filters?.sort === 'distance') {
          storesForSection.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else if (section.filters?.sort === 'rating') {
          storesForSection.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (section.filters?.sort === 'eta') {
          storesForSection.sort((a, b) => (a.eta ?? 999) - (b.eta ?? 999));
        }

        // Map to AllStores screen shape
        const storesMapped = storesForSection.map((s: any, index: number) => ({
          id: String(s.id ?? index),
          name: s.name,
          image: s.banner_image_url || s.logo_url || s.image_url,
          logo: s.logo_url,
          rating: s.rating ?? 0,
          distance: typeof s.distance === 'number' ? s.distance : undefined,
          deliveryFee: s.delivery_fee ?? 0,
          deliveryTime: s.eta ?? Math.round(((s.delivery_time_min || 20) + (s.delivery_time_max || 40)) / 2),
          isOpen: s.is_open ?? true,
          category: s.category,
        }));

        (navigation as any).navigate('AllStores', {
          stores: storesMapped,
          promotions: data.promotions,
          categories: data.categories,
          selectedFilters: [],
          activeCategory: section.selected_category || null,
          searchQuery: '',
          sourceSection: section.section_key,
        });
      }
    } catch (e) {
      console.error('Failed to open See All:', e);
    }
  };

  const handleLocationPress = () => {
    if (!userLocation) {
      // Open the new address modal flow directly
      setAddressInput('');
      setShowAddressModal(true);
    } else {
      // navigation.navigate('LocationPicker', { currentLocation: userLocation });
      Alert.alert(
        'Change Location',
        'Location picker will open here',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add New Address', onPress: () => { setAddressInput(''); setShowAddressModal(true); } }
        ]
      );
    }
  };

  const handleAddAddress = () => {
    setAddressInput('');
    setShowAddressModal(true);
  };

  // Open custom store (aggregator) flow
  const handleAddCustomStore = () => {
    setCustomStoreQuery('');
    setCustomSuggestions([]);
    setShowCustomStoreModal(true);
  };

  // Handler for Google Places selection
  // Search places via edge function proxy
  const searchPlaces = async (input: string) => {
    if (!input || input.length < 3) {
      setPlaceSuggestions([]);
      return;
    }

    setLoadingPlaces(true);
    try {
      const res = await googleMaps.getPlaceAutocomplete(input, { components: 'country:za', language: 'en' });
      // res.predictions per Google API
      const preds = res?.predictions || [];
      setPlaceSuggestions(preds.slice(0, 6));
    } catch (err) {
      console.error('Error searching places:', err);
      setPlaceSuggestions([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  useEffect(() => {
    if (!showAddressModal) return;
    if (placesDebounceRef.current) {
      clearTimeout(placesDebounceRef.current as any);
    }
    placesDebounceRef.current = setTimeout(() => {
      searchPlaces(addressInput);
    }, 300) as any;

    return () => {
      if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current as any);
    };
  }, [addressInput, showAddressModal]);

  // Custom store autocomplete debounce
  useEffect(() => {
    if (!showCustomStoreModal) return;
    if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current as any);
    placesDebounceRef.current = setTimeout(() => {
      searchCustomStores(customStoreQuery);
    }, 300) as any;
    return () => {
      if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current as any);
    };
  }, [customStoreQuery, showCustomStoreModal]);

  const searchCustomStores = async (input: string) => {
    if (!input || input.length < 2) {
      setCustomSuggestions([]);
      return;
    }
    setLoadingCustom(true);
    try {
      const opts: any = { components: 'country:za', language: 'en', types: 'establishment' };
      if (userLocation?.latitude && userLocation?.longitude) {
        opts.location = { lat: userLocation.latitude, lng: userLocation.longitude };
        opts.radius = 15000; // 15km bias
      }
      const res = await googleMaps.getPlaceAutocomplete(input, opts);
      const preds = (res?.predictions || []).slice(0, 8);

      // Enrich with place details to compute distance and show clean titles
      let enriched: any[] = [];
      if (userLocation?.latitude && userLocation?.longitude) {
        enriched = await Promise.all(preds.map(async (p: any) => {
          try {
            const details = await googleMaps.getPlaceDetails(p.place_id, 'geometry,name,formatted_address');
            const loc = details?.result?.geometry?.location;
            let distance_km: number | undefined;
            if (loc?.lat && loc?.lng) {
              const earthRadius = 6371;
              const dLat = (loc.lat - userLocation.latitude) * Math.PI / 180;
              const dLon = (loc.lng - userLocation.longitude) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distance_km = Math.round((earthRadius * c) * 10) / 10;
            }
            return {
              ...p,
              main_text: p?.structured_formatting?.main_text || details?.result?.name || p.description,
              secondary_text: p?.structured_formatting?.secondary_text || details?.result?.formatted_address || '',
              distance_km,
            };
          } catch {
            return {
              ...p,
              main_text: p?.structured_formatting?.main_text || p.description,
              secondary_text: p?.structured_formatting?.secondary_text || '',
            };
          }
        }));
        // sort by distance when available
        enriched.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      } else {
        enriched = preds.map((p: any) => ({
          ...p,
          main_text: p?.structured_formatting?.main_text || p.description,
          secondary_text: p?.structured_formatting?.secondary_text || '',
        }));
      }
      setCustomSuggestions(enriched);
    } catch (err) {
      console.error('Error searching custom stores:', err);
      setCustomSuggestions([]);
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleSelectCustomSuggestion = async (prediction: any) => {
    try {
      setSelectingCustom(true);
      const description = prediction?.description;
      if (!description) return;

      const geo = await googleMaps.geocodeAddress(description);
      const lat = geo?.results?.[0]?.geometry?.location?.lat;
      const lng = geo?.results?.[0]?.geometry?.location?.lng;

      let distanceKm: number | undefined;
      let etaMin: number | undefined;
      if (userLocation?.latitude && userLocation?.longitude && lat && lng) {
        try {
          const matrix = await googleMaps.getDistanceMatrix(
            { lat: userLocation.latitude, lng: userLocation.longitude },
            [{ lat, lng }],
            { mode: 'driving', departure_time: 'now', units: 'metric' }
          );
          const el = matrix?.rows?.[0]?.elements?.[0];
          if (el && el.status === 'OK') {
            const meters = el.distance?.value;
            const secs = el.duration_in_traffic?.value || el.duration?.value;
            if (meters) distanceKm = Math.round((meters / 1000) * 10) / 10;
            if (secs) etaMin = Math.round(secs / 60);
          }
        } catch (e) {
          console.warn('ETA calc failed for custom store:', e);
        }
      }

      // Open confirmation modal to let user confirm name and add operating hours
      const derivedName = prediction.structured_formatting?.main_text || description;
      setPendingCustom({
        place_id: prediction.place_id,
        description,
        lat,
        lng,
        distanceKm,
        etaMin,
      });
      setCustomName(derivedName || '');
      setCustomHours('');
      setShowConfirmCustomModal(true);
      setSelectingCustom(false);
    } catch (err) {
      console.error('Error selecting custom store:', err);
      setSelectingCustom(false);
      Alert.alert('Error', 'Failed to select store.');
    }
  };

  const handleConfirmCustomStore = async () => {
    if (!pendingCustom) return;
    if (!customName.trim()) {
      Alert.alert('Store Name', 'Please enter a store name');
      return;
    }
    const entry = {
      id: `custom-${pendingCustom.place_id}`,
      name: customName.trim(),
      address: pendingCustom.description,
      latitude: pendingCustom.lat,
      longitude: pendingCustom.lng,
      distance: pendingCustom.distanceKm,
      eta: pendingCustom.etaMin,
      place_id: pendingCustom.place_id,
      hours: customHours.trim() || null,
      created_at: new Date().toISOString(),
    } as any;

    try {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('saved_custom_stores').eq('id', user.id).single();
        const existing = (profile?.saved_custom_stores) || [];
        const deduped = [entry, ...existing.filter((s: any) => s.place_id !== entry.place_id)].slice(0, 10);
        await supabase.from('profiles').update({ saved_custom_stores: deduped }).eq('id', user.id);
        setSavedCustomStores(deduped);
      } else {
        const storeKey = 'saved_custom_stores_v1';
        const raw = await SecureStore.getItemAsync(storeKey);
        const parsed = raw ? JSON.parse(raw) : [];
        const deduped = [entry, ...parsed.filter((s: any) => s.place_id !== entry.place_id)].slice(0, 10);
        await SecureStore.setItemAsync(storeKey, JSON.stringify(deduped));
        setSavedCustomStores(deduped);
      }
    } catch (e) {
      console.warn('Failed to persist custom store, continuing', e);
    }

    setShowConfirmCustomModal(false);
    setShowCustomStoreModal(false);
    setPendingCustom(null);

    (navigation as any).navigate('CreateShoppingList', {
      selectedStore: {
        id: entry.id,
        name: entry.name,
        address: entry.address,
        latitude: entry.latitude,
        longitude: entry.longitude,
        distance: entry.distance,
        eta: entry.eta,
        hours: entry.hours,
        isCustom: true,
      },
    });
  };

  const handleSelectSuggestion = async (prediction: any) => {
    try {
      setSavingAddress(true);
      const description = prediction?.description;
      if (!description) return;

      // geocode via edge function
      const geo = await googleMaps.geocodeAddress(description);
      const lat = geo?.results?.[0]?.geometry?.location?.lat;
      const lng = geo?.results?.[0]?.geometry?.location?.lng;

      // Save to profile (use upsert so row is created if absent)
      if (user) {
        const payload = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          address: description,
          latitude: lat || -26.2041,
          longitude: lng || 28.0473,
        };
        const { data: upserted, error } = await supabase.from('profiles').upsert(payload);
        if (error) {
          console.error('Error upserting address:', error);
          Alert.alert('Error', 'Failed to save address.');
        } else {
          // keep local state consistent with returned record when available
          const saved: any = Array.isArray(upserted) ? (upserted as any)[0] : upserted as any;
          if (saved) {
            setUserLocation({ address: saved.address, latitude: saved.latitude, longitude: saved.longitude });
          }
        }
      }

      // Update local UI state immediately
      setUserLocation({ address: description, latitude: lat || -26.2041, longitude: lng || 28.0473 });
      setPlaceSuggestions([]);
      setAddressInput('');
      setSavingAddress(false);
      setAddressSaved(true);
      setShowAddressPrompt(false);

      // Show success for 1.5 seconds then close modal and refresh
      setTimeout(async () => {
        setShowAddressModal(false);
        setAddressSaved(false);
        // Reload profile location to keep state in sync
        await loadUserLocation();
        // Refresh dashboard data for updated distances
        await fetchDashboardData();
      }, 1500);
    } catch (err) {
      console.error('Error selecting suggestion:', err);
      Alert.alert('Error', 'Failed to select address.');
      setSavingAddress(false);
    }
  };

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);

    // Handle navigation for specific tabs
    switch (tabName) {
      case 'search':
        // Navigate to search/browse screen
        (navigation as any).navigate('AllStores', {
          stores: data.stores,
          searchQuery: '',
          activeCategory: null,
        });
        break;
      case 'orders':
        // Navigate to orders screen
        Alert.alert('Orders', 'Orders screen coming soon!');
        break;
      case 'favorites':
        // Navigate to favorites screen
        Alert.alert('Favorites', 'Favorites screen coming soon!');
        break;
      case 'profile':
        // Navigate to profile screen
        navigation.navigate('Profile');
        break;
      case 'home':
        // Stay on current screen
        break;
      default:
        break;
    }
  };

  const saveAddress = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Error', 'Please enter a valid address');
      return;
    }

    try {
      // For now, use Sandton coordinates as default
      // In production, you'd geocode the address to get real coordinates
      const latitude = -26.2041;
      const longitude = 28.0473;

      // Save address to user profile
      if (user) {
        const payload = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          address: addressInput.trim(),
          latitude,
          longitude,
        };
        const { data: upserted, error } = await supabase.from('profiles').upsert(payload);
        if (error) {
          console.error('Error saving address:', error);
          Alert.alert('Error', 'Failed to save address. Please try again.');
          return;
        }
        const saved: any = Array.isArray(upserted) ? (upserted as any)[0] : upserted as any;
        if (saved) {
          setUserLocation({ address: saved.address, latitude: saved.latitude, longitude: saved.longitude });
        }
      }

      // Update local state
      setUserLocation({
        address: addressInput.trim(),
        latitude: latitude,
        longitude: longitude
      });
      
      setShowAddressModal(false);
      setShowAddressPrompt(false);
      
      // Refresh data to recalculate distances
      await fetchDashboardData();
      
      Alert.alert('Success', 'Address saved successfully!');
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    }
  };

  const loadUserLocation = async () => {
    try {
      // Try to get user's saved address from profile
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('address, latitude, longitude')
          .eq('id', user.id)
          .single();

        if (profile && profile.address) {
          const newLocation = {
            address: profile.address,
            latitude: profile.latitude,
            longitude: profile.longitude
          };
          setUserLocation(newLocation);
          console.log('Loaded user location:', newLocation);
        } else {
          console.log('No saved location found in profile');
        }
      }
    } catch (error) {
      console.log('Error loading user location:', error);
    }
  };

  // Load saved custom stores from profile or SecureStore
  const loadSavedCustomStores = async () => {
    try {
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('saved_custom_stores')
          .eq('id', user.id)
          .single();

        if (!error && profile?.saved_custom_stores) {
          setSavedCustomStores(profile.saved_custom_stores || []);
        }
      } else {
        const raw = await SecureStore.getItemAsync('saved_custom_stores_v1');
        if (raw) setSavedCustomStores(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to load saved custom stores:', e);
    }
  };

  const getDataForSection = (section: any) => {
    const sectionType = section.section_type || section.section_key;
    const maxItems = section.max_items || 8;
    
    switch (sectionType) {
      case 'categories':
        return data.categories.slice(0, maxItems);
      
      case 'stores':
      case 'featured_stores':
      case 'popular_nearby':
      case 'category-stores':
        let filteredStores = [...data.stores];
        
        // Filter by category if specified
        if (section.selected_category) {
          filteredStores = filteredStores.filter(store => 
            store.description?.toLowerCase().includes(section.selected_category.toLowerCase()) ||
            store.name?.toLowerCase().includes(section.selected_category.toLowerCase())
          );
        }
        
        if (section.filters?.featured_only) {
          filteredStores = filteredStores.filter(store => store.is_featured);
        }
        
        if (section.filters?.open_only) {
          filteredStores = filteredStores.filter(store => store.is_open);
        }
        
        // Sort based on filters
        if (sectionType === 'popular_nearby') {
          // Always prioritize nearest first for this section, but don't filter out stores without distance
          filteredStores = filteredStores.sort((a, b) => {
            const aDist = typeof a.distance === 'number' && !isNaN(a.distance) ? a.distance : 999;
            const bDist = typeof b.distance === 'number' && !isNaN(b.distance) ? b.distance : 999;
            return aDist - bDist;
          });
        } else if (section.sort_by_distance || section.filters?.sort === 'distance') {
          filteredStores.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else if (section.filters?.sort === 'rating') {
          filteredStores.sort((a, b) => b.rating - a.rating);
        } else if (section.filters?.sort === 'eta') {
          filteredStores.sort((a, b) => (a.eta ?? 999) - (b.eta ?? 999));
        }

        // If this is a general stores section, and we have saved custom stores,
        // add quick-picks at the start for easy re-selection.
        if (section.section_key === 'stores' && savedCustomStores && savedCustomStores.length > 0) {
          const quickPicks = savedCustomStores.slice(0, 3).map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            distance: s.distance || 0,
            eta: s.eta,
            is_custom: true,
            image_url: undefined,
          }));
          // prepend quick picks, avoiding duplicates
          const withoutDup = filteredStores.filter((fs) => !quickPicks.find((q: any) => q.id === fs.id));
          return [...quickPicks, ...withoutDup].slice(0, maxItems);
        }

        return filteredStores.slice(0, maxItems);
      
      case 'banners':
      case 'promotions':
        // Return banners from CMS or promotions from database
        if (section.banners && section.banners.length > 0) {
          return section.banners.slice(0, maxItems);
        }
        return data.promotions.slice(0, maxItems);
      
      default:
        return [];
    }
  };

  // Modern category pill component
  const renderCategoryPill = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryPill}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '15' }]}>
        <Ionicons name={category.icon as any} size={24} color={category.color} />
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
    </TouchableOpacity>
  );

  // Modern store card component
  const renderStoreCard = (store: Store, layout: string = 'carousel') => (
    <TouchableOpacity
      key={store.id}
      style={[
        styles.storeCard,
        layout === 'list' ? styles.storeCardList : styles.storeCardCarousel
      ]}
      onPress={() => handleStorePress(store)}
      activeOpacity={0.95}
    >
      <View style={styles.storeImageWrapper}>
        <Image source={{ uri: store.banner_image_url || store.logo_url || store.image_url }} style={styles.storeImage} />
        
        {/* Delivery time badge - always show */}
        <View style={styles.deliveryBadge}>
          <Ionicons name="time-outline" size={12} color="#1A1A1A" />
          <Text style={styles.deliveryBadgeText}>
            {store.eta ? `${store.eta} min` : 
             store.delivery_time_min && store.delivery_time_max ? 
             `${store.delivery_time_min}-${store.delivery_time_max} min` : 
             '25-35 min'}
          </Text>
        </View>
        
        {/* Featured badge - show for featured stores */}
        {store.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}

        {/* Free delivery badge */}
        {store.delivery_fee === 0 && (
          <View style={styles.freeDeliveryBadge}>
            <Text style={styles.freeDeliveryText}>Free delivery</Text>
        </View>
        )}
      </View>
      
      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeDescription} numberOfLines={1}>{store.description}</Text>
        
        <View style={styles.storeMetrics}>
          <View style={styles.ratingWrapper}>
            <Ionicons name="star" size={14} color="#FFA500" />
            <Text style={styles.ratingText}>{store.rating}</Text>
          </View>
          
          <Text style={styles.metricsDot}>•</Text>
          <Text style={styles.distanceText}>{store.distance}km away</Text>
          
          {/* Mark quick-pick custom stores */}
          {(store as any).is_custom && (
            <>
              <Text style={styles.metricsDot}>•</Text>
              <Text style={[styles.deliveryFeeText, { color: Colors.primary }]}>Saved</Text>
            </>
          )}
          {store.delivery_fee > 0 && (
            <>
              <Text style={styles.metricsDot}>•</Text>
              <Text style={styles.deliveryFeeText}>R{store.delivery_fee} delivery</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Modern promotion banner component
  const renderPromotionBanner = (promotion: Promotion) => (
    <TouchableOpacity
      key={promotion.id}
      style={styles.promotionBanner}
      onPress={() => handlePromotionPress(promotion)}
      activeOpacity={0.95}
    >
      <Image source={{ uri: promotion.image_url }} style={styles.promotionImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.promotionGradient}
      >
        <View style={styles.promotionContent}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{promotion.discount}% OFF</Text>
        </View>
          <Text style={styles.promotionTitle}>{promotion.title}</Text>
          <Text style={styles.promotionDesc} numberOfLines={2}>
          {promotion.description}
        </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSection = (section: any) => {
    if (!section.is_visible) return null;

    const sectionData = getDataForSection(section);
    const sectionType = section.section_type || section.section_key;
    
    // Don't render empty sections
    if (!sectionData || sectionData.length === 0) return null;

    const isStoresSection = (
      sectionType === 'stores' ||
      sectionType === 'featured_stores' ||
      sectionType === 'popular_nearby' ||
      sectionType === 'category-stores'
    );

    const sectionKey = section.section_key;
    return (
      <View
        key={sectionKey}
        style={styles.section}
        onLayout={(e) => {
          sectionPositionsRef.current[sectionKey] = e.nativeEvent.layout.y;
          sectionLayoutsRef.current[sectionKey] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
        }}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.section_title}</Text>
          {isStoresSection && sectionData.length > 3 && (
            <TouchableOpacity style={styles.seeAllButton} onPress={() => handleSeeAllSection(section)}>
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Section */}
        {sectionType === 'categories' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
            ref={(r) => { horizontalRefs.current[sectionKey] = r; }}
            onScroll={(ev) => { horizontalOffsetsRef.current[sectionKey] = ev.nativeEvent.contentOffset.x; }}
            scrollEventThrottle={16}
          >
            {(sectionData as Category[]).map(renderCategoryPill)}
          </ScrollView>
        )}

        {/* Banners/Promotions Section */}
        {(sectionType === 'banners' || sectionType === 'promotions') && (
          <ScrollView
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.promotionsScroll}
            contentContainerStyle={styles.promotionsContent}
            ref={(r) => { horizontalRefs.current[sectionKey] = r; }}
            onScroll={(ev) => { horizontalOffsetsRef.current[sectionKey] = ev.nativeEvent.contentOffset.x; }}
            scrollEventThrottle={16}
          >
            {sectionData.map((item: any) => {
              // Handle both banner and promotion data structures
              if (item.image_url) {
                return renderPromotionBanner({
                  id: item.id,
                  title: item.title,
                  description: item.description || 'Special offer',
                  discount: item.discount || 20,
                  end_date: item.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  store_id: item.store_id || 1,
                  image_url: item.image_url
                });
              }
              return null;
            })}
          </ScrollView>
        )}

        {/* Stores Section */}
        {(sectionType === 'stores' || sectionType === 'featured_stores' || sectionType === 'popular_nearby' || sectionType === 'category-stores') && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storesScroll}
            contentContainerStyle={styles.storesContent}
            ref={(r) => { horizontalRefs.current[sectionKey] = r; }}
            onScroll={(ev) => { horizontalOffsetsRef.current[sectionKey] = ev.nativeEvent.contentOffset.x; }}
            scrollEventThrottle={16}
          >
            {/* Aggregator: Order from any store */}
            <TouchableOpacity
              key="any-store"
              style={[styles.storeCard, styles.storeCardCarousel, styles.addAnyStoreCard]}
              onPress={handleAddCustomStore}
              activeOpacity={0.9}
            >
              <View style={[styles.storeImageWrapper, styles.addAnyStoreImageWrapper]}>
                <View style={styles.addAnyStoreIconCircle}>
                  <Ionicons name="cart-outline" size={28} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.storeContent}>
                <Text style={styles.storeName}>Order from any store</Text>
                <Text style={styles.storeDescription} numberOfLines={2}>
                  Can't find your store? Search and add it.
                </Text>
                <View style={styles.storeMetrics}>
                  <Ionicons name="search" size={14} color={Colors.primary} />
                  <Text style={[styles.deliveryFeeText, { color: Colors.primary, marginLeft: 6 }]}>Add custom</Text>
                </View>
              </View>
            </TouchableOpacity>

            {(sectionData as Store[]).map((store: Store) => renderStoreCard(store, 'carousel'))}
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Loading...</Text>
      </View>
      </SafeAreaView>
    );
  }

  const sections = cmsPage?.content.sections
    .filter(section => section.is_visible)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];

  // Determine at runtime if we can use react-native-view-shot
  const canUseViewShot = Platform.OS !== 'ios' || (Constants as any)?.appOwnership !== 'expo';
  const Container: any = canUseViewShot ? require('react-native-view-shot').default : View;

  return (
    <Container {...(canUseViewShot ? { ref: viewShotRef } : {})} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.safeArea}>
      
      {/* Modern Header */}
        <View style={styles.headerContainer}>
          {/* Top Header Row */}
          <View style={styles.topHeader}>
            <TouchableOpacity style={styles.locationSelector} activeOpacity={0.7} onPress={handleLocationPress}>
                <View style={styles.locationIconWrapper}>
                <Ionicons name="location" size={16} color={Colors.primary} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.deliveryToText}>Deliver to</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.currentLocation} numberOfLines={1}>
                    {userLocation?.address || 'Add address'}
              </Text>
                  <Ionicons name="chevron-down" size={14} color="#666" />
            </View>
              </View>
            </TouchableOpacity>
            
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
                  <View style={styles.notificationIndicator} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <View style={styles.profileIconWrapper}>
                  <Ionicons name="person" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Section */}
          <View style={styles.searchWrapper}>
            <View style={styles.modernSearchBar}>
                <Ionicons name="search" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.modernSearchInput}
                  placeholder="Search restaurants, groceries, dishes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#8E8E93"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                )}
            </View>
            
            {/* Filter Button */}
            <View>
              <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
                <Ionicons name="options-outline" size={18} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* Main Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
              colors={[Colors.primary] as any}
              tintColor={Colors.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (ev) => {
              try {
                const y = ev.nativeEvent.contentOffset.y;
                const buffer = 80; // px margin
                // iterate sections and reset horizontal scroll for offscreen ones
                Object.keys(sectionLayoutsRef.current).forEach((key) => {
                  const layout = sectionLayoutsRef.current[key];
                  if (!layout) return;
                  const top = layout.y;
                  const bottom = top + layout.height;
                  const offscreen = (bottom < y - buffer) || (top > y + viewportHeight + buffer);
                  const wasOff = !!outOfViewRef.current[key];
                  if (offscreen) {
                    if (!wasOff) {
                      const x = horizontalOffsetsRef.current[key] || 0;
                      if (x > 0 && horizontalRefs.current[key]?.scrollTo) {
                        horizontalRefs.current[key]?.scrollTo({ x: 0, animated: true });
                        horizontalOffsetsRef.current[key] = 0;
                      }
                      outOfViewRef.current[key] = true;
                    }
                  } else {
                    if (wasOff) {
                      outOfViewRef.current[key] = false;
                    }
                  }
                });
              } catch {}
            }
          }
        )}
        scrollEventThrottle={16}
      >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.email?.split('@')[0] || 'there'}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {userLocation ? 'What would you like to order today?' : 'Add your address to start shopping'}
            </Text>
          </View>

          {/* Address Required Prompt */}
          {!userLocation && (
            <View style={styles.addressPromptSection}>
              <View style={styles.addressPromptCard}>
                <View style={styles.addressPromptIcon}>
                  <Ionicons name="location-outline" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.addressPromptTitle}>Add your delivery address</Text>
                <Text style={styles.addressPromptText}>
                  We need your location to show nearby restaurants and calculate delivery times
                </Text>
                <TouchableOpacity style={styles.addAddressButton} onPress={handleAddAddress} activeOpacity={0.8}>
                  <Text style={styles.addAddressButtonText}>Add Address</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Custom Picks (only if user has custom stores) */}
          {savedCustomStores && savedCustomStores.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Custom Picks</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.storesScroll}
                contentContainerStyle={styles.storesContent}
              >
                {savedCustomStores.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.storeCard, styles.storeCardCarousel]}
                    activeOpacity={0.9}
                    onPress={() => (navigation as any).navigate('CreateShoppingList', { selectedStore: s })}
                  >
                    <View style={styles.storeImageWrapper}>
                      <LinearGradient colors={['#F8F9FA', '#E8F8FA']} style={styles.storeImage} />
                      <View style={styles.deliveryBadge}>
                        <Ionicons name="time-outline" size={12} color="#1A1A1A" />
                        <Text style={styles.deliveryBadgeText}>
                          {s.eta ? `${s.eta} min` : 'ETA'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.storeContent}>
                      <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.storeDescription} numberOfLines={1}>{s.address || 'Custom store'}</Text>
                      <View style={styles.storeMetrics}>
                        {typeof s.distance === 'number' && (
                          <>
                            <Ionicons name="navigate-outline" size={14} color="#8E8E93" />
                            <Text style={styles.distanceText}>{s.distance.toFixed ? s.distance.toFixed(1) : s.distance}km</Text>
                          </>
                        )}
                        {s.hours ? (
                          <>
                            <Text style={styles.metricsDot}>•</Text>
                            <Text style={{ color: '#6B7280', fontSize: 12 }} numberOfLines={1}>{s.hours}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Categories Section (Always show if we have categories) */}
          {data.categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>What would you like?</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesContent}
              >
                {data.categories.slice(0, 8).map(renderCategoryPill)}
              </ScrollView>
            </View>
          )}
        
        {/* CMS Driven Sections */}
        {sections.map(renderSection)}
        
          {/* Bottom Padding for tab bar */}
        <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          userType="customer"
          onTabPress={handleTabPress}
        />
      </SafeAreaView>

      {/* Address Input Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Delivery Address</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddressModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Search and select your delivery address
              </Text>
              
              <View style={styles.placesContainer}>
                {!addressSaved ? (
                  <>
                    <View style={styles.autocompleteInputContainer}>
                      <Ionicons name="search" size={18} color={Colors.primary} />
                      <TextInput
                        style={styles.autocompleteInput}
                        placeholder="Search for your address..."
                        value={addressInput}
                        onChangeText={setAddressInput}
                        placeholderTextColor="#8E8E93"
                        autoFocus
                        editable={!savingAddress}
                      />
                      {savingAddress && (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      )}
                    </View>

                    {loadingPlaces && (
                      <View style={styles.placesLoadingContainer}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.placesLoadingText}>Searching places...</Text>
                      </View>
                    )}

                    {placeSuggestions.length > 0 && !savingAddress && (
                      <View style={styles.autocompleteList}>
                        {placeSuggestions.map((p) => (
                          <TouchableOpacity
                            key={p.place_id}
                            style={styles.autocompleteRow}
                            onPress={() => handleSelectSuggestion(p)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="location-outline" size={16} color="#8E8E93" />
                            <Text style={styles.autocompleteDescription}>{p.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>Address Added!</Text>
                    <Text style={styles.successText}>
                      Your delivery address has been saved successfully
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.cancelOnlyButton} onPress={() => setShowAddressModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Confirm Custom Store Modal */}
      <Modal
        visible={showConfirmCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Store Details</Text>
                <TouchableOpacity onPress={() => setShowConfirmCustomModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>Add a name and operating hours</Text>

              <View style={styles.addressInputContainer}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.addressInput}
                  placeholder="Store name"
                  value={customName}
                  onChangeText={setCustomName}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.addressInputContainer}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.addressInput}
                  placeholder="Operating hours (e.g., Mon-Sun 8am-8pm)"
                  value={customHours}
                  onChangeText={setCustomHours}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleConfirmCustomStore}>
                <Text style={styles.saveButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Store Modal */}
      <Modal
        visible={showCustomStoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Custom Store</Text>
                <TouchableOpacity 
                  onPress={() => setShowCustomStoreModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Search for the store you want to order from
              </Text>

              {/* Custom store search */}
              <View style={styles.placesContainer}>
                <View style={styles.autocompleteInputContainer}>
                  <Ionicons name="search" size={18} color={Colors.primary} />
                  <TextInput
                    style={styles.autocompleteInput}
                    placeholder="Type a store name or address..."
                    value={customStoreQuery}
                    onChangeText={setCustomStoreQuery}
                    placeholderTextColor="#8E8E93"
                    autoFocus
                    editable={!selectingCustom}
                  />
                  {selectingCustom && (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  )}
                </View>

                {loadingCustom && (
                  <View style={styles.placesLoadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.placesLoadingText}>Searching stores...</Text>
                  </View>
                )}

                {customSuggestions.length > 0 && !selectingCustom && (
                  <View style={styles.autocompleteList}>
                    {customSuggestions.map((p: any) => {
                      const main = p.main_text || p?.structured_formatting?.main_text || (p?.terms?.[0]?.value) || p.description || 'Store';
                      const secondary = p.secondary_text || p?.structured_formatting?.secondary_text || '';
                      return (
                        <TouchableOpacity
                          key={p.place_id}
                          style={styles.autocompleteRow}
                          onPress={() => handleSelectCustomSuggestion(p)}
                          activeOpacity={0.7}
                        >
                          <View style={{ width: 22, alignItems: 'center' }}>
                            <Ionicons name="business-outline" size={16} color="#8E8E93" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.autocompleteDescription, { fontWeight: '600' }]} numberOfLines={1}>
                              {main}
                            </Text>
                            {secondary ? (
                              <Text style={{ color: '#8E8E93', fontSize: 12 }} numberOfLines={1}>
                                {secondary}
                              </Text>
                            ) : null}
                          </View>
                          {typeof p.distance_km === 'number' && (
                            <Text style={{ color: '#8E8E93', fontSize: 12, marginLeft: 8 }}>{p.distance_km.toFixed(1)} km</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.cancelOnlyButton} onPress={() => setShowCustomStoreModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // Modern Header Styles
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  deliveryToText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocation: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    marginRight: 4,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  actionIconWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Modern Search Section
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  modernSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  modernSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Welcome Section
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 28,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    lineHeight: 20,
  },

  // Address Prompt Section
  addressPromptSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  addressPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  addressPromptIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  addressPromptText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addAddressButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },

  // Section Styles
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    marginRight: 2,
  },

  // Categories
  categoriesScroll: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    alignItems: 'center',
    marginRight: 24,
    width: 68,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryName: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Promotions
  promotionsScroll: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  promotionsContent: {
    paddingHorizontal: 20,
  },
  promotionBanner: {
    width: width - 60,
    height: 160,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  promotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  promotionGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    justifyContent: 'flex-end',
  },
  promotionContent: {
    padding: 20,
  },
  discountBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  promotionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Store Cards
  storesScroll: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  storesContent: {
    paddingHorizontal: 20,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  storeCardCarousel: {
    width: 280,
    marginRight: 16,
  },
  addAnyStoreCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B2EBF2',
    backgroundColor: '#F8FFFF',
  },
  addAnyStoreImageWrapper: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addAnyStoreIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeCardList: {
    width: width - 40,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  storeImageWrapper: {
    position: 'relative',
  },
  storeImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  deliveryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  freeDeliveryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  freeDeliveryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  storeContent: {
    padding: 16,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  storeDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
  },
  storeMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
    marginLeft: 4,
  },
  metricsDot: {
    fontSize: 14,
    color: '#D1D1D6',
    marginHorizontal: 8,
    fontWeight: '900',
  },
  distanceText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  deliveryFeeText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },

  // Bottom Padding
  bottomPadding: {
    height: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 24,
  },
  
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelOnlyButton: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    marginTop: 12,
  },

  // Google Places style keys used by component
  placesContainer: {
    flex: 1,
    marginBottom: 20,
    minHeight: 200,
  },
  autocompleteContainer: {
    flex: 1,
  },
  autocompleteInputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 12,
  },
  autocompleteInput: {
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
  },
  autocompleteList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  autocompleteRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  autocompleteDescription: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  autocompleteSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  autocompleteIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },

  // Success State Styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Places Loading State Styles
  placesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 8,
  },
  placesLoadingText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },

  // Address Input Styles
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  addressInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

export default CustomerDashboard;
