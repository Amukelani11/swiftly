import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Colors } from '../../styles/theme';

type OrderTrackingNavigationProp = StackNavigationProp<RootStackParamList, 'OrderTracking'>;

interface Props {
  navigation: OrderTrackingNavigationProp;
  route: {
    params: {
      orderId: string;
      order?: any; // For new orders
    };
  };
}

const { width } = Dimensions.get('window');

interface StatusStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
}

interface Provider {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  completedTasks: number;
  vehicle?: string;
  phone: string;
}

const OrderTracking: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;

  // Mock data - in real app this would come from API
  const [provider, setProvider] = useState<Provider | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'in_progress' | 'price_confirmed' | 'completed'>('pending');
  const [estimatedArrival, setEstimatedArrival] = useState<string>('15-20 min');
  const [currentLocation, setCurrentLocation] = useState('2.3km away');

  // Status timeline
  const [statusSteps] = useState<StatusStep[]>([
    {
      id: 'posted',
      title: 'Task Posted',
      description: 'Your task has been posted and is visible to providers',
      completed: true,
      current: false,
    },
    {
      id: 'accepted',
      title: 'Provider Accepted',
      description: 'A provider has accepted your task and is on the way',
      completed: status !== 'pending',
      current: status === 'accepted',
    },
    {
      id: 'arrived',
      title: 'Provider Arrived',
      description: 'Your provider has arrived at the location',
      completed: ['in_progress', 'price_confirmed', 'completed'].includes(status),
      current: status === 'in_progress',
    },
    {
      id: 'price_confirmed',
      title: 'Price Confirmed',
      description: 'Final price has been confirmed and approved',
      completed: ['price_confirmed', 'completed'].includes(status),
      current: status === 'price_confirmed',
    },
    {
      id: 'completed',
      title: 'Task Completed',
      description: 'Your task has been completed successfully',
      completed: status === 'completed',
      current: false,
    },
  ]);

  // Mock provider data
  useEffect(() => {
    if (status !== 'pending') {
      setProvider({
        id: 'provider_1',
        name: 'John Smith',
        avatar: '👨‍🔧',
        rating: 4.8,
        completedTasks: 127,
        vehicle: 'Honda Activa',
        phone: '+27 82 123 4567',
      });
    }
  }, [status]);

  // Mock status progression
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'pending') {
        setStatus('accepted');
      } else if (status === 'accepted') {
        setStatus('in_progress');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [status]);

  const handleCallProvider = useCallback(() => {
    Alert.alert(
      'Call Provider',
      `Call ${provider?.name} at ${provider?.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Alert.alert('Calling...', 'Phone dialer would open here') },
      ]
    );
  }, [provider]);

  const handleChatProvider = useCallback(() => {
    Alert.alert('Chat', 'In-app chat would open here');
  }, []);

  const handleCancelTask = useCallback(() => {
    Alert.alert(
      'Cancel Task',
      'Are you sure you want to cancel this task? Your commute fee will be refunded.',
      [
        { text: 'Keep Task', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Task Cancelled', 'Your refund will be processed within 24 hours.');
            navigation.goBack();
          }
        },
      ]
    );
  }, [navigation]);

  const handleApprovePrice = useCallback(() => {
    Alert.alert(
      'Approve Price',
      'Confirm the final price of R285?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setStatus('price_confirmed');
            Alert.alert('Price Approved', 'Your provider will complete the task now.');
          }
        },
      ]
    );
  }, []);

  const handleCompleteTask = useCallback(() => {
    Alert.alert(
      'Complete Task',
      'Has your task been completed to your satisfaction?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: () => {
            setStatus('completed');
            Alert.alert('Task Completed', 'Please rate your provider and leave a tip.');
          }
        },
      ]
    );
  }, []);

  const renderStatusStep = ({ item }: { item: StatusStep }) => (
    <View style={styles.statusStep}>
      <View style={styles.statusConnector}>
        <View
          style={[
            styles.statusDot,
            item.completed && styles.statusDotCompleted,
            item.current && styles.statusDotCurrent,
          ]}
        />
        {!item.completed && <View style={styles.statusLine} />}
      </View>

      <View style={styles.statusContent}>
        <Text
          style={[
            styles.statusTitle,
            item.completed && styles.statusTitleCompleted,
            item.current && styles.statusTitleCurrent,
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.statusDescription,
            item.completed && styles.statusDescriptionCompleted,
          ]}
        >
          {item.description}
        </Text>
        {item.timestamp && (
          <Text style={styles.statusTimestamp}>{item.timestamp}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order Tracking</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Provider Card */}
        {provider && (
          <View style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <Text style={styles.providerAvatar}>{provider.avatar}</Text>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <View style={styles.providerRating}>
                  <Text style={styles.ratingText}>⭐ {provider.rating}</Text>
                  <Text style={styles.taskCount}>({provider.completedTasks} tasks)</Text>
                </View>
                {provider.vehicle && (
                  <Text style={styles.vehicleText}>🚗 {provider.vehicle}</Text>
                )}
              </View>
            </View>

            <View style={styles.providerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCallProvider}
              >
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleChatProvider}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCancelTask}
              >
                <Text style={styles.actionIcon}>❌</Text>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Order Status</Text>

          <FlatList
            data={statusSteps}
            renderItem={renderStatusStep}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>

        {/* Live Location & ETA */}
        {provider && status === 'accepted' && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>Live Location</Text>
                <Text style={styles.locationDistance}>{currentLocation}</Text>
              </View>
            </View>

            <View style={styles.etaContainer}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>{estimatedArrival}</Text>
            </View>

            {/* Mini Map Placeholder */}
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️ Map View</Text>
              <Text style={styles.mapPlaceholderSubtext}>Live tracking would show here</Text>
            </View>
          </View>
        )}

        {/* Price Confirmation */}
        {status === 'in_progress' && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Price Confirmation</Text>
            <Text style={styles.priceMessage}>
              Your provider has found your items and confirmed the final price.
            </Text>

            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Items total</Text>
                <Text style={styles.priceValue}>R285.00</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service fee</Text>
                <Text style={styles.priceValue}>R42.75</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>R327.75</Text>
              </View>
            </View>

            <View style={styles.priceActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => Alert.alert('Price Rejected', 'Please contact support if you disagree with this price.')}
              >
                <Text style={styles.rejectButtonText}>Reject Price</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleApprovePrice}
              >
                <Text style={styles.approveButtonText}>Approve & Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Completion Actions */}
        {status === 'price_confirmed' && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Ready for Completion</Text>
            <Text style={styles.completionMessage}>
              Your provider has completed the task. Please review and confirm.
            </Text>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteTask}
            >
              <Text style={styles.completeButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Task Completed */}
        {status === 'completed' && (
          <View style={styles.completedCard}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedTitle}>Task Completed!</Text>
            <Text style={styles.completedMessage}>
              Thank you for using Swiftly. Please rate your provider.
            </Text>

            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => Alert.alert('Rating', 'Rating screen would open here')}
            >
              <Text style={styles.rateButtonText}>Rate Provider</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: 'bold',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  providerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  providerAvatar: {
    fontSize: 48,
    marginRight: Spacing.md,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.secondary,
    marginRight: Spacing.sm,
  },
  taskCount: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  vehicleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  providerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  actionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
  },
  statusSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  statusStep: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  statusConnector: {
    width: 40,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border.light,
    borderWidth: 2,
    borderColor: Colors.border.light,
    marginBottom: Spacing.sm,
  },
  statusDotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  statusDotCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusLine: {
    width: 2,
    height: 40,
    backgroundColor: Colors.border.light,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  statusTitleCompleted: {
    color: Colors.success,
  },
  statusTitleCurrent: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  statusDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  statusDescriptionCompleted: {
    color: Colors.text.primary,
  },
  statusTimestamp: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  locationDistance: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  etaContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  etaLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  etaTime: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.primary,
  },
  mapPlaceholder: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  mapPlaceholderSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  priceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  priceTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  priceMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.md,
  },
  priceBreakdown: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  priceLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  priceValue: {
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
  priceActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  approveButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  completionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  completionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  completionMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.md,
  },
  completeButton: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.white,
  },
  completedCard: {
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  completedIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  completedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  completedMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.md,
  },
  rateButton: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  rateButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.white,
  },
});

export default OrderTracking;





