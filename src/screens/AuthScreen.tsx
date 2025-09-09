import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../styles/theme';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;
type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;

interface Props {
  navigation: AuthScreenNavigationProp;
  route: AuthScreenRouteProp;
}

const AuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const [isSignUp, setIsSignUp] = useState(!route.params?.showSignIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const selectedRole = route.params?.selectedRole || 'customer';
  const providerType = route.params?.providerType;
  const { refreshSession } = useAuth();

  const handleAuth = async () => {
    // Clear previous errors
    setPasswordError('');
    setEmailError('');
    
    try {
      // Lazy import to avoid loading before env vars are ready
      const { default: supabase } = await import('../lib/supabase');

      if (isSignUp) {
        if (!email || !password || !fullName || !phone) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }

        console.log('Attempting signup with:', { email, fullName, phone, selectedRole, providerType });
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              fullName,
              phone,
              role: selectedRole,
              providerType: providerType || null,
            },
          },
        });

        if (error) {
          console.error('Signup error:', error);
          Alert.alert('Sign up error', error.message);
          return;
        }

        console.log('Signup response:', { data, error });
        console.log('Signup data.user:', data?.user);
        console.log('Signup data.session:', data?.session);
        
        // Check if profile was created
        if (data?.user?.id) {
          console.log('Checking if profile was created for user:', data.user.id);
          
          // Wait a moment for the trigger to execute
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            
            if (profileError) {
              console.error('Error checking profile:', profileError);
              
              // Try to manually create the profile using RPC
              console.log('Attempting to manually create profile via RPC...');
              const { data: insertData, error: insertError } = await supabase
                                 .rpc('create_user_profile', {
                   user_id: data.user.id,
                   user_email: data.user.email,
                   user_full_name: data.user.user_metadata?.fullName || '',
                   user_phone: data.user.user_metadata?.phone || '',
                   user_role: data.user.user_metadata?.role || 'customer',
                   user_provider_type: data.user.user_metadata?.providerType || null
                 });
              
              if (insertError) {
                console.error('Manual profile creation failed:', insertError);
              } else {
                console.log('✅ Profile manually created via RPC');
                
                // Verify the profile was actually created
                const { data: verifyData, error: verifyError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', data.user.id)
                  .single();
                
                if (verifyError) {
                  console.error('Error verifying profile:', verifyError);
                } else if (verifyData) {
                  console.log('✅ Profile verified in database:', verifyData);
                }
              }
            } else if (profileData) {
              console.log('✅ Profile found in database:', profileData);
            } else {
              console.log('❌ No profile found in database for user:', data.user.id);
              console.log('This means the handle_new_user() trigger function is not working');
            }
          } catch (err) {
            console.error('Exception checking profile:', err);
          }
        }
        
        // For signup, always show verification screen since Supabase sends confirmation email
        console.log('User signed up, showing verification screen');
        setShowVerification(true);
        Alert.alert('Verification Required', 'Please check your email for a verification code and enter it below.');
      } else {
        if (!email || !password) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.log('Sign in error:', error.message);
          // Check if the error is due to unverified email
          if (error.message.includes('Email not confirmed') || 
              error.message.includes('not verified') ||
              error.message.includes('email not confirmed') ||
              error.message.includes('Email not verified') ||
              error.message.includes('confirm your email') ||
              error.message.includes('verify your email')) {
            setShowVerification(true);
            Alert.alert('Email Verification Required', 'Please verify your email address first. We\'ll send you a new verification code.');
            // Send a new verification code
            await handleResendCode();
            return;
          }
          
          // Handle password/email errors with inline validation
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('Invalid email or password') ||
              error.message.includes('Wrong password') ||
              error.message.includes('password is incorrect')) {
            setPasswordError('Password incorrect');
            return;
          }
          
          if (error.message.includes('User not found') || 
              error.message.includes('Email not found')) {
            setEmailError('Email not found');
            return;
          }
          
          // For other errors, still show alert
          Alert.alert('Sign in error', error.message);
          return;
        }

        // data.session available; proceed
        await refreshSession(); // Refresh the auth context
        // Navigation will be handled automatically by the auth context
      }
    } catch (err: any) {
      Alert.alert('Auth error', err.message || String(err));
    }
  };

  const handleVerification = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const { default: supabase } = await import('../lib/supabase');
      
      console.log('Attempting to verify OTP:', { email, verificationCode });
      
      // Try the newer confirmSignUp method first
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup'
      });

      console.log('Verification response:', { data, error });

      if (error) {
        console.error('Verification error:', error);
        Alert.alert('Verification Error', error.message);
        return;
      }

      console.log('Verification successful');
      
      // Refresh auth context - navigation will be handled by App.tsx
      await refreshSession();
    } catch (err: any) {
      console.error('Verification exception:', err);
      Alert.alert('Verification error', err.message || String(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const { default: supabase } = await import('../lib/supabase');
      
      console.log('Attempting to resend verification code to:', email);
      
      // Use the resend method for verification codes
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Resend error:', error);
        Alert.alert('Error', error.message);
        return;
      }

      console.log('Verification code resent successfully');
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
      
    } catch (err: any) {
      console.error('Resend exception:', err);
      Alert.alert('Error', 'Unable to resend verification code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.base} />
      
      <LinearGradient
        colors={[Colors.background.base, '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? `Sign up as a ${selectedRole}${providerType ? ` (${providerType.replace('_', ' ')})` : ''}` 
              : 'Sign in to your account'
            }
          </Text>
        </View>

        {/* Form */}
        {!showVerification ? (
          <View style={styles.form}>
            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </>
            )}
            
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              secureTextEntry
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuth}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.verificationHeader}>
              <Text style={styles.verificationTitle}>Email Verification</Text>
              <Text style={styles.verificationSubtitle}>
                {isSignUp 
                  ? `We've sent a verification code to ${email}`
                  : `Please verify your email address. We've sent a new code to ${email}`
                }
              </Text>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Enter verification code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerification}
              activeOpacity={0.8}
              disabled={isVerifying}
            >
              <Text style={styles.primaryButtonText}>
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleResendCode}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Resend Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToSignupButton}
              onPress={() => setShowVerification(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.backToSignupButtonText}>
                ← Back to {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        </ScrollView>

        {/* Footer - fixed so keyboard overlays it on Android */}
        <View style={styles.footer}>
          <View style={styles.toggleSectionInline}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleButton}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButtonFooter}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  form: {
    flex: 1,
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  toggleButton: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Poppins-Medium',
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontFamily: 'Poppins-Medium',
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6CA0DC',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6CA0DC',
    fontFamily: 'Poppins-SemiBold',
  },
  backToSignupButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  backToSignupButtonText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Poppins-Medium',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: 'transparent',
  },
  toggleSectionInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  backButtonFooter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});

export default AuthScreen;
