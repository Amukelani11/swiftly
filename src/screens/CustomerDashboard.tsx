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
  FlatList,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { CmsSection, CmsPageContent } from '../types/cms';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name: string;
  color_code: string;
  is_active: boolean;
}

interface Store {
  id: string;
  name: string;
  description: string;
  address: string;
  rating: number;
  delivery_time: string;
  minimum_order: number;
  delivery_fee: number;
  image_url: string;
  category_id: string;
  distance: number;
  is_open?: boolean;
  is_featured?: boolean;
  cuisine_type?: string;
  price_range?: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  valid_until: string;
  store_id: string;
  image_url: string;
  promo_code?: string;
}

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
}

const CustomerDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cmsContent, setCmsContent] = useState<CmsPageContent>({ sections: [] });
  const [data, setData] = useState<{
    categories: Category[];
    featuredStores: Store[];
    promotions: Promotion[];
    banners: Banner[];
    popularStores: Store[];
    topRatedStores: Store[];
  }>({
    categories: [],
    featuredStores: [],
    promotions: [],
    banners: [],
    popularStores: [],
    topRatedStores: [],
  });
  const [loading, setLoading] = useState(true);
  const viewShotRef = useRef<ViewShot>(null);

  const fetchCmsContent = async () => {
    try {
      const { data: cmsData, error: cmsError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('page_key', 'customer_dashboard')
        .eq('is_active', true)
        .single();

      if (cmsError) {
        console.log('CMS data not found, using default layout');
        // Use default layout if CMS data is not available
        setCmsContent({
          sections: [
            {
              section_key: 'search',
              section_title: 'Search',
              layout: 'text',
              is_visible: true,
              sort_order: 0,
            },
            {
              section_key: 'banners',
              section_title: 'Special Offers',
              layout: 'banner',
              is_visible: true,
              sort_order: 1,
              max_items: 3,
            },
            {
              section_key: 'categories',
              section_title: 'What are you looking for?',
              layout: 'pills',
              is_visible: true,
              sort_order: 2,
              max_items: 8,
            },
            {
              section_key: 'popular_nearby',
              section_title: 'Popular near you',
              layout: 'carousel',
              is_visible: true,
              sort_order: 3,
              max_items: 6,
              filters: { open_only: true, sort: 'rating' },
            },
            {
              section_key: 'top_rated',
              section_title: 'Top rated',
              layout: 'list',
              is_visible: true,
              sort_order: 4,
              max_items: 5,
              filters: { sort: 'rating' },
            },
            {
              section_key: 'promotions',
              section_title: "Today's deals",
              layout: 'carousel',
              is_visible: true,
              sort_order: 5,
              max_items: 4,
            },
          ],
        });
      } else {
        setCmsContent(cmsData.content || { sections: [] });
      }
    } catch (error) {
      console.error('Error fetching CMS content:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch CMS content first
      await fetchCmsContent();
      
      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

      // Fetch stores
      const { data: allStores, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (storesError) {
        console.error('Error fetching stores:', storesError);
      }

      // Fetch promotions
      const { data: promotions, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('valid_until')
        .limit(10);

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
      }

      // Fetch banners
      const { data: banners, error: bannersError } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('position')
        .limit(5);

      if (bannersError) {
        console.error('Error fetching banners:', bannersError);
      }

      // Calculate distances for stores (mock calculation for now)
      const storesWithDistance = (allStores || []).map((store: any) => ({
        ...store,
        distance: Math.round(Math.random() * 5 * 10) / 10, // Mock distance calculation
      }));

      setData({
        categories: categories || [],
        featuredStores: storesWithDistance.filter((s: Store) => s.is_featured),
        promotions: promotions || [],
        banners: banners || [],
        popularStores: storesWithDistance.filter((s: Store) => s.is_open).sort((a: Store, b: Store) => b.rating - a.rating),
        topRatedStores: storesWithDistance.sort((a: Store, b: Store) => b.rating - a.rating),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const handleBannerPress = (banner: Banner) => {
    if (banner.link_url) {
      // navigation.navigate(banner.link_url);
    }
  };

  const handleSearchPress = () => {
    // navigation.navigate('Search', { query: searchQuery });
  };

  const takeSnapshot = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current!.capture();
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        
        // Upload to CMS
        const response = await fetch('http://10.0.2.2:3000/api/cms/snapshot', {
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

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for restaurants, groceries, etc."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchPress}
        />
      </View>
    </View>
  );

  const renderBannerCard = (banner: Banner) => (
    <TouchableOpacity
      key={banner.id}
      style={styles.bannerCard}
      onPress={() => handleBannerPress(banner)}
    >
      <Image source={{ uri: banner.image_url }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryPill}
      onPress={() => handleCategoryPress(category)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color_code }]}>
        <Ionicons name={category.icon_name as any} size={20} color="white" />
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
    </TouchableOpacity>
  );

  const renderStoreCard = (store: Store, layout: 'carousel' | 'list' = 'carousel') => (
    <TouchableOpacity
      key={store.id}
      style={layout === 'carousel' ? styles.storeCard : styles.storeListCard}
      onPress={() => handleStorePress(store)}
    >
      <View style={styles.storeImageContainer}>
        <Image source={{ uri: store.image_url }} style={layout === 'carousel' ? styles.storeImage : styles.storeListImage} />
        {store.delivery_fee === 0 && (
          <View style={styles.freeDeliveryBadge}>
            <Text style={styles.freeDeliveryText}>Free delivery</Text>
          </View>
        )}
        {!store.is_open && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        )}
      </View>
      <View style={styles.storeInfo}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          <Text style={styles.priceRange}>{store.price_range}</Text>
        </View>
        <Text style={styles.storeDescription} numberOfLines={1}>{store.description}</Text>
        <View style={styles.storeMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{store.rating}</Text>
          </View>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.deliveryTime}>{store.delivery_time}</Text>
          {store.delivery_fee > 0 && (
            <>
              <Text style={styles.metaSeparator}>•</Text>
              <Text style={styles.deliveryFee}>R{store.delivery_fee} delivery</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPromotionCard = (promotion: Promotion) => (
    <TouchableOpacity
      key={promotion.id}
      style={styles.promotionCard}
      onPress={() => handlePromotionPress(promotion)}
    >
      <Image source={{ uri: promotion.image_url }} style={styles.promotionImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.promotionGradient}
      />
      <View style={styles.promotionOverlay}>
        <Text style={styles.promotionTitle}>{promotion.title}</Text>
        <Text style={styles.promotionDescription} numberOfLines={2}>{promotion.description}</Text>
        {promotion.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.promotionDiscount}>{promotion.discount}% OFF</Text>
          </View>
        )}
        {promotion.promo_code && (
          <Text style={styles.promoCode}>Code: {promotion.promo_code}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: CmsSection) => {
    if (!section.is_visible) return null;

    const getSectionData = () => {
      switch (section.section_key) {
        case 'categories':
          return data.categories.slice(0, section.max_items || 8);
        case 'popular_nearby':
          return data.popularStores.slice(0, section.max_items || 6);
        case 'top_rated':
          return data.topRatedStores.slice(0, section.max_items || 5);
        case 'promotions':
          return data.promotions.slice(0, section.max_items || 4);
        case 'banners':
          return data.banners.slice(0, section.max_items || 3);
        case 'featured':
          return data.featuredStores.slice(0, section.max_items || 6);
        default:
          return [];
      }
    };

    const sectionData = getSectionData();
    if (sectionData.length === 0 && section.section_key !== 'search') return null;

    if (section.section_key === 'search') {
      return (
        <View key={section.section_key} style={styles.section}>
          {renderSearchBar()}
        </View>
      );
    }

    if (section.section_key === 'banners') {
      return (
        <View key={section.section_key} style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannersContainer}>
            {data.banners.map(renderBannerCard)}
          </ScrollView>
        </View>
      );
    }

    return (
      <View key={section.section_key} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.section_title}</Text>
          {(section.section_key === 'popular_nearby' || section.section_key === 'top_rated') && (
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {section.layout === 'pills' && section.section_key === 'categories' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              {data.categories.map(renderCategoryItem)}
            </View>
          </ScrollView>
        ) : section.layout === 'carousel' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {section.section_key === 'promotions' 
              ? data.promotions.map(renderPromotionCard)
              : (sectionData as Store[]).map((store) => renderStoreCard(store, 'carousel'))
            }
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            {(sectionData as Store[]).map((store) => renderStoreCard(store, 'list'))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <Ionicons name="restaurant" size={48} color="white" />
            <Text style={styles.loadingText}>Loading delicious options...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <ViewShot ref={viewShotRef} style={styles.container}>
        {/* Modern Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.locationContainer}>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryLabel}>Deliver to</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color="white" />
                  <Text style={styles.locationText}>Current Location</Text>
                  <Ionicons name="chevron-down" size={16} color="white" />
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={takeSnapshot}>
                <Ionicons name="person-circle-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Render sections dynamically based on CMS content */}
          {cmsContent.sections
            ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(renderSection)}
        </ScrollView>
      </ViewShot>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
    fontWeight: '500',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationContainer: {
    flex: 1,
  },
  deliveryInfo: {
    alignItems: 'flex-start',
  },
  deliveryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAllText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  
  // Banner Styles
  bannersContainer: {
    paddingLeft: 20,
  },
  bannerCard: {
    width: width - 40,
    height: 140,
    borderRadius: 16,
    marginRight: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  
  // Category Pills Styles
  categoriesContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  
  // Store Card Styles
  storeCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 16,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  storeListCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  storeImageContainer: {
    position: 'relative',
  },
  storeImage: {
    width: '100%',
    height: 140,
  },
  storeListImage: {
    width: 100,
    height: 100,
  },
  freeDeliveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#00C851',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeDeliveryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  storeInfo: {
    padding: 16,
    flex: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
  storeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  metaSeparator: {
    marginHorizontal: 6,
    color: '#ccc',
    fontSize: 12,
  },
  deliveryTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  deliveryFee: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // Promotion Styles
  promotionCard: {
    width: 300,
    height: 160,
    borderRadius: 16,
    marginRight: 16,
    marginLeft: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  promotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    lineHeight: 18,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  promotionDiscount: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  promoCode: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  
  // List Container
  listContainer: {
    paddingHorizontal: 0,
  },
});

export default CustomerDashboard;
