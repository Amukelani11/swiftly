import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  FlatList,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
// Map usage is handled by LiveMap component
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';
import SmartFloatModal from '../components/SmartFloatModal';
import LiveMap from '../components/LiveMap';
import JobNotification from '../components/JobNotification';
import SmoothTransitionButton from '../components/SmoothTransitionButton';
import { supabase } from '../lib/supabase';
import { formatCurrencySafe } from '../utils/format';
import { Colors } from '../styles/theme';

type ProviderDashboardNavigationProp = StackNavigationProp<RootStackParamList, 'ProviderDashboard'>;

interface Props {
  navigation: ProviderDashboardNavigationProp;
}

interface ProviderStats {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  completedTasks: number;
  activeTasks: number;
  rating: number;
  walletBalance: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  status: string;
  created_at: string;
  customer_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  province?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundMap: {
    flex: 1,
    opacity: 0.3,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Poppins-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 4,
    fontFamily: 'Poppins-Medium',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: 'Poppins-Bold',
    lineHeight: 36,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  centralButtonSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  centralButtonSectionOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  earningsDashboard: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  earningsDashboardOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },
  earningsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  metaSeparator: {
    fontSize: 14,
    color: '#999999',
    marginHorizontal: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 4,
    fontFamily: 'Poppins-Medium',
  },
  ordersSection: {
    flex: 1,
    paddingBottom: 20,
  },
  ordersSectionOffline: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: 'Poppins-Bold',
  },
  seeAllText: {
    fontSize: 16,
    color: '#00D4AA',
    fontFamily: 'Poppins-Medium',
  },
  ordersList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderMain: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  orderDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  orderUrgency: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
  },
  orderEarnings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00D4AA',
    fontFamily: 'Poppins-Bold',
  },
  acceptButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 20,
  },
  emptyOrdersIcon: {
    marginBottom: 16,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  emptyOrdersText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Poppins-Regular',
  },
  refreshButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  refreshIndicator: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  refreshText: {
    fontSize: 12,
    color: '#00D4AA',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  refreshingIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    flexDirection: 'row',
  },
  refreshingText: {
    fontSize: 14,
    color: '#00D4AA',
    marginLeft: 8,
    fontFamily: 'Poppins-Medium',
  },
  onlineContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapView: {
    flex: 1,
  },
  summaryOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 120,
    zIndex: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  earningsSummaryContent: {
    flex: 1,
  },
  earningsSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins-Bold',
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  earningsItem: {
    alignItems: 'center',
    flex: 1,
  },
  earningsIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsTextContainer: {
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: 'Poppins-Bold',
  },
  floatingActionButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 15,
  },
  goOfflineButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  goOfflineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  goOfflineButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});

