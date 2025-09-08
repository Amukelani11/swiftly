import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Dimensions, Image, Platform, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrencySafe } from '../utils/format';
import { Colors } from '../styles/theme';

type Nav = StackNavigationProp<RootStackParamList, 'AllStores'>;
type Route = RouteProp<RootStackParamList, 'AllStores'>;

interface Props {
  navigation: Nav;
  route: Route;
}

const { width } = Dimensions.get('window');

const AllStores: React.FC<Props> = ({ navigation, route }) => {
  const { stores, promotions, categories, selectedFilters = [], activeCategory = null, searchQuery = '' } = route.params;
  const [q, setQ] = useState(searchQuery);
  const [filters, setFilters] = useState<string[]>(selectedFilters);

  const promoStores = useMemo(() => new Set((promotions || []).map((p: any) => p.store)), [promotions]);
  const activeCatObj = useMemo(() => (categories || []).find((c: any) => c.id === activeCategory), [categories, activeCategory]);

  const filtered = useMemo(() => {
    let list = [...(stores || [])];
    if (q.trim()) list = list.filter(s => (s.name || '').toLowerCase().includes(q.trim().toLowerCase()));
    if (activeCatObj) list = list.filter(s => s.category === activeCatObj.slug || s.category === (activeCatObj.name || '').toLowerCase());
    if (filters.includes('top_rated')) list = list.filter(s => (s.rating ?? 0) >= 4.7);
    if (filters.includes('under_30')) list = list.filter(s => (s.deliveryTime ?? 999) <= 30);
    if (filters.includes('low_fees')) list = list.filter(s => (s.deliveryFee ?? 999) <= 25);
    if (filters.includes('offers')) list = list.filter(s => promoStores.has(s.name));
    return list;
  }, [stores, q, filters, activeCatObj, promoStores]);

  const toggle = (key: string) => {
    setFilters(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const renderStore = ({ item: store }: { item: any }) => {
    const eta = typeof store.deliveryTime === 'number' ? store.deliveryTime : (typeof store.eta === 'number' ? store.eta : undefined);
    const km = typeof store.distance === 'number' ? Math.round(store.distance * 10) / 10 : undefined;
    const distanceLabel = typeof km === 'number' ? `${km.toFixed(1)} km` : '';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate('CreateShoppingList', { selectedStore: store } as any)}>
        <View style={styles.media}>
          {store.image ? (
            <Image source={{ uri: store.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[Colors.primary, '#007f94']} style={styles.image}>
              <Ionicons name={(store.logo as any) || 'storefront-outline'} size={36} color="#fff" />
            </LinearGradient>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{store.name}</Text>
            <View style={[styles.badge, (store.isOpen ? styles.badgeOpen : styles.badgeClosed)]}>
              <Text style={[styles.badgeText, (store.isOpen ? styles.badgeTextOpen : styles.badgeTextClosed)]}>{store.isOpen ? 'Open' : 'Closed'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.rating}>{(store.rating ?? 0).toFixed(1)}</Text>
            {eta ? (<>
              <Text style={styles.sep}>•</Text>
              <Text style={styles.meta}>{eta} min</Text>
            </>) : null}
            {typeof km === 'number' ? (<>
              <Text style={styles.sep}>•</Text>
              <Text style={styles.meta}>{distanceLabel}</Text>
            </>) : null}
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.fee}>Delivery {formatCurrencySafe(store.deliveryFee)}</Text>
            <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Order Now</Text></TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const goBackToSource = () => {
    const from = route.params?.sourceSection;
    if (from) {
      navigation.navigate('CustomerDashboard' as any, { scrollToSection: from } as any);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToSource} style={styles.back}><Ionicons name="chevron-back" size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.title}>All Stores</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search stores..."
          placeholderTextColor="#999"
          value={q}
          onChangeText={setQ}
        />
        <TouchableOpacity><Ionicons name="filter" size={18} color={Colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {['offers','top_rated','under_30','low_fees'].map(key => (
          <TouchableOpacity key={key} onPress={() => toggle(key)} style={[styles.chip, filters.includes(key) && styles.chipActive]}>
            <Text style={[styles.chipText, filters.includes(key) && styles.chipTextActive]}>
              {key === 'offers' ? 'Offers' : key === 'top_rated' ? 'Top rated' : key === 'under_30' ? 'Under 30 min' : 'Low fees'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderStore}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[200] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0, paddingBottom: 8 },
  back: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', fontFamily: 'Poppins-Bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight },
  input: { flex: 1, marginHorizontal: 8, color: '#111827' },
  filters: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginRight: 8 },
  chipActive: { backgroundColor: 'rgba(0,151,178,0.12)', borderColor: 'rgba(0,151,178,0.33)' },
  chipText: { color: Colors.text.primary, fontSize: 13, fontFamily: 'Poppins-Medium' },
  chipTextActive: { color: Colors.primary, fontFamily: 'Poppins-SemiBold' },
  card: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  media: { height: 140, backgroundColor: Colors.gray[300] },
  image: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  body: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, fontFamily: 'Poppins-Bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeOpen: { backgroundColor: '#10B98120' },
  badgeClosed: { backgroundColor: '#EF444420' },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Poppins-SemiBold' },
  badgeTextOpen: { color: '#10B981' },
  badgeTextClosed: { color: '#EF4444' },
  rating: { fontSize: 14, color: '#F59E0B', marginLeft: 4 },
  sep: { marginHorizontal: 8, color: '#9CA3AF' },
  meta: { color: '#6B7280' },
  fee: { color: '#6B7280' },
  cta: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  ctaText: { color: '#fff', fontWeight: '600' },
});

export default AllStores;
