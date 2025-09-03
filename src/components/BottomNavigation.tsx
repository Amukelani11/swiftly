import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  userType?: 'customer' | 'provider';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabPress, userType = 'customer' }) => {
  const customerTabs = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      id: 'search',
      label: 'Browse',
      icon: 'search-outline',
      activeIcon: 'search',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'receipt-outline',
      activeIcon: 'receipt',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: 'heart-outline',
      activeIcon: 'heart',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
    },
  ];

  const providerTabs = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'briefcase-outline',
      activeIcon: 'briefcase',
    },
    {
      id: 'earnings',
      label: 'Earnings',
      icon: 'wallet-outline',
      activeIcon: 'wallet',
    },
    {
      id: 'map',
      label: 'Map',
      icon: 'map-outline',
      activeIcon: 'map',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
    },
  ];

  const tabs = userType === 'customer' ? customerTabs : providerTabs;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === tab.id ? tab.activeIcon : tab.icon}
            size={24}
            color={activeTab === tab.id ? '#FFC857' : '#666666'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? '#FFC857' : '#666666' }
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Poppins-Medium',
  },
});

export default BottomNavigation;
