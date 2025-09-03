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

const CustomerDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    categories: Category[];
    featuredStores: Store[];
    promotions: Promotion[];
  }>({
    categories: [],
    featuredStores: [],
    promotions: [],
  });
  const [loading, setLoading] = useState(true);
  const viewShotRef = useRef<ViewShot>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

      // Fetch featured stores with distance calculation
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_featured', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (storesError) {
        console.error('Error fetching stores:', storesError);
      }

      // Fetch active promotions
      const { data: promotions, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .gte('valid_until', new Date().toISOString())
        .order('valid_until')
        .limit(4);

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
      }

      setData({
        categories: categories || [],
        featuredStores: stores || [],
        promotions: promotions || [],
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

  const renderCategoryItem = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(category)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Ionicons name={category.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
    </TouchableOpacity>
  );

  const renderStoreCard = (store: Store) => (
    <TouchableOpacity
      key={store.id}
      style={styles.storeCard}
      onPress={() => handleStorePress(store)}
    >
      <Image source={{ uri: store.image_url }} style={styles.storeImage} />
      <View style={styles.storeInfo}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeDescription} numberOfLines={2}>{store.description}</Text>
        <View style={styles.storeMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{store.rating}</Text>
          </View>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.deliveryTime}>{store.delivery_time}</Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.distance}>{store.distance} km</Text>
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
      <View style={styles.promotionOverlay}>
        <Text style={styles.promotionTitle}>{promotion.title}</Text>
        <Text style={styles.promotionDescription}>{promotion.description}</Text>
        <Text style={styles.promotionDiscount}>{promotion.discount}% OFF</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ViewShot ref={viewShotRef} style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>{user?.email || 'Guest'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={takeSnapshot}>
            <Ionicons name="camera" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {data.categories.map(renderCategoryItem)}
          </View>
        </View>

        {/* Featured Stores Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Stores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.featuredStores.map(renderStoreCard)}
          </ScrollView>
        </View>

        {/* Promotions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.promotions.map(renderPromotionCard)}
          </ScrollView>
        </View>
      </ScrollView>
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Poppins_400Regular',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Poppins_600SemiBold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  storeCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  storeInfo: {
    padding: 15,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  storeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
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
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
  metaSeparator: {
    marginHorizontal: 8,
    color: '#ccc',
    fontFamily: 'Poppins_400Regular',
  },
  deliveryTime: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  promotionCard: {
    width: 250,
    height: 150,
    borderRadius: 12,
    marginRight: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    fontFamily: 'Poppins_600SemiBold',
  },
  promotionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontFamily: 'Poppins_400Regular',
  },
  promotionDiscount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: 'Poppins_700Bold',
  },
});

export default CustomerDashboard;
