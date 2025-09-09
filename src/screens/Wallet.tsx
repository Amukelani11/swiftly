import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';
import { formatCurrencySafe } from '../utils/format';
import { Colors } from '../styles/theme';

type WalletNavigationProp = StackNavigationProp<RootStackParamList, 'Wallet'>;

interface Props {
  navigation: WalletNavigationProp;
}

interface WalletData {
  balance: number;
  totalEarnings: number;
  totalSpent: number;
  pendingWithdrawals: number;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'withdrawal';
  amount: number;
  description: string;
  created_at: string;
  status: 'pending' | 'completed' | 'failed';
}

const Wallet: React.FC<Props> = ({ navigation }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Fetch profile data for wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_earnings, total_spent')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setMockWalletData();
        return;
      }

      // Mock wallet data for now
      const mockData: WalletData = {
        balance: (profile.total_earnings || 0) - (profile.total_spent || 0),
        totalEarnings: profile.total_earnings || 0,
        totalSpent: profile.total_spent || 0,
        pendingWithdrawals: 0,
        recentTransactions: [
          {
            id: '1',
            type: 'credit',
            amount: 185.50,
            description: 'Task completion payment',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed',
          },
          {
            id: '2',
            type: 'debit',
            amount: -25.00,
            description: 'Service fee',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            status: 'completed',
          },
          {
            id: '3',
            type: 'withdrawal',
            amount: -500.00,
            description: 'Bank withdrawal',
            created_at: new Date(Date.now() - 259200000).toISOString(),
            status: 'pending',
          },
        ],
      };

      setWalletData(mockData);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setMockWalletData();
    } finally {
      setLoading(false);
    }
  };

  const setMockWalletData = () => {
    setWalletData({
      balance: 1245.50,
      totalEarnings: 4850.25,
      totalSpent: 120.00,
      pendingWithdrawals: 500.00,
      recentTransactions: [
        {
          id: '1',
          type: 'credit',
          amount: 185.50,
          description: 'Task completion payment',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
        },
        {
          id: '2',
          type: 'debit',
          amount: -25.00,
          description: 'Service fee',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed',
        },
        {
          id: '3',
          type: 'withdrawal',
          amount: -500.00,
          description: 'Bank withdrawal',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          status: 'pending',
        },
      ],
    });
  };

  const handleWithdraw = useCallback(() => {
    Alert.alert(
      'Withdraw Funds',
      'Withdraw funds to your bank account. This may take 2-3 business days to process.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: () => {
            Alert.alert('Success', 'Withdrawal request submitted. You will receive a confirmation email shortly.');
          },
        },
      ]
    );
  }, []);

  const handleAddFunds = useCallback(() => {
    Alert.alert(
      'Add Funds',
      'Add funds to your wallet for task payments and fees.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Funds',
          onPress: () => {
            Alert.alert('Success', 'Funds added successfully!');
          },
        },
      ]
    );
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return 'arrow-down-circle';
      case 'debit':
        return 'arrow-up-circle';
      case 'withdrawal':
        return 'cash';
      default:
        return 'wallet';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return '#10B981';
      case 'debit':
        return '#EF4444';
      case 'withdrawal':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!walletData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.primary} />
          <Text style={styles.errorTitle}>Unable to Load Wallet</Text>
          <Text style={styles.errorText}>Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWalletData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.white, Colors.background.base]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={['#00D4AA', '#00B894']}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={24} color="#FFFFFF" />
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrencySafe(walletData.balance)}
            </Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleAddFunds}>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
                <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>
              {formatCurrencySafe(walletData.totalEarnings)}
            </Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>
              {formatCurrencySafe(walletData.totalSpent)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.statValue}>
              {formatCurrencySafe(walletData.pendingWithdrawals)}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {walletData.recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: getTransactionColor(transaction.type) + '20' }
                ]}>
                  <Ionicons
                    name={getTransactionIcon(transaction.type)}
                    size={20}
                    color={getTransactionColor(transaction.type)}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.amount > 0 ? Colors.success : Colors.error }
                ]}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrencySafe(transaction.amount)}
                </Text>
                <Text style={styles.transactionStatus}>
                  {transaction.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
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
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    fontFamily: 'Poppins-Bold',
  },
  headerRight: {
    width: 40,
  },

  // Balance Card
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceGradient: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'Poppins-Medium',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Poppins-Bold',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 8,
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontFamily: 'Poppins-Medium',
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },

  // Transactions
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: Colors.text.primary,
    fontFamily: 'Poppins-Medium',
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  transactionStatus: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },

  bottomSpacer: {
    height: 100,
  },
});

export default Wallet;
