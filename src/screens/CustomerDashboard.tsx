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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

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
  delivery_time: string;
  minimum_order: number;
  delivery_fee: number;
  image_url: string;
  category_id: number;
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
  valid_until: string;
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
  const navigation = useNavigation();
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef<ViewShot>(null);

  const fetchCMSData = async () => {
    try {
      console.log('🎨 Fetching CMS data for customer_dashboard...');
      
      // Try to fetch directly from Supabase first
      const { data: cmsData, error: cmsError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('page_key', 'customer_dashboard')
        .eq('is_active', true)
        .single();

      if (!cmsError && cmsData) {
        console.log('🎨 CMS data loaded from Supabase:', cmsData);
        setCmsPage(cmsData);
        return cmsData;
      }

      // Fallback: Try admin panel API
      try {
        const cmsResponse = await fetch('http://localhost:3000/api/cms/pages/customer_dashboard');
        if (cmsResponse.ok) {
          const apiData = await cmsResponse.json();
          console.log('🎨 CMS data loaded from API:', apiData);
          setCmsPage(apiData.page);
          return apiData.page;
        }
      } catch (apiError) {
        console.log('🎨 Admin panel API not available');
      }

      console.log('🎨 Using fallback CMS configuration');
    } catch (error) {
      console.error('🎨 Error fetching CMS data:', error);
    }

    // Fallback to default configuration
    const fallbackCMS: CMSPage = {
      page_key: 'customer_dashboard',
      title: 'Welcome to Swiftly',
      is_active: true,
      content: {
        sections: [
          {
            section_key: 'categories',
            section_title: 'Shop by Category',
            layout: 'pills',
            is_visible: true,
            sort_order: 10,
            max_items: 8
          },
          {
            section_key: 'featured_stores',
            section_title: 'Featured Stores',
            layout: 'carousel',
            is_visible: true,
            sort_order: 20,
            max_items: 6,
            filters: { featured_only: true }
          },
          {
            section_key: 'popular_nearby',
            section_title: 'Popular Near You',
            layout: 'list',
            is_visible: true,
            sort_order: 30,
            max_items: 5,
            filters: { open_only: true, sort: 'rating' }
          },
          {
            section_key: 'promotions',
            section_title: "Today's Deals",
            layout: 'carousel',
            is_visible: true,
            sort_order: 40,
            max_items: 4
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
      console.log('📊 Fetching dashboard data...');
      
      // Fetch categories with proper column mapping
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon_name, color_code, is_active')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
      } else {
        console.log(`✅ Loaded ${categories?.length || 0} categories`);
      }

      // Fetch all stores with proper column mapping
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select(`
          id, name, description, address, rating, delivery_time,
          minimum_order, delivery_fee, image_url, category_id,
          distance, is_featured, is_open, eta
        `)
        .order('rating', { ascending: false });

      if (storesError) {
        console.error('❌ Error fetching stores:', storesError);
      } else {
        console.log(`✅ Loaded ${stores?.length || 0} stores`);
      }

      // Fetch active promotions with proper column mapping
      const { data: promotions, error: promotionsError } = await supabase
        .from('promotions')
        .select('id, title, description, discount, valid_until, store_id, image_url')
        .gte('valid_until', new Date().toISOString())
        .order('valid_until');

      if (promotionsError) {
        console.error('❌ Error fetching promotions:', promotionsError);
      } else {
        console.log(`✅ Loaded ${promotions?.length || 0} active promotions`);
      }

      // Map categories to match interface (icon_name -> icon, color_code -> color)
      const mappedCategories = (categories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon_name || 'storefront-outline',
        color: cat.color_code || '#666',
        slug: cat.slug
      }));

      setData({
        categories: mappedCategories,
        stores: stores || [],
        promotions: promotions || [],
      });
      
      console.log('📊 Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleCategoryPress = (category: Category) => {
    // navigation.navigate('CategoryStores', { category });
  };

  const handleStorePress = (store: Store) => {
    // navigation.navigate('StoreDetail', { storeId: store.id });
  };

  const handlePromotionPress = (promotion: Promotion) => {
    // navigation.navigate('StoreDetail', { storeId: promotion.store_id });
  };

  const getDataForSection = (section: CMSSection) => {
    switch (section.section_key) {
      case 'categories':
        return data.categories.slice(0, section.max_items || 8);
      
      case 'featured_stores':
      case 'popular_nearby':
        let filteredStores = [...data.stores];
        
        if (section.filters?.featured_only) {
          filteredStores = filteredStores.filter(store => store.is_featured);
        }
        
        if (section.filters?.open_only) {
          filteredStores = filteredStores.filter(store => store.is_open);
        }
        
        if (section.filters?.category) {
          filteredStores = filteredStores.filter(store => 
            store.category_id.toString() === section.filters?.category
          );
        }
        
        // Sort based on filters
        if (section.filters?.sort === 'rating') {
          filteredStores.sort((a, b) => b.rating - a.rating);
        } else if (section.filters?.sort === 'distance') {
          filteredStores.sort((a, b) => a.distance - b.distance);
        } else if (section.filters?.sort === 'eta') {
          filteredStores.sort((a, b) => (a.eta || 30) - (b.eta || 30));
        }
        
        return filteredStores.slice(0, section.max_items || 6);
      
      case 'promotions':
        return data.promotions.slice(0, section.max_items || 4);
      
      default:
        return [];
    }
  };

  const takeSnapshot = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current!.capture();
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        
        // Upload to CMS
        const response = await fetch('http://localhost:3000/api/cms/snapshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64,
            page: 'customer-dashboard',
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          Alert.alert('Success', 'Dashboard snapshot uploaded to CMS');
        } else {
          Alert.alert('Error', 'Failed to upload snapshot');
        }
      }
    } catch (error) {
      console.error('Error taking snapshot:', error);
      Alert.alert('Error', 'Failed to take snapshot');
    }
  };

  const renderCategoryPill = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryPill}
      onPress={() => handleCategoryPress(category)}
    >
      <LinearGradient
        colors={[category.color, category.color + '80']}
        style={styles.categoryPillGradient}
      >
        <Ionicons name={category.icon as any} size={20} color="white" />
        <Text style={styles.categoryPillText}>{category.name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStoreCardModern = (store: Store, layout: string = 'carousel') => (
    <TouchableOpacity
      key={store.id}
      style={[
        styles.modernStoreCard,
        layout === 'list' ? styles.storeCardList : styles.storeCardCarousel
      ]}
      onPress={() => handleStorePress(store)}
    >
      <View style={styles.storeImageContainer}>
        <Image source={{ uri: store.image_url }} style={styles.modernStoreImage} />
        {store.is_featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        <View style={styles.deliveryTimeBadge}>
          <Text style={styles.deliveryTimeText}>{store.eta || store.delivery_time}</Text>
        </View>
      </View>
      
      <View style={styles.modernStoreInfo}>
        <Text style={styles.modernStoreName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.modernStoreDescription} numberOfLines={2}>{store.description}</Text>
        
        <View style={styles.modernStoreMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.modernRating}>{store.rating}</Text>
          </View>
          
          <View style={styles.metaDivider} />
          
          <Text style={styles.modernDistance}>{store.distance}km</Text>
          
          <View style={styles.metaDivider} />
          
          <Text style={styles.modernDeliveryFee}>
            {store.delivery_fee === 0 ? 'Free delivery' : `R${store.delivery_fee}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPromotionCardModern = (promotion: Promotion) => (
    <TouchableOpacity
      key={promotion.id}
      style={styles.modernPromotionCard}
      onPress={() => handlePromotionPress(promotion)}
    >
      <Image source={{ uri: promotion.image_url }} style={styles.modernPromotionImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.modernPromotionOverlay}
      >
        <View style={styles.promotionBadge}>
          <Text style={styles.promotionBadgeText}>{promotion.discount}% OFF</Text>
        </View>
        <Text style={styles.modernPromotionTitle}>{promotion.title}</Text>
        <Text style={styles.modernPromotionDescription} numberOfLines={2}>
          {promotion.description}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSection = (section: CMSSection) => {
    if (!section.is_visible) return null;

    const sectionData = getDataForSection(section);
    if (!sectionData || sectionData.length === 0) return null;

    return (
      <View key={section.section_key} style={styles.modernSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.modernSectionTitle}>{section.section_title}</Text>
          {sectionData.length > 3 && (
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {section.section_key === 'categories' && section.layout === 'pills' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {sectionData.map(renderCategoryPill)}
          </ScrollView>
        )}

        {(section.section_key === 'featured_stores' || section.section_key === 'popular_nearby') && (
          <ScrollView
            horizontal={section.layout === 'carousel'}
            showsHorizontalScrollIndicator={false}
            style={section.layout === 'list' ? styles.storesListContainer : styles.storesCarouselContainer}
          >
            {sectionData.map((store: Store) => renderStoreCardModern(store, section.layout))}
          </ScrollView>
        )}

        {section.section_key === 'promotions' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promotionsContainer}>
            {sectionData.map(renderPromotionCardModern)}
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.modernLoadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const sections = cmsPage?.content.sections
    .filter(section => section.is_visible)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];

  return (
    <ViewShot ref={viewShotRef} style={styles.modernContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Modern Header */}
      <Animated.View style={[styles.modernHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
        >
          <View style={styles.modernHeaderContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.modernGreeting}>Good morning</Text>
              <Text style={styles.modernUserName}>
                {user?.email?.split('@')[0] || 'Guest'}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.modernNotificationButton}>
                <Ionicons name="notifications-outline" size={24} color="white" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>3</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modernProfileButton} onPress={takeSnapshot}>
                <Ionicons name="person-circle-outline" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for food, stores..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#666"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.modernContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.contentSpacer} />
        
        {/* CMS Driven Sections */}
        {sections.map(renderSection)}
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  // Modern Container Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Loading Styles
  modernLoadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },

  // Header Styles
  modernHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  modernGreeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  modernUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  modernNotificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modernProfileButton: {
    // No additional styling needed, using icon directly
  },

  // Search Bar Styles
  searchContainer: {
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },

  // Content Styles
  modernContent: {
    flex: 1,
  },
  contentSpacer: {
    height: Platform.OS === 'ios' ? 180 : 160,
  },
  bottomPadding: {
    height: 100,
  },

  // Section Styles
  modernSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modernSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },

  // Category Pills Styles
  categoriesContainer: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    marginRight: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  categoryPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },
  categoryPillText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Modern Store Card Styles
  modernStoreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  storeCardCarousel: {
    width: 280,
    marginRight: 16,
    marginLeft: 4,
  },
  storeCardList: {
    width: width - 40,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  storeImageContainer: {
    position: 'relative',
  },
  modernStoreImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryTimeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryTimeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modernStoreInfo: {
    padding: 16,
  },
  modernStoreName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modernStoreDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  modernStoreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernRating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginHorizontal: 8,
  },
  modernDistance: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modernDeliveryFee: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Store List Containers
  storesCarouselContainer: {
    paddingLeft: 16,
  },
  storesListContainer: {
    // No additional padding needed for list layout
  },

  // Modern Promotion Card Styles
  promotionsContainer: {
    paddingHorizontal: 20,
  },
  modernPromotionCard: {
    width: 300,
    height: 180,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modernPromotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modernPromotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  promotionBadge: {
    position: 'absolute',
    top: -40,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  promotionBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modernPromotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  modernPromotionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});

export default CustomerDashboard;
