import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Colors } from '../../styles/theme';

const Typography = {
  fontFamily: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    bold: 'Poppins-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
  lineHeight: {
    normal: 1.5,
    relaxed: 1.7,
  },
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
};

const BorderRadius = {
  md: 8,
  lg: 12,
};

const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};

type JobFeedNavigationProp = StackNavigationProp<RootStackParamList, 'ProviderDashboard'>;

interface Props {
  navigation: JobFeedNavigationProp;
}

const { width } = Dimensions.get('window');

interface Job {
  id: string;
  type: 'shopping' | 'task';
  title: string;
  description: string;
  location: string;
  distance: number;
  customerRating: number;
  customerName: string;
  createdAt: string;
  urgency: 'normal' | 'urgent' | 'flexible';
  budget?: string;
  items?: string[];
  category?: string;
  commuteFee: number;
  estimatedEarnings: number;
}

const JobFeed: React.FC<Props> = ({ navigation }) => {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 'job_1',
      type: 'shopping',
      title: 'Weekly groceries delivery',
      description: 'Need someone to pick up groceries from Checkers and deliver to my home. Items include milk, bread, vegetables, and cleaning supplies.',
      location: 'Sandton, Johannesburg',
      distance: 2.3,
      customerRating: 4.8,
      customerName: 'Sarah M.',
      createdAt: '5 minutes ago',
      urgency: 'normal',
      items: ['Milk', 'Bread', 'Vegetables', 'Cleaning supplies'],
      commuteFee: 40,
      estimatedEarnings: 185,
    },
    {
      id: 'job_2',
      type: 'task',
      title: 'Handyman service needed',
      description: 'Fix leaking faucet in kitchen and install new light fixture in living room. Have all necessary parts ready.',
      location: 'Rosebank, Johannesburg',
      distance: 3.1,
      customerRating: 4.6,
      customerName: 'Mike R.',
      createdAt: '12 minutes ago',
      urgency: 'urgent',
      category: 'handyman',
      budget: 'R300-R500',
      commuteFee: 40,
      estimatedEarnings: 320,
    },
    {
      id: 'job_3',
      type: 'shopping',
      title: 'Electronics pickup',
      description: 'Pick up laptop from Takealot and deliver to office. Need to handle with care.',
      location: 'Midrand, Johannesburg',
      distance: 4.7,
      customerRating: 4.9,
      customerName: 'Lisa K.',
      createdAt: '18 minutes ago',
      urgency: 'normal',
      items: ['Laptop', 'Accessories'],
      commuteFee: 40,
      estimatedEarnings: 125,
    },
    {
      id: 'job_4',
      type: 'task',
      title: 'House cleaning',
      description: 'Deep clean 3-bedroom apartment. Includes kitchen, bathrooms, and living areas. Supplies provided.',
      location: 'Parktown, Johannesburg',
      distance: 5.2,
      customerRating: 4.7,
      customerName: 'David L.',
      createdAt: '25 minutes ago',
      urgency: 'flexible',
      category: 'cleaning',
      budget: 'R250-R400',
      commuteFee: 40,
      estimatedEarnings: 275,
    },
  ]);

  const [filters, setFilters] = useState({
    type: 'all', // all, shopping, task
    distance: 10,
    urgency: 'all',
  });

  const handleAcceptJob = useCallback((job: Job) => {
    Alert.alert(
      'Accept Job?',
      `Accept this ${job.type} job for R${job.commuteFee} commute fee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            Alert.alert(
              'Job Accepted!',
              `R${job.commuteFee} has been credited to your wallet. Head to ${job.location} to start the job.`,
              [
                {
                  text: 'Navigate',
                  onPress: () => Alert.alert('Navigation', 'Maps would open here')
                },
                {
                  text: 'View Details',
                  onPress: () => navigation.navigate('TaskDetails', { taskId: job.id })
                },
              ]
            );

            // Remove job from feed (accepted by this provider)
            setJobs(prev => prev.filter(j => j.id !== job.id));
          }
        },
      ]
    );
  }, [navigation]);

  const handleViewDetails = useCallback((job: Job) => {
    navigation.navigate('TaskDetails', { taskId: job.id });
  }, [navigation]);

  const getUrgencyColor = (urgency: Job['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return Colors.error;
      case 'normal':
        return Colors.warning;
      case 'flexible':
        return Colors.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getUrgencyText = (urgency: Job['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      case 'flexible':
        return 'Flexible';
      default:
        return urgency;
    }
  };

  const renderJobCard = ({ item: job }: { item: Job }) => (
    <View style={styles.jobCard}>
      {/* Header */}
      <View style={styles.jobHeader}>
        <View style={styles.jobTypeContainer}>
          <Text style={styles.jobTypeIcon}>
            {job.type === 'shopping' ? '🛒' : '🔧'}
          </Text>
          <Text style={styles.jobType}>
            {job.type === 'shopping' ? 'Shopping' : 'Task'}
          </Text>
        </View>

        <View style={styles.jobUrgency}>
          <Text
            style={[
              styles.urgencyText,
              { backgroundColor: getUrgencyColor(job.urgency) + '20', color: getUrgencyColor(job.urgency) }
            ]}
          >
            {getUrgencyText(job.urgency)}
          </Text>
        </View>
      </View>

      {/* Title and Customer */}
      <View style={styles.jobTitleRow}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {job.title}
        </Text>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{job.customerName}</Text>
          <View style={styles.customerRating}>
            <Text style={styles.ratingText}>⭐ {job.customerRating}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.jobDescription} numberOfLines={3}>
        {job.description}
      </Text>

      {/* Items (for shopping) */}
      {job.items && job.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsLabel}>Items:</Text>
          <Text style={styles.itemsText}>
            {job.items.slice(0, 3).join(', ')}
            {job.items.length > 3 && ` +${job.items.length - 3} more`}
          </Text>
        </View>
      )}

      {/* Category (for tasks) */}
      {job.category && (
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{job.category}</Text>
        </View>
      )}

      {/* Location and Distance */}
      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText}>{job.location}</Text>
        <Text style={styles.distanceText}>({job.distance}km away)</Text>
      </View>

      {/* Budget (if specified) */}
      {job.budget && (
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget:</Text>
          <Text style={styles.budgetText}>{job.budget}</Text>
        </View>
      )}

      {/* Time Posted */}
      <Text style={styles.timeText}>{job.createdAt}</Text>

      {/* Earnings Preview */}
      <View style={styles.earningsContainer}>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>Commute Fee</Text>
          <Text style={styles.earningsValue}>R{job.commuteFee}</Text>
        </View>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>Est. Total</Text>
          <Text style={styles.earningsValue}>R{job.estimatedEarnings}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => handleViewDetails(job)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptJob(job)}
        >
          <Text style={styles.acceptButtonText}>Accept Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredJobs = jobs.filter(job => {
    if (filters.type !== 'all' && job.type !== filters.type) return false;
    if (job.distance > filters.distance) return false;
    if (filters.urgency !== 'all' && job.urgency !== filters.urgency) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <TouchableOpacity
            style={[styles.filterButton, filters.type === 'all' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, type: 'all' }))}
          >
            <Text style={[styles.filterText, filters.type === 'all' && styles.filterTextActive]}>
              All Jobs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filters.type === 'shopping' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, type: 'shopping' }))}
          >
            <Text style={[styles.filterText, filters.type === 'shopping' && styles.filterTextActive]}>
              Shopping
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filters.type === 'task' && styles.filterButtonActive]}
            onPress={() => setFilters(prev => ({ ...prev, type: 'task' }))}
          >
            <Text style={[styles.filterText, filters.type === 'task' && styles.filterTextActive]}>
              Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.distanceButton}
            onPress={() => Alert.alert('Distance Filter', 'Distance filter coming soon!')}
          >
            <Text style={styles.distanceText}>📍 {filters.distance}km</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.jobsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or check back later for new opportunities.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  filtersContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingVertical: Spacing.sm,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  distanceButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  distanceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  jobsContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  jobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobTypeIcon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  jobType: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  jobUrgency: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  urgencyText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  jobTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
  },
  customerInfo: {
    alignItems: 'flex-end',
  },
  customerName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  customerRating: {
    marginTop: Spacing.xs,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary,
  },
  jobDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  itemsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemsLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  itemsText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  categoryContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    width: 20,
    textAlign: 'center',
  },
  locationText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    flex: 1,
  },
  distanceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  budgetLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginRight: Spacing.sm,
  },
  budgetText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
  },
  timeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  earningsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  earningsLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  earningsValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.md,
  },
});

export default JobFeed;





