import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { buildGoogleDirectionsUrl, LatLng } from '../utils/navigationUrl';

type Props = {
  visible: boolean;
  onClose: () => void;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: { lat: number; lng: number }[];
  onChooseInApp: () => void;
  onChooseExternal?: (provider: 'google' | 'waze') => void;
};

export default function NavigationChoiceModal({ visible, onClose, origin, destination, waypoints, onChooseInApp, onChooseExternal }: Props) {
  const openGoogleMaps = async () => {
    try {
      // Try native map url first
      const comUrl = `comgooglemaps://?daddr=${destination.lat},${destination.lng}&directionsmode=driving`;
      const supported = await Linking.canOpenURL(comUrl);
      if (supported) {
        Linking.openURL(comUrl).catch(() => {});
      } else {
        const web = buildGoogleDirectionsUrl(origin, destination, waypoints, { travelmode: 'driving' });
        Linking.openURL(web).catch(() => {});
      }
      onClose();
      onChooseExternal && onChooseExternal('google');
    } catch (e) {
      onClose();
    }
  };

  const openWaze = async () => {
    try {
      const wazeNative = `waze://?ll=${destination.lat},${destination.lng}&navigate=yes`;
      const supported = await Linking.canOpenURL(wazeNative);
      if (supported) {
        Linking.openURL(wazeNative).catch(() => {});
      } else {
        const web = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
        Linking.openURL(web).catch(() => {});
      }
      onClose();
      onChooseExternal && onChooseExternal('waze');
    } catch (e) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Open directions</Text>
          <Text style={styles.subtitle}>Choose how you'd like to navigate. When you arrive, return to Swiftly and start shopping.</Text>

          <TouchableOpacity style={styles.button} onPress={openGoogleMaps}>
            <Ionicons name="logo-google" size={18} color="#fff" />
            <Text style={styles.buttonText}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={openWaze}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.buttonText}>Waze</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.inApp]} onPress={() => { onChooseInApp(); onClose(); }}>
            <Ionicons name="phone-portrait" size={18} color="#111" />
            <Text style={[styles.buttonText, { color: '#111' }]}>In-App Navigation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.white, padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: Colors.text.secondary, marginBottom: 12 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, padding: 12, borderRadius: 8, marginBottom: 8 },
  inApp: { backgroundColor: Colors.background.secondary },
  buttonText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  cancel: { alignItems: 'center', padding: 10 },
  cancelText: { color: Colors.text.secondary }
});


