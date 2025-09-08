import { Platform } from 'react-native';
import { supabase } from './supabase';

// Registers the current device's push token with the backend edge function.
// Uses dynamic imports so the app won’t crash if expo-notifications isn’t installed in some environments.
export async function ensureDeviceTokenRegistered(): Promise<void> {
  try {
    // Use require() so missing optional deps don’t crash Metro or require split bundles
    let Notifications: any;
    let Constants: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Notifications = require('expo-notifications');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Constants = require('expo-constants');
    } catch (e) {
      console.warn('[push] expo-notifications not available, skipping registration');
      return;
    }

    // Resolve module shape
    const N = Notifications?.getPermissionsAsync ? Notifications : Notifications?.default;
    const C = Constants?.expoConfig ? Constants : Constants?.default;
    if (!N) {
      console.warn('[push] Notifications module shape unexpected, skipping');
      return;
    }

    // Request permission
    const perms = await N.getPermissionsAsync();
    let status = perms.status;
    if (status !== 'granted') {
      const req = await N.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      console.warn('[push] Permission not granted');
      return;
    }

    // Obtain Expo push token; prefer projectId if available (EAS/dev client)
    const projectId = C?.expoConfig?.extra?.eas?.projectId
      || C?.easConfig?.projectId;

    let token = '';
    try {
      const resp = projectId
        ? await N.getExpoPushTokenAsync({ projectId })
        : await N.getExpoPushTokenAsync();
      token = (resp as any)?.data || '';
    } catch (e) {
      console.warn('[push] getExpoPushTokenAsync failed', e);
      return;
    }

    if (!token) {
      console.warn('[push] No push token');
      return;
    }

    const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : (Platform.OS === 'android' ? 'android' : 'web');

    const { error } = await supabase.functions.invoke('register-device', {
      body: { platform, token },
    });
    if (error) {
      console.error('[push] register-device failed', error);
      return;
    }
    console.log('[push] device token registered');
  } catch (err) {
    // If expo-notifications is not installed or running in an environment without it, ignore gracefully
    console.warn('[push] ensureDeviceTokenRegistered skipped', err?.toString?.());
  }
}
