import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type ProviderTypeNavigationProp = StackNavigationProp<RootStackParamList, 'ProviderType'>;

interface Props {
  navigation: ProviderTypeNavigationProp;
}

const { width, height } = Dimensions.get('window');

const ProviderTypeScreen: React.FC<Props> = ({ navigation }) => {
  // Automatically proceed with personal_shopper since we're focusing only on shopping aggregation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Auth', {
        selectedRole: 'provider',
        providerType: 'personal_shopper'
      });
    }, 1500); // Short delay to show the screen briefly

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      <LinearGradient
        colors={['#F5F5F5', '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Personal Shopper</Text>
          <Text style={styles.subtitle}>
            Setting up your shopping service...
          </Text>
        </View>

        {/* Loading/Confirmation Section */}
        <View style={styles.loadingSection}>
          <View style={styles.loadingCard}>
            <LinearGradient
              colors={['#FF6B6B', '#FF5252']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Text style={styles.iconText}>🛒</Text>
              </View>
              <View style={styles.loadingTextContent}>
                <Text style={styles.cardTitle}>Personal Shopper</Text>
                <Text style={styles.loadingText}>
                  Preparing your shopping journey...
                </Text>
                <View style={styles.loadingIndicator}>
                  <View style={styles.dot} />
                  <View style={[styles.dot, styles.dotDelay1]} />
                  <View style={[styles.dot, styles.dotDelay2]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Info Text */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            You'll be able to shop for groceries, pick up items from any store, and deliver orders to customers in your area.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.05,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  loadingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    width: width * 0.9,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  loadingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    opacity: 0.7,
  },
  dotDelay1: {
    opacity: 0.5,
  },
  dotDelay2: {
    opacity: 0.3,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
  },
  providerCard: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  cardIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconText: {
    fontSize: 28,
  },
  textContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    fontFamily: 'Poppins-Bold',
  },
  cardDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 10,
    fontFamily: 'Poppins-Regular',
    lineHeight: 18,
  },
  cardFeatures: {
    gap: 4,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontFamily: 'Poppins-Regular',
  },
  earningsInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  earningsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6CA0DC',
    fontFamily: 'Poppins-Medium',
  },
});

export default ProviderTypeScreen;
