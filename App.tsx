import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import ProviderTypeScreen from './src/screens/ProviderTypeScreen';
import AuthScreen from './src/screens/AuthScreen';
import ProviderOnboardingScreen from './src/screens/ProviderOnboardingScreen';
import CustomerDashboard from './src/screens/CustomerDashboard';
import AllStores from './src/screens/AllStores';
import ProviderDashboard from './src/screens/ProviderDashboard';
import Profile from './src/screens/Profile';
import Wallet from './src/screens/Wallet';
import AdminDashboard from './src/screens/AdminDashboard';
import JobFeed from './src/screens/provider/JobFeed';
import LoadingScreen from './src/components/LoadingScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Import types
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  const { session, loading } = useAuth();
  const navigationRef = useRef<any>(null);

  // Handle navigation when session changes
  useEffect(() => {
    if (!loading && navigationRef.current) {
      if (session) {
        // User is authenticated - check if they need onboarding
        console.log('Session user metadata:', session?.user?.user_metadata);
        const userRole = session?.user?.user_metadata?.role || 'customer';
        const providerType = session?.user?.user_metadata?.providerType;
        
        console.log('Detected user role:', userRole);
        console.log('Provider type:', providerType);
        
        // Check if provider needs onboarding or has pending/rejected application
        if (userRole === 'provider' && providerType) {
          checkProviderStatus(session.user.id, providerType);
        } else {
          // Navigate to appropriate dashboard
          let targetRoute = 'CustomerDashboard';
          if (userRole === 'provider') {
            targetRoute = 'ProviderDashboard';
          } else if (userRole === 'admin') {
            targetRoute = 'AdminDashboard';
          }
          console.log('Navigating to dashboard:', targetRoute);
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: targetRoute }],
          });
        }
      } else {
        // User is not authenticated - navigate to welcome
        console.log('Navigating to welcome screen');
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }
    }
  }, [session, loading]);

  const checkProviderStatus = async (userId: string, providerType: string) => {
    try {
      // Import supabase dynamically
      const { default: supabase } = await import('./src/lib/supabase');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking provider status:', error);
        // If error, assume they need onboarding
        navigationRef.current.reset({
          index: 0,
          routes: [{ 
            name: 'ProviderOnboarding',
            params: { providerType }
          }],
        });
        return;
      }

      const verificationStatus = data?.verification_status;
      console.log('Provider verification status:', verificationStatus);

      if (!verificationStatus || verificationStatus === 'pending' || verificationStatus === 'rejected') {
        // Provider needs to complete onboarding or has pending/rejected application
        console.log('Provider needs onboarding or has pending/rejected application');
        navigationRef.current.reset({
          index: 0,
          routes: [{ 
            name: 'ProviderOnboarding',
            params: { providerType }
          }],
        });
      } else if (verificationStatus === 'approved') {
        // Provider is approved, navigate to dashboard
        console.log('Provider is approved, navigating to dashboard');
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'ProviderDashboard' }],
        });
      }
    } catch (error) {
      console.error('Error checking provider status:', error);
      // If error, assume they need onboarding
      navigationRef.current.reset({
        index: 0,
        routes: [{ 
          name: 'ProviderOnboarding',
          params: { providerType }
        }],
      });
    }
  };

  // Global JS error handler to surface runtime errors and stack traces in-app
  useEffect(() => {
    const globalHandler = (error: any, isFatal?: boolean) => {
      try {
        const message = error && (error.message || String(error));
        const stack = error && (error.stack || '');
        console.error('GLOBAL JS ERROR:', message, stack);
        // show a simple alert with message + first part of stack so you can copy it from the device
        Alert.alert(
          'JavaScript Error',
          `${message}\n\n${stack.split('\n').slice(0, 8).join('\n')}`,
          [{ text: 'OK' }],
        );
      } catch (e) {
        console.error('Error in globalHandler', e);
      }
    };

    // Set React Native global error handler if available
    try {
      if (typeof (ErrorUtils as any) !== 'undefined' && (ErrorUtils as any).setGlobalHandler) {
        (ErrorUtils as any).setGlobalHandler(globalHandler);
      } else {
        // Fallback to window.onerror
        const origOnError = (global as any).onerror;
        (global as any).onerror = (...args: any[]) => {
          globalHandler(args[0]);
          if (origOnError) origOnError(...args);
        };
      }
    } catch (e) {
      console.error('Failed to set global error handler', e);
    }

    // unhandled promise rejections
    const onRejection = (ev: any) => {
      try {
        const reason = ev && (ev.reason || ev.detail || ev);
        globalHandler(reason);
      } catch (e) {
        console.error('Error handling rejection', e);
      }
    };
    try {
      if (typeof (global as any).addEventListener === 'function') {
        (global as any).addEventListener('unhandledrejection', onRejection);
      }
    } catch (e) {}

    return () => {
      try {
        if (typeof (global as any).removeEventListener === 'function') {
          (global as any).removeEventListener('unhandledrejection', onRejection);
        }
      } catch (e) {}
    };
  }, []);

  // Try dynamic import of CustomerDashboard to capture module-level syntax/load errors
  useEffect(() => {
    (async () => {
      try {
        // dynamic import so Metro will attempt to load that module and we can catch errors with stack/location
        await import('./src/screens/CustomerDashboard');
        console.log('CustomerDashboard module imported successfully');
      } catch (err) {
        console.error('Dynamic import error for CustomerDashboard:', err);
        try {
          Alert.alert('Module Load Error', String(err).slice(0, 1000));
        } catch (e) {
          console.error('Failed to show alert for import error', e);
        }
      }
    })();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  // Determine which dashboard to show based on user role
  const getUserRole = () => {
    console.log('getUserRole - session:', session);
    console.log('getUserRole - session exists:', !!session);
    console.log('getUserRole - user exists:', !!(session && session?.user));
    console.log('getUserRole - user_metadata:', session?.user?.user_metadata);

    if (!session || !session?.user || !session?.user?.user_metadata) {
      console.log('getUserRole - returning customer due to missing data');
      return 'customer';
    }

    const role = session?.user?.user_metadata?.role || 'customer';
    console.log('getUserRole - returning role:', role);
    return role;
  };

  const userRole = getUserRole();
  let initialRoute = 'Welcome';
  if (session) {
    if (userRole === 'provider') {
      initialRoute = 'ProviderDashboard';
    } else if (userRole === 'admin') {
      initialRoute = 'AdminDashboard';
    } else {
      initialRoute = 'CustomerDashboard';
    }
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName={initialRoute as keyof RootStackParamList}
        screenOptions={{
          headerShown: false,
        }}
      >
        {session ? (
          // User is authenticated - show dashboard screens
          <>
            <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
            <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="AllStores" component={AllStores} />
            <Stack.Screen name="Wallet" component={Wallet} />
            <Stack.Screen name="JobFeed" component={JobFeed} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="ProviderType" component={ProviderTypeScreen} />
                     <Stack.Screen name="Auth" component={AuthScreen} />
                     <Stack.Screen name="ProviderOnboarding" component={ProviderOnboardingScreen} />
                   </>
                 ) : (
                   // User is not authenticated - show auth screens
                   <>
                     <Stack.Screen name="Welcome" component={WelcomeScreen} />
                     <Stack.Screen name="ProviderType" component={ProviderTypeScreen} />
                     <Stack.Screen name="Auth" component={AuthScreen} />
                     <Stack.Screen name="ProviderOnboarding" component={ProviderOnboardingScreen} />
                     <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
                     <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} />
                     <Stack.Screen name="Profile" component={Profile} />
                     <Stack.Screen name="AllStores" component={AllStores} />
                     <Stack.Screen name="Wallet" component={Wallet} />
                     <Stack.Screen name="JobFeed" component={JobFeed} />
                   </>
                 )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