const ProviderDashboard: React.FC<Props> = ({ navigation }): JSX.Element => {
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [animationsDisabled, setAnimationsDisabled] = useState(false);

  // Smart Float state
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [floatLoading, setFloatLoading] = useState(false);
  const [declaredFloat, setDeclaredFloat] = useState(0);
  const [suggestedFloat, setSuggestedFloat] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const onlineRef = useRef<boolean>(false);
  useEffect(() => { onlineRef.current = isOnline; }, [isOnline]);

  // Animation states
  const [showMap, setShowMap] = useState(false);
  const [showJobNotification, setShowJobNotification] = useState(false);
  const [currentNotificationOrder, setCurrentNotificationOrder] = useState<Task | null>(null);
  const [providerLocation, setProviderLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const locationWatcherRef = useRef<any>(null);
  const realtimeSubscriptionRef = useRef<any>(null);
  const requestSubscriptionRef = useRef<any>(null);
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {},
    onPanResponderMove: () => {},
    onPanResponderRelease: () => {},
  })).current;
  // Track online time
  const [onlineElapsed, setOnlineElapsed] = useState('0h 0m');

  // Layout constants to ensure summary stays visible above bottom nav
  const windowHeight = Dimensions.get('window').height;
  const BOTTOM_NAV_HEIGHT = 84; // matches BottomNavigation visual height + safe padding
  const SUMMARY_RATIO = 0.25; // user requested summary should take 25%
  const summaryHeight = Math.round((windowHeight - BOTTOM_NAV_HEIGHT) * SUMMARY_RATIO);
  const mapHeight = windowHeight - BOTTOM_NAV_HEIGHT - summaryHeight;

  // Animation refs for smooth transitions
  const earningsOpacity = useRef(new Animated.Value(1)).current;
  const earningsTranslateY = useRef(new Animated.Value(0)).current;
  const ordersOpacity = useRef(new Animated.Value(1)).current;
  const ordersTranslateY = useRef(new Animated.Value(0)).current;
  const mapOpacity = useRef(new Animated.Value(0)).current;

  // Online mode animations
  const onlineHeaderOpacity = useRef(new Animated.Value(0)).current;
  const onlineHeaderTranslateY = useRef(new Animated.Value(-50)).current;
  const floatingButtonOpacity = useRef(new Animated.Value(0)).current;
  const floatingProfileOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardsOpacity = useRef(new Animated.Value(0)).current;
  const summaryCardsTranslateY = useRef(new Animated.Value(100)).current;

  // Custom pull-to-refresh state
  const scrollY = useRef(new Animated.Value(0)).current;
  const refreshIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const refreshIndicatorScale = useRef(new Animated.Value(0.8)).current;

  // Safely stop any running animations on our Animated.Value refs
  const stopAllAnimations = () => {
    try {
      const refs = [
        earningsOpacity,
        earningsTranslateY,
        ordersOpacity,
        ordersTranslateY,
        mapOpacity,
        onlineHeaderOpacity,
        onlineHeaderTranslateY,
        floatingButtonOpacity,
        floatingProfileOpacity,
        summaryCardsOpacity,
        summaryCardsTranslateY,
        refreshIndicatorOpacity,
        refreshIndicatorScale,
      ];

      refs.forEach((anim) => {
        if (anim && typeof (anim as any).stopAnimation === 'function') {
          try { (anim as any).stopAnimation(); } catch (e) { /* ignore */ }
        }
      });
    } catch (e) {
      // swallow errors to avoid breaking UI flow
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  // Initialize animation values with maximum safety to prevent immutable object errors
  useEffect(() => {
    let initTimer: NodeJS.Timeout;

    const safeSetValue = (animValue: Animated.Value, value: number) => {
      try {
        // Check if object is frozen
        if (Object.isFrozen(animValue)) {
          console.warn('ProviderDashboard Animated.Value is frozen, skipping initialization');
          return false;
        }

        // Check if setValue method exists and is callable
        if (animValue && typeof animValue.setValue === 'function') {
          animValue.setValue(value);
          return true;
        }

        console.warn('ProviderDashboard Animated.Value setValue method not available');
        return false;
      } catch (error) {
        console.warn('Failed to set ProviderDashboard animation value:', error);
        return false;
      }
    };

    // Multiple attempts with increasing delays
    const initializeAnimations = (attempt: number = 1) => {
      try {
        let successCount = 0;

        if (safeSetValue(earningsOpacity, 1)) successCount++;
        if (safeSetValue(earningsTranslateY, 0)) successCount++;
        if (safeSetValue(ordersOpacity, 1)) successCount++;
        if (safeSetValue(ordersTranslateY, 0)) successCount++;
        if (safeSetValue(mapOpacity, 0)) successCount++;

        if (successCount > 0 && attempt === 1) {
          console.log(`Successfully initialized ${successCount}/5 ProviderDashboard animation values`);
        }

        // If not all values were set and we haven't tried too many times, try again
        if (successCount < 5 && attempt < 3) {
          initTimer = setTimeout(() => initializeAnimations(attempt + 1), 150 * attempt);
          return;
        }

        // If we still couldn't initialize most animations, disable them
        if (successCount < 3) {
          console.warn(`Only ${successCount}/5 ProviderDashboard animations initialized successfully, disabling animations`);
          setAnimationsDisabled(true);
        }

      } catch (error) {
        console.error(`ProviderDashboard animation initialization attempt ${attempt} failed:`, error);
        if (attempt < 2) {
          initTimer = setTimeout(() => initializeAnimations(attempt + 1), 200 * attempt);
        }
      }
    };

    // Start initialization with delay
    initTimer = setTimeout(() => initializeAnimations(1), 50);

    return () => {
      if (initTimer) clearTimeout(initTimer);
    };
  }, []); // No dependencies to prevent re-runs

  // Additional safeguard: Safely stop animations when component unmounts
  useEffect(() => {
    return () => {
      try {
        // Stop any ongoing animations when component unmounts
        const safeStopAnimation = (animValue: Animated.Value) => {
          try {
            if (animValue && typeof animValue.stopAnimation === 'function') {
              animValue.stopAnimation();
            }
          } catch (error) {
            // Silently fail during cleanup
          }
        };

        safeStopAnimation(earningsOpacity);
        safeStopAnimation(earningsTranslateY);
        safeStopAnimation(ordersOpacity);
        safeStopAnimation(ordersTranslateY);
        safeStopAnimation(mapOpacity);
      } catch (error) {
        // Silently fail during cleanup
      }
    };
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      console.log('Fetching provider dashboard data...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user');
        return;
      }

      // Fetch provider profile and stats
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Use mock data as fallback
        setMockData();
        return;
      }

      // Set Smart Float data from profile
      setDeclaredFloat(profile.declared_float || 0);
      setIsOnline(profile.is_online || false);

      // Fetch earnings from payments table
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, provider_earnings, created_at, status')
        .eq('provider_id', user.id)
        .eq('status', 'completed');

      // Fetch available orders (shopping tasks only for personal shoppers)
      const { data: orders, error: ordersError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          category,
          budget_min,
          budget_max,
          status,
          created_at,
          customer_id,
          latitude,
          longitude,
          address,
          city,
          province,
          profiles!tasks_customer_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('category', 'shopping')
        .in('status', ['posted', 'bidding'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }

      // Calculate stats from real data
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate suggested float based on recent earnings (now that payments is defined)
      const lastWeekEarnings = payments?.filter(p =>
        new Date(p.created_at) >= weekAgo
      ).reduce((sum, p) => sum + (p.provider_earnings || 0), 0) || 0;

      const suggestedAmount = Math.max(profile.declared_float || 0, lastWeekEarnings * 0.8);
      setSuggestedFloat(suggestedAmount);

      const todayEarnings = payments?.filter(p =>
        new Date(p.created_at) >= today
      ).reduce((sum, p) => sum + (p.provider_earnings || 0), 0) || 0;

      const weeklyEarnings = payments?.filter(p =>
        new Date(p.created_at) >= weekAgo
      ).reduce((sum, p) => sum + (p.provider_earnings || 0), 0) || 0;

      const monthlyEarnings = payments?.filter(p =>
        new Date(p.created_at) >= monthAgo
      ).reduce((sum, p) => sum + (p.provider_earnings || 0), 0) || 0;

      const totalEarnings = payments?.reduce((sum, p) => sum + (p.provider_earnings || 0), 0) || 0;

      const providerStats: ProviderStats = {
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalEarnings: profile.total_earnings || totalEarnings,
        completedTasks: profile.total_reviews || 0,
        activeTasks: orders?.length || 0,
        rating: profile.rating || 0,
        walletBalance: 245.50, // Mock wallet balance for now
      };

      setStats(providerStats);
      setAvailableOrders((orders || []) as Task[]);

      console.log('Provider dashboard data loaded successfully');

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setMockData();
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const setMockData = () => {
    console.log('Using mock data as fallback');
    setStats({
      todayEarnings: 185.00,
      weeklyEarnings: 1245.50,
      monthlyEarnings: 4850.25,
      totalEarnings: 4850.25,
      completedTasks: 127,
      activeTasks: 5,
      rating: 4.8,
      walletBalance: 245.50,
    });

    setAvailableOrders([
      {
        id: 'order_1',
        title: 'Grocery delivery from Checkers',
        description: 'Milk, bread, eggs, vegetables, and cleaning supplies from Checkers Northgate.',
        category: 'shopping',
        budget_min: 180,
        budget_max: 220,
        status: 'posted',
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        customer_id: 'customer_1',
        latitude: -26.2041,
        longitude: 28.0473,
        address: '123 Main St, Sandton',
        city: 'Sandton',
        province: 'Gauteng',
        profiles: {
          full_name: 'Sarah M.',
        },
      },
      {
        id: 'order_2',
        title: 'Pharmacy pickup from Dis-Chem',
        description: 'Medications and health products from Dis-Chem Sandton City.',
        category: 'shopping',
        budget_min: 250,
        budget_max: 300,
        status: 'posted',
        created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        customer_id: 'customer_2',
        latitude: -26.1084,
        longitude: 28.0528,
        address: '456 Oak Ave, Randburg',
        city: 'Randburg',
        province: 'Gauteng',
        profiles: {
          full_name: 'John D.',
        },
      },
      {
        id: 'order_3',
        title: 'Household items from Pick n Pay',
        description: 'Detergent, toilet paper, and household cleaning supplies.',
        category: 'shopping',
        budget_min: 120,
        budget_max: 150,
        status: 'posted',
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        customer_id: 'customer_3',
        latitude: -26.1347,
        longitude: 28.0343,
        address: '789 Pine Rd, Johannesburg',
        city: 'Johannesburg',
        province: 'Gauteng',
        profiles: {
          full_name: 'Lisa K.',
        },
      },
      {
        id: 'order_4',
        title: 'Fresh produce from Woolworths',
        description: 'Organic fruits and vegetables for healthy meal prep.',
        category: 'shopping',
        budget_min: 200,
        budget_max: 250,
        status: 'posted',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        customer_id: 'customer_4',
        latitude: -26.1456,
        longitude: 28.0298,
        address: '321 Elm St, Parktown',
        city: 'Parktown',
        province: 'Gauteng',
        profiles: {
          full_name: 'Mike R.',
        },
      },
      {
        id: 'order_5',
        title: 'Baby supplies from Clicks',
        description: 'Diapers, wipes, and baby care products from Clicks.',
        category: 'shopping',
        budget_min: 300,
        budget_max: 350,
        status: 'posted',
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        customer_id: 'customer_5',
        latitude: -26.1878,
        longitude: 28.0167,
        address: '654 Birch Ln, Rosebank',
        city: 'Rosebank',
        province: 'Gauteng',
        profiles: {
          full_name: 'Anna P.',
        },
      },
    ]);
  };

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData(true);
    } catch (e) {
      console.error('Error refreshing dashboard:', e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate('TaskDetails', { taskId: task.id });
  }, [navigation]);

  const handleAcceptOrder = useCallback(async (order: Task) => {
    try {
      Alert.alert(
        'Accept Order?',
        `Accept this delivery for ${formatCurrencySafe(order.budget_max)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                const { data, error } = await supabase.functions.invoke('accept-request', {
                  body: { requestId: order.id },
                });
                if (error) {
                  console.error('accept-request failed', error);
                  Alert.alert('Could not accept', 'Please try again.');
                  return;
                }
                if (data?.success) {
                  setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
                  try {
                    navigation.navigate('ProviderTrip' as never, {
                      requestId: data?.request?.id,
                      storeLat: data?.request?.store_lat,
                      storeLng: data?.request?.store_lng,
                      dropoffLat: data?.request?.dropoff_lat,
                      dropoffLng: data?.request?.dropoff_lng,
                      title: data?.request?.store_name || 'Shopping Request',
                      description: data?.request?.dropoff_address,
                    } as never);
                  } catch {}
                } else {
                  const reason = data?.reason || 'Already accepted by someone else';
                  Alert.alert('Not Available', reason);
                }
              } catch (e) {
                console.error('accept-request error', e);
                Alert.alert('Error', 'Failed to accept. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  }, []);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }, []);

  const renderOrder = ({ item: order }: { item: Task }) => {
    // Mock current location (Sandton, Johannesburg)
    const currentLat = -26.2041;
    const currentLng = 28.0473;
    const distance = calculateDistance(currentLat, currentLng, order.latitude || -26.2041, order.longitude || 28.0473);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleTaskPress(order)}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderMain}>
            <Text style={styles.orderTitle}>{order.title}</Text>
            <Text style={styles.orderDescription} numberOfLines={2}>
              {order.description}
            </Text>
          </View>
          <View style={styles.orderUrgency}>
            <Text style={styles.urgencyText}>New</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>
              {order.city}, {order.province} • {distance}km away
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.orderEarnings}>
          <View style={styles.earningsInfo}>
            <Text style={styles.earningsLabel}>You'll earn</Text>
            <Text style={styles.earningsAmount}>
              {formatCurrencySafe(order.budget_max)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptOrder(order)}
          >
            <Text style={styles.acceptButtonText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleGoOnline = useCallback(() => {
    if (declaredFloat === 0) {
      setShowFloatModal(true);
    } else {
      // If they already have a declared float, just go online
      handleGoOnlineConfirm(declaredFloat);
    }
  }, [declaredFloat]);

  // Smooth content transition when going online
  const handleGoOnlineTransition = useCallback(() => {
    try {
      // Prevent multiple simultaneous transitions
      if (isOnline) return;

      // If animations are disabled, just update state directly
      if (animationsDisabled) {
        setShowMap(true);
        setIsOnline(true);
        return;
      }

      // Stop any running animations to avoid JS/native conflicts, then slide out sections
      stopAllAnimations();

      Animated.parallel([
        // Earnings section slides up and fades
        Animated.parallel([
          Animated.timing(earningsOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false, // Use JS driver for opacity
          }),
          Animated.timing(earningsTranslateY, {
            toValue: -100,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
        // Orders section slides down and fades
        Animated.parallel([
          Animated.timing(ordersOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false, // Use JS driver for opacity
          }),
          Animated.timing(ordersTranslateY, {
            toValue: 200,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
      ]).start(() => {
        try {
          // Show map after content has slid out
          setShowMap(true);
          setIsOnline(true);

          Animated.timing(mapOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false, // Use JS driver for opacity
          }).start(() => {
            // Show job notification after map appears
            setTimeout(() => {
              if (availableOrders.length > 0 && availableOrders[0]) {
                setCurrentNotificationOrder(availableOrders[0]);
                setShowJobNotification(true);
              }
            }, 1000);
          });
        } catch (error) {
          console.error('Error in transition callback:', error);
          // Ensure state is consistent even if animation fails
          setShowMap(true);
          setIsOnline(true);
        }
      });
    } catch (error) {
      console.error('Error in handleGoOnlineTransition:', error);
      // Fallback - just set the state without animation
      setShowMap(true);
      setIsOnline(true);
    }
  }, [isOnline, earningsOpacity, earningsTranslateY, ordersOpacity, ordersTranslateY, mapOpacity, availableOrders]);

  const handleGoOnlineConfirm = useCallback(async (floatAmount: number) => {
    try {
      setFloatLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // 1) Persist declared float to profile (optional, existing behavior)
      try {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            declared_float: floatAmount,
            float_last_updated: new Date().toISOString(),
          })
          .eq('id', user.id);
        if (profErr) console.warn('Non-fatal: profile float update failed', profErr);
      } catch (_) {}

      // 2) Upsert provider online presence to provider_status for realtime + notify
      try {
        // Try to grab a current location once when going online (best effort)
        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = pos.coords.latitude; lng = pos.coords.longitude;
            setProviderLocation({ latitude: lat, longitude: lng });
          }
        } catch (e) {
          console.warn('Best-effort geolocation failed on go-online', e);
        }

        const { error: statusErr } = await supabase
          .from('provider_status')
          .upsert({
            user_id: user.id,
            online: true,
            lat: typeof lat === 'number' ? lat : null,
            lng: typeof lng === 'number' ? lng : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        if (statusErr) {
          console.error('Error upserting provider_status:', statusErr);
          Alert.alert('Error', 'Failed to go online. Please try again.');
          return;
        } else {
          console.log('[presence] provider_status upserted online=true');
        }
        // Immediately reflect online state to avoid races in realtime handler
        setIsOnline(true);
        onlineRef.current = true;
      } catch (e) {
        console.error('provider_status upsert error', e);
        Alert.alert('Error', 'Failed to go online. Please try again.');
        return;
      }

      setDeclaredFloat(floatAmount);
      setShowFloatModal(false);

      // Start the smooth transition
      handleGoOnlineTransition();

      // Proactively fetch any recent pending requests and surface a popup
      try {
        const { data: pending } = await supabase
          .from('shopping_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);
        if (pending && pending.length > 0) {
          const plat = providerLocation?.latitude;
          const plng = providerLocation?.longitude;
          let chosen: any = pending[0];
          if (
            typeof plat === 'number' && typeof plng === 'number'
          ) {
            // prefer closest request that has coordinates
            const withDist = pending
              .filter((r: any) => typeof r.dropoff_lat === 'number' && typeof r.dropoff_lng === 'number')
              .map((r: any) => {
                const toRad = (d: number) => d * Math.PI / 180;
                const R = 6371;
                const dLat = toRad(r.dropoff_lat - plat);
                const dLng = toRad(r.dropoff_lng - plng);
                const a = Math.sin(dLat/2)**2 + Math.cos(toRad(plat)) * Math.cos(toRad(r.dropoff_lat)) * Math.sin(dLng/2)**2;
                const distKm = 2 * R * Math.asin(Math.sqrt(a));
                return { r, distKm };
              })
              .sort((a: any, b: any) => a.distKm - b.distKm);
            if (withDist.length > 0) {
              chosen = withDist[0].r;
            }
          }
          const orderLike: any = {
            id: chosen.id,
            title: chosen.store_name || 'Shopping Request',
            description: chosen.dropoff_address || 'Pickup and delivery',
            budget_max: chosen.subtotal_fees || 0,
            city: '',
            province: '',
            latitude: chosen.dropoff_lat,
            longitude: chosen.dropoff_lng,
            created_at: chosen.created_at,
          };
          setCurrentNotificationOrder(orderLike);
          setShowJobNotification(true);
          console.log('Popup surfaced from recent pending requests');
        }
      } catch (e) {
        console.warn('Pending request preload failed', e);
      }

    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert('Error', 'Failed to go online. Please try again.');
    } finally {
      setFloatLoading(false);
    }
  }, [handleGoOnlineTransition]);

  const handleGoOffline = useCallback(async () => {
    try {
      if (!isOnline) return;

      // Update database user status to offline (best-effort)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Best-effort set offline in provider_status
          await supabase
            .from('provider_status')
            .upsert({ user_id: user.id, online: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          console.log('[presence] provider_status upserted online=false');
        }
      } catch (e) {
        // non-fatal
      }

      // Update UI state
      setShowMap(false);
      setShowJobNotification(false);
      setIsOnline(false);
    } catch (error) {
      console.error('Error in handleGoOffline:', error);
      // Fallback - just set the state without animation
      setShowMap(false);
      setShowJobNotification(false);
      setIsOnline(false);
    }
  }, [isOnline]);

  // Online mode animation
  const animateOnlineMode = useCallback((show: boolean) => {
    const toValue = show ? 1 : 0;
    const translateValue = show ? 0 : show ? -50 : 100;

    Animated.parallel([
      Animated.timing(onlineHeaderOpacity, {
        toValue,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(onlineHeaderTranslateY, {
        toValue: show ? 0 : -50,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(floatingButtonOpacity, {
        toValue,
        duration: 400,
        delay: 200,
        useNativeDriver: false,
      }),
      Animated.timing(floatingProfileOpacity, {
        toValue,
        duration: 400,
        delay: 300,
        useNativeDriver: false,
      }),
      Animated.timing(summaryCardsOpacity, {
        toValue,
        duration: 500,
        delay: 400,
        useNativeDriver: false,
      }),
      Animated.timing(summaryCardsTranslateY, {
        toValue: show ? 0 : 100,
        duration: 500,
        delay: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, [onlineHeaderOpacity, onlineHeaderTranslateY, floatingButtonOpacity, floatingProfileOpacity, summaryCardsOpacity, summaryCardsTranslateY]);

  // Function to update provider location (real GPS)
  const updateProviderLocation = useCallback(async (continuous = false) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const locationData = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      };

      // Update local state immediately for UI responsiveness
      setProviderLocation(locationData);

      // Update location in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: statusErr } = await supabase
          .from('provider_status')
          .upsert({
            user_id: user.id,
            online: true,
            lat: locationData.latitude,
            lng: locationData.longitude,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (statusErr) {
          console.error('Error updating provider_status location:', statusErr);
        } else {
          console.log(`provider_status updated${continuous ? ' (continuous)' : ''}:`, locationData);
        }
      }

      console.log('Provider location (GPS) updated:', locationData);
    } catch (e) {
      console.warn('Failed to get current location:', e);
    }
  }, []);

  // Start continuous location tracking while online
  const startRealtimeLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted for realtime tracking');
        return;
      }

      // Stop any existing watcher
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }

      // Start location watcher with frequent updates
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50, // Update every 50 meters
          timeInterval: 30000, // Or every 30 seconds (whichever comes first)
        },
        async (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };

          // Update local state
          setProviderLocation(locationData);

          // Update database in real-time
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Update provider_status for realtime/notify
            const { error: statusErr } = await supabase
              .from('provider_status')
              .upsert({
                user_id: user.id,
                online: true,
                lat: locationData.latitude,
                lng: locationData.longitude,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });

            if (statusErr) {
              console.error('Error updating provider_status realtime location:', statusErr);
            } else {
              console.log('Realtime provider_status updated:', locationData);
            }
          }
        }
      );

      console.log('Realtime location tracking started');
    } catch (e) {
      console.warn('Failed to start realtime location tracking:', e);
    }
  }, []);

  // Stop realtime location tracking
  const stopRealtimeLocationTracking = useCallback(() => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
      console.log('Realtime location tracking stopped');
    }
  }, []);

  // Subscribe to own provider_status row for realtime presence updates
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const channel = supabase
          .channel('provider_status_self')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'provider_status',
            filter: `user_id=eq.${user.id}`,
          }, (payload: any) => {
            const row = payload?.new || payload?.record || payload?.old;
            if (row && typeof row.online === 'boolean') {
              setIsOnline(row.online);
            }
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'shopping_requests',
          }, (payload: any) => {
            try {
              console.log('[realtime] new shopping_request insert received');
              const req = payload?.new;
              if (!req) return;
              if (req.confirmed !== true) {
                console.log('[realtime] request not confirmed; ignoring');
                return;
              }
              // Only pop while online (use ref to avoid stale closure)
              if (!onlineRef.current) { console.log('[realtime] isOnline=false (ref); skipping'); return; }
              // Basic proximity filter if we have a provider location
              const plat = providerLocation?.latitude;
              const plng = providerLocation?.longitude;
              if (typeof plat === 'number' && typeof plng === 'number' && typeof req.dropoff_lat === 'number' && typeof req.dropoff_lng === 'number') {
                const toRad = (d: number) => d * Math.PI / 180;
                const R = 6371;
                const dLat = toRad(req.dropoff_lat - plat);
                const dLng = toRad(req.dropoff_lng - plng);
                const a = Math.sin(dLat/2)**2 + Math.cos(toRad(plat)) * Math.cos(toRad(req.dropoff_lat)) * Math.sin(dLng/2)**2;
                const distKm = 2 * R * Math.asin(Math.sqrt(a));
                console.log('[realtime] distanceKm', Math.round(distKm * 10) / 10);
                // Do not early return during debug; still show popup even if out of radius
              }
              // Map to Task-like shape used by JobNotification
              const orderLike: any = {
                id: req.id,
                title: req.store_name || 'Shopping Request',
                description: req.dropoff_address || 'Pickup and delivery',
                budget_max: req.subtotal_fees || 0,
                city: '',
                province: '',
                latitude: req.dropoff_lat,
                longitude: req.dropoff_lng,
                store_lat: req.store_lat,
                store_lng: req.store_lng,
                service_fee: (req as any)?.service_fee ?? 0,
                tip: (req as any)?.tip ?? 0,
                created_at: req.created_at,
              };
              // Shopper income = commitment fee + pick & pack fee + tips
              // commitment fee = subtotal_fees - service_fee - pick_pack_fee
              const subtotal = (req as any)?.subtotal_fees || 0;
              const serviceFee = (req as any)?.service_fee || 0;
              const pickPack = (req as any)?.pick_pack_fee || 0;
              const tips = (req as any)?.tip || 0;
              const commitment = Math.max(0, subtotal - serviceFee - pickPack);
              (orderLike as any).net = Math.max(0, commitment + pickPack + tips);
              setCurrentNotificationOrder(orderLike);
              setShowJobNotification(true);
              // Subscribe to updates for this request to auto-dismiss when accepted/cancelled
              try { requestSubscriptionRef.current?.unsubscribe?.(); } catch {}
              try {
                const reqCh = supabase
                  .channel(`req_${orderLike.id}`)
                  .on('postgres_changes', {
                    event: '*', schema: 'public', table: 'shopping_requests', filter: `id=eq.${orderLike.id}`
                  }, (pl: any) => {
                    const r = pl?.new || pl?.record;
                    if (r && r.status && r.status !== 'pending') {
                      setShowJobNotification(false);
                      setCurrentNotificationOrder(null);
                      try { reqCh.unsubscribe(); } catch {}
                    }
                  })
                  .subscribe();
                requestSubscriptionRef.current = reqCh;
              } catch {}
              console.log('[popup] set visible for request', orderLike.id);
            } catch (e) {
              console.warn('Failed to handle new request payload', e);
            }
          })
          .subscribe();
        realtimeSubscriptionRef.current = channel;
        console.log('[realtime] subscribed to provider_status + shopping_requests');
      } catch (e) {
        console.warn('provider_status subscription failed', e);
      }
    })();
  }, [isOnline, providerLocation?.latitude, providerLocation?.longitude]);

  // Trigger online mode animation when going online
  useEffect(() => {
    if (isOnline) {
      animateOnlineMode(true);
      // Update location when going online
      updateProviderLocation();
      // Start realtime location tracking
      startRealtimeLocationTracking();
      // Start online timer (updates every minute)
      const start = new Date();
      setOnlineElapsed('0h 0m');
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setOnlineElapsed(`${hours}h ${minutes}m`);
      }, 60000);
      return () => clearInterval(interval);
    } else {
      // Stop realtime location tracking when going offline
      stopRealtimeLocationTracking();
    }
  }, [isOnline, animateOnlineMode, updateProviderLocation, startRealtimeLocationTracking, stopRealtimeLocationTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationWatcherRef.current) {
        try { locationWatcherRef.current.remove(); } catch {}
        locationWatcherRef.current = null;
      }
      if (realtimeSubscriptionRef.current) {
        try { realtimeSubscriptionRef.current.unsubscribe(); } catch {}
        realtimeSubscriptionRef.current = null;
      }
    };
  }, []);

  const handleAcceptNotificationOrder = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('accept-request', {
        body: { requestId: orderId },
      });
      if (error) {
        console.error('accept-request failed', error);
        Alert.alert('Could not accept', 'Please try again.');
        return;
      }
      if (data?.success) {
        setShowJobNotification(false);
        setCurrentNotificationOrder(null);
        setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
        try {
          navigation.navigate('ProviderTrip' as never, {
            requestId: data?.request?.id,
            storeLat: data?.request?.store_lat,
            storeLng: data?.request?.store_lng,
            dropoffLat: data?.request?.dropoff_lat,
            dropoffLng: data?.request?.dropoff_lng,
            title: data?.request?.store_name || 'Shopping Request',
            description: data?.request?.dropoff_address,
          } as never);
        } catch {}
      } else {
        const reason = data?.reason || 'Already accepted by someone else';
        Alert.alert('Not Available', reason);
      }
    } catch (e) {
      console.error('accept-request error', e);
      Alert.alert('Error', 'Failed to accept. Please try again.');
    }
  }, []);

  const handleDismissNotification = useCallback(() => {
    setShowJobNotification(false);
    setCurrentNotificationOrder(null);
    try { requestSubscriptionRef.current?.unsubscribe?.(); } catch {}
  }, []);

  const handleAcceptTask = useCallback((task: Task) => {
    Alert.alert(
      'Accept Task?',
      `Accept this task for ${formatCurrencySafe(task.budget_max)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            Alert.alert('Task Accepted!', 'Navigate to complete the task.');
          }
        }
      ]
    );
  }, []);

  const handleTabPress = useCallback((tabName: string) => {
    setActiveTab(tabName);

    // Handle navigation for specific tabs
    switch (tabName) {
      case 'profile':
        navigation.navigate('Profile');
        break;
      case 'jobs':
        navigation.navigate('JobFeed' as never);
        break;
      case 'earnings':
        navigation.navigate('Wallet');
        break;
      case 'home':
        // Stay on current screen
        break;
      case 'map-test':
        // Handle map test if needed
        break;
      default:
        break;
    }
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
          <Text style={styles.errorText}>Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboardData(false)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Full screen map background when offline */}
      {!isOnline && false && (
        <View style={styles.mapBackground}>
          {/* Temporarily disabled native maps for Expo Go compatibility */}
          {/*
          <MapView
            style={styles.backgroundMap}
            region={{
              latitude: -26.2041,
              longitude: 28.0473,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            zoomEnabled={false}
            scrollEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: -26.2041,
                longitude: 28.0473,
              }}
              title="Your Location"
              description="Johannesburg CBD"
              pinColor="#00D4AA"
            />
          </MapView>
          */}
          <View style={styles.mapOverlay} />
        </View>
      )}
      {/* Main gradient background */}
      <LinearGradient
        colors={isOnline ? [Colors.white, Colors.gray[200]] : ["rgba(255,255,255,0.95)", "rgba(248,250,252,0.95)"]}
        style={styles.gradient}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {isOnline ? (
        /* Online Mode Layout */
        <View style={styles.onlineContainer}>
          {/* Map Container - 3/4 of screen */}
          <View style={styles.mapContainer}>
            {/* Simplified: use LiveMap with stores and provider location */}
            <LiveMap
              visible={true}
              showStores={false}
              providerLocation={providerLocation ? providerLocation : { latitude: 0, longitude: 0 }}
              onLocationPress={() => Alert.alert('Location', 'Please enable location services to see nearby stores.')}
              onStoreSelect={(store) => {
                Alert.alert(
                  'Store Selected',
                  `Create a pickup from ${store.name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Create Order', onPress: () => console.log('Creating order from store:', store) }
                  ]
                );
              }}
            />
            {/* Simplified: floating header removed */}
            {/* Floating Action Button */}
            <Animated.View
              style={[
                styles.floatingActionButton,
                {
                  opacity: floatingButtonOpacity,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.goOfflineButton}
                onPress={handleGoOffline}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A24']}
                  style={styles.goOfflineGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="power" size={20} color="#FFFFFF" />
                  <Text style={styles.goOfflineButtonText}>Go Offline</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Simplified: floating profile button removed */}

            {/* Bottom Summary Overlay (shorter card with rounded corners) */}
            <View style={[styles.summaryOverlay, { bottom: 0, paddingBottom: BOTTOM_NAV_HEIGHT }]}>
              <View style={styles.earningsSummaryContent}>
                <Text style={styles.earningsSummaryTitle}>Today</Text>

                <View style={styles.earningsGrid}>
                  <View style={styles.earningsItem}>
                    <View style={styles.earningsIconContainer}>
                      <Ionicons name="cash" size={28} color="#00D4AA" />
                    </View>
                    <View style={styles.earningsTextContainer}>
                      <Text style={styles.earningsLabel}>Float</Text>
                      <Text style={styles.earningsValue}>
                        {formatCurrencySafe(declaredFloat)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.earningsItem}>
                    <View style={styles.earningsIconContainer}>
                      <Ionicons name="trending-up" size={28} color="#667EEA" />
                    </View>
                    <View style={styles.earningsTextContainer}>
                      <Text style={styles.earningsLabel}>Earnings</Text>
                      <Text style={styles.earningsValue}>
                        {formatCurrencySafe(stats?.todayEarnings ?? 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.earningsItem}>
                    <View style={styles.earningsIconContainer}>
                      <Ionicons name="time-outline" size={28} color="#F5576C" />
                    </View>
                    <View style={styles.earningsTextContainer}>
                      <Text style={styles.earningsLabel}>Online</Text>
                      <Text style={styles.earningsValue}>{onlineElapsed}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          {...panResponder.panHandlers}
        >
          {/* Custom Refresh Indicator */}
          <Animated.View
            style={[
              styles.refreshIndicator,
              {
                opacity: refreshIndicatorOpacity,
                transform: [{ scale: refreshIndicatorScale }],
              },
            ]}
          >
            <ActivityIndicator size="small" color="#00D4AA" />
            <Text style={styles.refreshText}>Pull to refresh</Text>
          </Animated.View>

          {/* Loading indicator when refreshing */}
          {refreshing && (
            <View style={styles.refreshingIndicator}>
              <ActivityIndicator size="small" color="#00D4AA" />
              <Text style={styles.refreshingText}>Refreshing...</Text>
            </View>
          )}
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.welcomeText}>
                  {new Date().getHours() < 12 ? 'Good morning' :
                   new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}!
                </Text>
                <Text style={styles.headerTitle}>Ready to earn today?</Text>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="person" size={24} color="#333333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Central Action Button */}
          <View style={[
            styles.centralButtonSection,
            !isOnline && styles.centralButtonSectionOffline
          ]}>
            <SmoothTransitionButton
              isOnline={isOnline}
              isLoading={floatLoading}
              declaredFloat={declaredFloat}
              onPress={handleGoOnlineTransition}
              onGoOffline={handleGoOffline}
            />
          </View>

          {/* Live Earnings Dashboard */}
          <Animated.View
            style={[
              styles.earningsDashboard,
              !isOnline && styles.earningsDashboardOffline,
              {
                opacity: earningsOpacity,
                transform: [{ translateY: earningsTranslateY }],
              },
            ]}
          >
            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <Ionicons name="cash" size={24} color="#00D4AA" />
                <Text style={styles.earningsTitle}>Today's Earnings</Text>
              </View>
              <Text style={styles.earningsAmount}>
                {formatCurrencySafe(stats?.todayEarnings ?? 0)}
              </Text>
              <View style={styles.earningsMeta}>
                <Text style={styles.metaItem}>
                  {(stats?.completedTasks ?? 0)} deliveries
                </Text>
                <Text style={styles.metaSeparator}>•</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{(stats?.rating ?? 0).toFixed(1)}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* New Orders Feed */}
          <Animated.View
            style={[
              styles.ordersSection,
              !isOnline && styles.ordersSectionOffline,
              {
                opacity: ordersOpacity,
                transform: [{ translateY: ordersTranslateY }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                New Orders ({availableOrders.length})
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('JobFeed' as never)}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {availableOrders.length > 0 ? (
              <FlatList
                data={availableOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.ordersList}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyOrders}>
                <View style={styles.emptyOrdersIcon}>
                  <Ionicons name="receipt" size={48} color="#CCCCCC" />
                </View>
                <Text style={styles.emptyOrdersTitle}>No new orders</Text>
                <Text style={styles.emptyOrdersText}>
                  New orders will appear here when customers need deliveries
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}

      {/* Smart Float Modal */}
      <SmartFloatModal
        visible={showFloatModal}
        onClose={() => setShowFloatModal(false)}
        onConfirm={handleGoOnlineConfirm}
        currentFloat={declaredFloat}
        suggestedFloat={suggestedFloat}
        loading={floatLoading}
      />

      {/* Job Notification */} 
       <JobNotification
         visible={showJobNotification}
         order={{
           id: currentNotificationOrder?.id || '',
           title: currentNotificationOrder?.title || '',
           description: currentNotificationOrder?.description || '',
           budget_max: currentNotificationOrder?.budget_max || 0,
           city: (currentNotificationOrder as any)?.city || '',
           distance: (providerLocation && (currentNotificationOrder as any))
             ? calculateDistance(
                 providerLocation.latitude,
                 providerLocation.longitude,
                 ((currentNotificationOrder as any)?.store_lat ?? (currentNotificationOrder as any)?.latitude) || providerLocation.latitude,
                 ((currentNotificationOrder as any)?.store_lng ?? (currentNotificationOrder as any)?.longitude) || providerLocation.longitude
               )
             : 0,
           dropoffLat: (currentNotificationOrder as any)?.latitude,
           dropoffLng: (currentNotificationOrder as any)?.longitude,
           storeLat: (currentNotificationOrder as any)?.store_lat,
           storeLng: (currentNotificationOrder as any)?.store_lng,
          net: (currentNotificationOrder as any)?.net ?? Math.max(0, (((currentNotificationOrder as any)?.budget_max || 0) - (((currentNotificationOrder as any)?.service_fee) || 0)) + (((currentNotificationOrder as any)?.tip) || 0)),
         }}
         providerLat={providerLocation?.latitude}
         providerLng={providerLocation?.longitude}
         onAccept={handleAcceptNotificationOrder}
         onDismiss={handleDismissNotification}
       />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} userType="provider" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

export default ProviderDashboard;
