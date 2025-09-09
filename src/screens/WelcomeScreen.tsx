import React from 'react';
// SVG component import (requires react-native-svg + react-native-svg-transformer)
// Import logo; ensure filename matches actual file in assets (case-sensitive on some systems)
// Use runtime require for image with special characters in filename
import { Image } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Colors } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');



const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.base} />
      
      <LinearGradient
        colors={[Colors.background.base, Colors.white]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image source={require('../../assets/Swiftly.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.headline}>Your City, On-Demand</Text>
          <Text style={styles.tagline}>
            Hire a pro, order from any store, and get things done quickly and easily
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.customerButton}
            onPress={() => navigation.navigate('Auth', { selectedRole: 'customer' })}
            activeOpacity={0.8}
          >
            <Text style={styles.customerButtonText}>I need shopping help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.providerButton}
            onPress={() => navigation.navigate('ProviderType')}
            activeOpacity={0.8}
          >
            <Text style={styles.providerButtonText}>I want to be a shopper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Auth', { showSignIn: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.base,
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
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  logoImage: {
    width: width * 1.0,
    height: height * 0.34,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'Poppins-Bold',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tickIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
    lineHeight: 40,
  },
  tagline: {
    fontSize: 18,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Poppins-Regular',
    paddingHorizontal: 20,
  },
  actionSection: {
    paddingBottom: height * 0.05,
  },
  customerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  customerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  providerButton: {
    backgroundColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  providerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Poppins-Medium',
  },
});

export default WelcomeScreen;
