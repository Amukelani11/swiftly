import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';
import { uploadProfilePicture, uploadDocument } from '../utils/fileUpload';

const { width, height } = Dimensions.get('window');

type OnboardingSection = 'location' | 'documents' | 'vehicle' | 'bio';

interface ProviderOnboardingScreenProps {
  route: {
    params: {
      providerType: 'personal_shopper' | 'tasker';
    };
  };
}

export default function ProviderOnboardingScreen({ route }: ProviderOnboardingScreenProps) {
  const navigation = useNavigation();
  const { providerType } = route.params;
  
  const [expandedSection, setExpandedSection] = useState<OnboardingSection | null>(null);
  const [loading, setLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Location data
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  
  // Document uploads
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState('');
  const [idDocumentName, setIdDocumentName] = useState('');
  const [proofOfAddressName, setProofOfAddressName] = useState('');
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingAddress, setUploadingAddress] = useState(false);
  
  // Profile picture upload
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [profilePictureName, setProfilePictureName] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Vehicle data (for personal shoppers)
  const [vehicleType, setVehicleType] = useState<'car' | 'motorbike' | ''>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [driversLicenseUrl, setDriversLicenseUrl] = useState('');
  const [driversLicenseName, setDriversLicenseName] = useState('');
  const [uploadingDriversLicense, setUploadingDriversLicense] = useState(false);
  
  // Bio and pricing
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  
  // Error states for inline validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  // Ensure animation values are properly initialized
  useEffect(() => {
    // Reset animation values to ensure they're working correctly
    buttonScaleAnim.setValue(1);
  }, []);

  const sections: { key: OnboardingSection; title: string; description: string; icon: string }[] = [
    {
      key: 'location',
      title: 'Location',
      description: 'Where are you based?',
      icon: 'location-outline'
    },
    {
      key: 'documents',
      title: 'Documents',
      description: 'Upload your ID and proof of address',
      icon: 'document-outline'
    },
    ...(providerType === 'personal_shopper' ? [{
      key: 'vehicle' as OnboardingSection,
      title: 'Vehicle',
      description: 'Tell us about your vehicle',
      icon: 'car-outline'
    }] : []),
    {
      key: 'bio',
      title: 'About You',
      description: 'Tell customers about yourself',
      icon: 'person-outline'
    }
  ];
  
  // Check application status on mount
  useEffect(() => {
    checkApplicationStatus();
  }, []);

  // Animation effects
  useEffect(() => {
    // Fade in and slide up animation when section expands
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [expandedSection]);

  const checkApplicationStatus = async () => {
    try {
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        setCheckingStatus(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.verification_status) {
        setApplicationStatus(data.verification_status);
        
        // If approved, navigate to dashboard
        if (data.verification_status === 'approved') {
          navigation.navigate('ProviderDashboard');
        }
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };
  
  // Button press animation
  const animateButtonPress = () => {
    if (!buttonScaleAnim) return;

    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Input focus animation
  const animateInputFocus = (focused: boolean) => {
    Animated.timing(inputFocusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleDocumentUpload = async (type: 'id' | 'address' | 'drivers_license') => {
    try {
      if (type === 'id') {
        setUploadingId(true);
      } else if (type === 'address') {
        setUploadingAddress(true);
      } else if (type === 'drivers_license') {
        setUploadingDriversLicense(true);
      }
      
      const result = await uploadDocument(type);
      
      if (result.success) {
        if (type === 'id') {
          setIdDocumentUrl(result.url || '');
          setIdDocumentName(result.fileName || '');
        } else if (type === 'address') {
          setProofOfAddressUrl(result.url || '');
          setProofOfAddressName(result.fileName || '');
        } else if (type === 'drivers_license') {
          setDriversLicenseUrl(result.url || '');
          setDriversLicenseName(result.fileName || '');
        }
      } else {
        console.error('Document upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      if (type === 'id') {
        setUploadingId(false);
      } else if (type === 'address') {
        setUploadingAddress(false);
      } else if (type === 'drivers_license') {
        setUploadingDriversLicense(false);
      }
    }
  };

  const removeDocument = (type: 'id' | 'address' | 'drivers_license') => {
    if (type === 'id') {
      setIdDocumentUrl('');
      setIdDocumentName('');
    } else if (type === 'address') {
      setProofOfAddressUrl('');
      setProofOfAddressName('');
    } else if (type === 'drivers_license') {
      setDriversLicenseUrl('');
      setDriversLicenseName('');
    }
  };

  const handleProfilePictureUpload = async () => {
    try {
      setUploadingProfile(true);
      
      const result = await uploadProfilePicture();
      
      if (result.success) {
        setProfilePictureUrl(result.url || '');
        setProfilePictureName(result.fileName || '');
      } else {
        console.error('Profile picture upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingProfile(false);
    }
  };

  const removeProfilePicture = () => {
    setProfilePictureUrl('');
    setProfilePictureName('');
  };

  // Auto-save functions
  const saveFormData = async () => {
    try {
      setIsSaving(true);
      const formData = {
        // Location data
        city,
        province,
        address,
        
        // Document data
        idDocumentUrl,
        proofOfAddressUrl,
        idDocumentName,
        proofOfAddressName,
        driversLicenseUrl,
        driversLicenseName,
        
        // Profile picture data
        profilePictureUrl,
        profilePictureName,
        
        // Vehicle data
        vehicleType,
        licensePlate,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        
        // Bio data
        bio,
        hourlyRate,
        experienceYears,
        
        // Provider type
        providerType,
        
        // Timestamp
        savedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('onboarding_form_data', JSON.stringify(formData));
      setLastSaved(new Date());
      console.log('Form data auto-saved');
    } catch (error) {
      console.error('Error saving form data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('onboarding_form_data');
      if (savedData) {
        const formData = JSON.parse(savedData);
        
        // Load location data
        setCity(formData.city || '');
        setProvince(formData.province || '');
        setAddress(formData.address || '');
        
        // Load document data
        setIdDocumentUrl(formData.idDocumentUrl || '');
        setProofOfAddressUrl(formData.proofOfAddressUrl || '');
        setIdDocumentName(formData.idDocumentName || '');
        setProofOfAddressName(formData.proofOfAddressName || '');
        setDriversLicenseUrl(formData.driversLicenseUrl || '');
        setDriversLicenseName(formData.driversLicenseName || '');
        
        // Load profile picture data
        setProfilePictureUrl(formData.profilePictureUrl || '');
        setProfilePictureName(formData.profilePictureName || '');
        
        // Load vehicle data
        setVehicleType(formData.vehicleType || '');
        setLicensePlate(formData.licensePlate || '');
        setVehicleMake(formData.vehicleMake || '');
        setVehicleModel(formData.vehicleModel || '');
        setVehicleYear(formData.vehicleYear || '');
        setDriversLicenseUrl(formData.driversLicenseUrl || '');
        
        // Load bio data
        setBio(formData.bio || '');
        setHourlyRate(formData.hourlyRate || '');
        setExperienceYears(formData.experienceYears || '');
        
        // Note: providerType is read-only from route params, so we don't set it
        
        // Set last saved timestamp
        if (formData.savedAt) {
          setLastSaved(new Date(formData.savedAt));
        }
        
        console.log('Form data loaded from storage');
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const clearFormData = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_form_data');
      console.log('Form data cleared');
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
  };

  // Auto-save on form changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      saveFormData();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [city, province, address, idDocumentUrl, proofOfAddressUrl, profilePictureUrl, 
      vehicleType, licensePlate, vehicleMake, vehicleModel, vehicleYear, driversLicenseUrl,
      bio, hourlyRate, experienceYears, providerType]);

  // Load saved data on component mount
  useEffect(() => {
    loadFormData();
  }, []);

  const isSectionComplete = (section: OnboardingSection): boolean => {
    switch (section) {
      case 'location':
        return city.trim() !== '' && province.trim() !== '' && address.trim() !== '';
      case 'documents':
        return idDocumentUrl.trim() !== '' && proofOfAddressUrl.trim() !== '';
      case 'vehicle':
        if (providerType === 'personal_shopper') {
          return vehicleType !== '' && licensePlate.trim() !== '' && 
                 vehicleMake.trim() !== '' && vehicleModel.trim() !== '' && 
                 vehicleYear.trim() !== '' && driversLicenseUrl.trim() !== '';
        }
        return true;
      case 'bio':
        return bio.trim() !== '' && hourlyRate.trim() !== '' && experienceYears.trim() !== '';
      default:
        return false;
    }
  };

  const getCompletedSectionsCount = (): number => {
    return sections.filter(section => isSectionComplete(section.key)).length;
  };

  const isAllComplete = (): boolean => {
    return sections.every(section => isSectionComplete(section.key));
  };

  const handleSectionPress = (section: OnboardingSection) => {
    setExpandedSection(expandedSection === section ? null : section);
    setErrors({}); // Clear errors when opening section
  };

  const handleBack = () => {
    setExpandedSection(null);
  };

  const handleComplete = async () => {
    if (!isAllComplete()) {
      return;
    }

    animateButtonPress();
    setLoading(true);
    let userId: string = '';
    let profileData: any = null;

    try {
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        throw new Error('User not authenticated');
      }

      userId = user.id;
      console.log('Using authenticated user ID:', userId);

      // Prepare profile data with proper validation - using all available fields from the database
      profileData = {
        email: user.email, // Required field
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Provider', // Required field
        city: city || null,
        province: province || null,
        bio: bio || null,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        id_document_url: idDocumentUrl || null,
        proof_of_address_url: proofOfAddressUrl || null,
        drivers_license_url: driversLicenseUrl || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        verification_status: 'pending',
        documents_verified: false,
        provider_type: providerType,
        ...(providerType === 'personal_shopper' && {
          vehicle_type: vehicleType || null,
          vehicle_license_plate: licensePlate || null,
          vehicle_make: vehicleMake || null,
          vehicle_model: vehicleModel || null,
          vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
          vehicle_verified: false,
        }),
      };

      // Upsert profile in Supabase (insert if doesn't exist, update if it does)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profileData
        });

      if (error) throw error;

      // Clear saved form data after successful submission
      await clearFormData();

      // Set application status to pending
      setApplicationStatus('pending');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Profile data being sent:', profileData);
      console.error('User ID:', userId);
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

    const renderSectionContent = (section: OnboardingSection) => {
    switch (section) {
      case 'location':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="City"
              value={city}
              onChangeText={(text) => {
                setCity(text);
                if (errors.city) setErrors({...errors, city: ''});
              }}
              onFocus={() => animateInputFocus(true)}
              onBlur={() => animateInputFocus(false)}
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            
            <TextInput
              style={[styles.input, errors.province && styles.inputError]}
              placeholder="Province"
              value={province}
              onChangeText={(text) => {
                setProvince(text);
                if (errors.province) setErrors({...errors, province: ''});
              }}
              onFocus={() => animateInputFocus(true)}
              onBlur={() => animateInputFocus(false)}
            />
            {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
            
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Full Address"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                if (errors.address) setErrors({...errors, address: ''});
              }}
              multiline
              numberOfLines={3}
              onFocus={() => animateInputFocus(true)}
              onBlur={() => animateInputFocus(false)}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </Animated.View>
        );

      case 'documents':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* ID Document Upload */}
            {idDocumentUrl ? (
              <View style={styles.uploadedFileContainer}>
                <View style={styles.uploadedFileInfo}>
                  <Ionicons name="document" size={24} color="#4CAF50" />
                  <View style={styles.uploadedFileDetails}>
                    <Text style={styles.uploadedFileName}>{idDocumentName}</Text>
                    <Text style={styles.uploadedFileStatus}>✓ Uploaded successfully</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.removeFileButton}
                  onPress={() => removeDocument('id')}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.uploadButton, errors.idDocument && styles.uploadButtonError]}
                onPress={() => handleDocumentUpload('id')}
                disabled={uploadingId}
              >
                {uploadingId ? (
                  <View style={styles.uploadingContainer}>
                    <View style={styles.uploadingSpinner} />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document" size={24} color={errors.idDocument ? Colors.error : Colors.text.primary} />
                    <Text style={[styles.uploadButtonText, errors.idDocument && styles.uploadButtonTextError]}>
                      Upload ID Document
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {errors.idDocument && <Text style={styles.errorText}>{errors.idDocument}</Text>}
            
            {/* Proof of Address Upload */}
            {proofOfAddressUrl ? (
              <View style={styles.uploadedFileContainer}>
                <View style={styles.uploadedFileInfo}>
                  <Ionicons name="home" size={24} color="#4CAF50" />
                  <View style={styles.uploadedFileDetails}>
                    <Text style={styles.uploadedFileName}>{proofOfAddressName}</Text>
                    <Text style={styles.uploadedFileStatus}>✓ Uploaded successfully</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.removeFileButton}
                  onPress={() => removeDocument('address')}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.uploadButton, errors.proofOfAddress && styles.uploadButtonError]}
                onPress={() => handleDocumentUpload('address')}
                disabled={uploadingAddress}
              >
                {uploadingAddress ? (
                  <View style={styles.uploadingContainer}>
                    <View style={styles.uploadingSpinner} />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="home" size={24} color={errors.proofOfAddress ? Colors.error : Colors.text.primary} />
                    <Text style={[styles.uploadButtonText, errors.proofOfAddress && styles.uploadButtonTextError]}>
                      Upload Proof of Address
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {errors.proofOfAddress && <Text style={styles.errorText}>{errors.proofOfAddress}</Text>}
          </Animated.View>
        );

      case 'vehicle':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.vehicleTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'car' && styles.vehicleTypeButtonActive,
                  errors.vehicleType && styles.vehicleTypeButtonError
                ]}
                onPress={() => {
                  setVehicleType('car');
                  if (errors.vehicleType) setErrors({...errors, vehicleType: ''});
                }}
              >
                                 <Ionicons name="car" size={24} color={vehicleType === 'car' ? '#fff' : Colors.secondary} />
                <Text style={[styles.vehicleTypeText, vehicleType === 'car' && styles.vehicleTypeTextActive]}>
                  Car
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'motorbike' && styles.vehicleTypeButtonActive,
                  errors.vehicleType && styles.vehicleTypeButtonError
                ]}
                onPress={() => {
                  setVehicleType('motorbike');
                  if (errors.vehicleType) setErrors({...errors, vehicleType: ''});
                }}
              >
                                 <Ionicons name="bicycle" size={24} color={vehicleType === 'motorbike' ? '#fff' : Colors.secondary} />
                <Text style={[styles.vehicleTypeText, vehicleType === 'motorbike' && styles.vehicleTypeTextActive]}>
                  Motorbike
                </Text>
              </TouchableOpacity>
            </View>
            {errors.vehicleType && <Text style={styles.errorText}>{errors.vehicleType}</Text>}
            
            <TextInput
              style={[styles.input, errors.licensePlate && styles.inputError]}
              placeholder="License Plate"
              value={licensePlate}
              onChangeText={(text) => {
                setLicensePlate(text);
                if (errors.licensePlate) setErrors({...errors, licensePlate: ''});
              }}
            />
            {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}
            
            <TextInput
              style={[styles.input, errors.vehicleMake && styles.inputError]}
              placeholder="Vehicle Make (e.g., Toyota)"
              value={vehicleMake}
              onChangeText={(text) => {
                setVehicleMake(text);
                if (errors.vehicleMake) setErrors({...errors, vehicleMake: ''});
              }}
            />
            {errors.vehicleMake && <Text style={styles.errorText}>{errors.vehicleMake}</Text>}
            
            <TextInput
              style={[styles.input, errors.vehicleModel && styles.inputError]}
              placeholder="Vehicle Model (e.g., Corolla)"
              value={vehicleModel}
              onChangeText={(text) => {
                setVehicleModel(text);
                if (errors.vehicleModel) setErrors({...errors, vehicleModel: ''});
              }}
            />
            {errors.vehicleModel && <Text style={styles.errorText}>{errors.vehicleModel}</Text>}
            
            <TextInput
              style={[styles.input, errors.vehicleYear && styles.inputError]}
              placeholder="Year (e.g., 2020)"
              value={vehicleYear}
              onChangeText={(text) => {
                setVehicleYear(text);
                if (errors.vehicleYear) setErrors({...errors, vehicleYear: ''});
              }}
              keyboardType="numeric"
            />
            {errors.vehicleYear && <Text style={styles.errorText}>{errors.vehicleYear}</Text>}
            
            {/* Driver's License Upload */}
            {driversLicenseUrl ? (
              <View style={styles.uploadedFileContainer}>
                <View style={styles.uploadedFileInfo}>
                  <Ionicons name="card-outline" size={24} color="#4CAF50" />
                  <View style={styles.uploadedFileDetails}>
                    <Text style={styles.uploadedFileName}>{driversLicenseName}</Text>
                    <Text style={styles.uploadedFileStatus}>✓ Uploaded successfully</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.removeFileButton}
                  onPress={() => removeDocument('drivers_license')}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.uploadButton, errors.driversLicense && styles.uploadButtonError]}
                onPress={() => handleDocumentUpload('drivers_license')}
                disabled={uploadingDriversLicense}
              >
                {uploadingDriversLicense ? (
                  <View style={styles.uploadingContainer}>
                    <View style={styles.uploadingSpinner} />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="card-outline" size={24} color={errors.driversLicense ? Colors.error : Colors.text.primary} />
                    <Text style={[styles.uploadButtonText, errors.driversLicense && styles.uploadButtonTextError]}>
                      Upload Driver's License
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {errors.driversLicense && <Text style={styles.errorText}>{errors.driversLicense}</Text>}
          </Animated.View>
        );

      case 'bio':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Profile Picture Upload */}
            <View style={styles.profilePictureSection}>
              <Text style={styles.sectionTitle}>Profile Picture</Text>
              <Text style={styles.requirementsText}>
                📸 Requirements: Clear background, well-lit face, good visibility
              </Text>
              
              {profilePictureUrl ? (
                <View style={styles.profilePictureContainer}>
                  <View style={styles.profilePicturePreview}>
                    <Ionicons name="person" size={48} color="#4CAF50" />
                    <Text style={styles.profilePictureName}>{profilePictureName}</Text>
                    <Text style={styles.profilePictureStatus}>✓ Uploaded successfully</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeProfileButton}
                    onPress={removeProfilePicture}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.profilePictureUploadButton}
                  onPress={handleProfilePictureUpload}
                  disabled={uploadingProfile}
                >
                  {uploadingProfile ? (
                    <View style={styles.uploadingContainer}>
                      <View style={styles.uploadingSpinner} />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color={Colors.secondary} />
                      <Text style={styles.profilePictureUploadText}>Upload Profile Picture</Text>
                      <Text style={styles.profilePictureHint}>Tap to select photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.input, styles.textArea, errors.bio && styles.inputError]}
              placeholder="Tell customers about your experience, skills, and what makes you a great provider..."
              value={bio}
              onChangeText={(text) => {
                setBio(text);
                if (errors.bio) setErrors({...errors, bio: ''});
              }}
              multiline
              numberOfLines={4}
            />
            {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
            
            <TextInput
              style={[styles.input, errors.hourlyRate && styles.inputError]}
              placeholder="Hourly Rate (R)"
              value={hourlyRate}
              onChangeText={(text) => {
                setHourlyRate(text);
                if (errors.hourlyRate) setErrors({...errors, hourlyRate: ''});
              }}
              keyboardType="numeric"
            />
            {errors.hourlyRate && <Text style={styles.errorText}>{errors.hourlyRate}</Text>}
            
            <TextInput
              style={[styles.input, errors.experienceYears && styles.inputError]}
              placeholder="Years of Experience"
              value={experienceYears}
              onChangeText={(text) => {
                setExperienceYears(text);
                if (errors.experienceYears) setErrors({...errors, experienceYears: ''});
              }}
              keyboardType="numeric"
            />
            {errors.experienceYears && <Text style={styles.errorText}>{errors.experienceYears}</Text>}
          </Animated.View>
        );

      default:
        return null;
    }
  };

    // Show loading while checking status
    if (checkingStatus) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.background.base} />
          <LinearGradient
            colors={[Colors.background.base, '#FFFFFF']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Checking application status...</Text>
          </View>
        </SafeAreaView>
      );
    }

    // Show application status if pending or rejected
    if (applicationStatus === 'pending' || applicationStatus === 'rejected') {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.background.base} />
          <LinearGradient
            colors={[Colors.background.base, '#FFFFFF']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIcon,
              applicationStatus === 'pending' ? styles.statusIconPending : styles.statusIconRejected
            ]}>
              <Ionicons 
                name={applicationStatus === 'pending' ? 'time-outline' : 'close-circle-outline'} 
                size={48} 
                color={applicationStatus === 'pending' ? '#FFA500' : '#FF4444'} 
              />
            </View>
            
            <Text style={styles.statusTitle}>
              {applicationStatus === 'pending' ? 'Application Submitted' : 'Application Rejected'}
            </Text>
            
            <Text style={styles.statusMessage}>
              {applicationStatus === 'pending' 
                ? 'Thank you for your application! We will review your information and respond within 1 working day.'
                : 'We\'re sorry, but your application has been rejected. Please contact support for more information.'
              }
            </Text>

            {applicationStatus === 'pending' && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={checkApplicationStatus}
              >
                <Text style={styles.refreshButtonText}>Check Status</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.base} />
      
      <LinearGradient
        colors={[Colors.background.base, '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        {expandedSection ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        ) : null}
        
        <View style={[styles.headerContent, { marginLeft: expandedSection ? 16 : 0 }]}>
          <Text style={styles.title}>
            {expandedSection ? sections.find(s => s.key === expandedSection)?.title : 
             `${providerType === 'personal_shopper' ? 'Personal Shopper' : 'Tasker'} Setup`}
          </Text>
          <Text style={styles.subtitle}>
            {expandedSection ? sections.find(s => s.key === expandedSection)?.description :
             `Complete your profile to start earning (${getCompletedSectionsCount()}/${sections.length})`}
          </Text>
        </View>
        
        {/* Auto-save indicator */}
        {isSaving && (
          <View style={styles.saveIndicator}>
            <View style={styles.saveSpinner} />
            <Text style={styles.saveText}>Saving...</Text>
          </View>
        )}
        {lastSaved && !isSaving && (
          <View style={styles.saveIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.saveText}>Saved</Text>
          </View>
        )}
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { width: `${(getCompletedSectionsCount() / sections.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {getCompletedSectionsCount()} of {sections.length} sections completed
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {expandedSection ? (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {renderSectionContent(expandedSection)}
          </Animated.View>
        ) : (
          <View style={styles.sectionsContainer}>
            {sections.map((section) => (
              <TouchableOpacity
                key={section.key}
                style={[
                  styles.sectionCard,
                  isSectionComplete(section.key) && styles.sectionCardComplete
                ]}
                onPress={() => handleSectionPress(section.key)}
                activeOpacity={0.8}
              >
                <View style={styles.sectionHeader}>
                  <View style={[
                    styles.sectionIconContainer,
                    isSectionComplete(section.key) && styles.sectionIconContainerComplete
                  ]}>
                    <Ionicons 
                      name={section.icon as any} 
                      size={24} 
                      color={isSectionComplete(section.key) ? Colors.success : Colors.text.primary} 
                    />
                  </View>
                  <View style={styles.sectionContent}>
                    <Text style={[
                      styles.sectionTitle,
                      isSectionComplete(section.key) && styles.sectionTitleComplete
                    ]}>
                      {section.title}
                    </Text>
                    <Text style={[
                      styles.sectionDescription,
                      isSectionComplete(section.key) && styles.sectionDescriptionComplete
                    ]}>
                      {section.description}
                    </Text>
                  </View>
                                     <View style={styles.sectionStatus}>
                     {isSectionComplete(section.key) ? (
                       <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                     ) : (
                       <View style={styles.arrowContainer}>
                         <Ionicons name="chevron-forward" size={20} color={Colors.text.primary} />
                         <Ionicons name="chevron-forward" size={20} color={Colors.text.primary} style={styles.secondArrow} />
                       </View>
                     )}
                   </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {!expandedSection && isAllComplete() && (
        <View style={styles.footer}>
          <Animated.View style={{
            transform: [{ scale: buttonScaleAnim }]
          }}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Completing...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.base,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
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
       headerContent: {
    flex: 1,
    marginLeft: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionsContainer: {
    paddingVertical: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  sectionCardComplete: {
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionIconContainerComplete: {
    backgroundColor: '#F8FFF8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  sectionTitleComplete: {
    color: '#4CAF50',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  sectionDescriptionComplete: {
    color: '#4CAF50',
  },
     sectionStatus: {
     marginLeft: 16,
   },
   arrowContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   secondArrow: {
     marginLeft: -8,
   },
  stepContent: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    fontFamily: 'Poppins-Regular',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  vehicleTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vehicleTypeButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  vehicleTypeText: {
    fontSize: 16,
    color: Colors.secondary,
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  vehicleTypeTextActive: {
    color: '#FFFFFF',
  },
  reviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  reviewText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
    fontFamily: 'Poppins-Regular',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
     buttonText: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#FFFFFF',
     fontFamily: 'Poppins-Bold',
   },
   // Error styles
   inputError: {
     borderColor: '#FF4444',
     borderWidth: 2,
   },
   uploadButtonError: {
     borderColor: '#FF4444',
   },
   uploadButtonTextError: {
     color: '#FF4444',
   },
   vehicleTypeButtonError: {
     borderColor: '#FF4444',
   },
   errorText: {
     color: '#FF4444',
     fontSize: 14,
     marginTop: 4,
     marginBottom: 8,
     fontFamily: 'Poppins-Regular',
   },
   // Enhanced animation styles
   
   // Status screen styles
   loadingContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 40,
   },
   loadingSpinner: {
     width: 40,
     height: 40,
     borderRadius: 20,
     borderWidth: 4,
     borderColor: '#E0E0E0',
     borderTopColor: Colors.secondary,
     marginBottom: 20,
   },
   loadingText: {
     fontSize: 16,
     color: '#666',
     textAlign: 'center',
     fontFamily: 'Poppins-Regular',
   },
   statusContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 40,
   },
   statusIcon: {
     width: 80,
     height: 80,
     borderRadius: 40,
     backgroundColor: '#FFFFFF',
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 24,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   statusIconPending: {
     backgroundColor: '#FFF8E1',
   },
   statusIconRejected: {
     backgroundColor: '#FFEBEE',
   },
   statusTitle: {
     fontSize: 24,
     fontWeight: 'bold',
     color: '#333',
     marginBottom: 16,
     textAlign: 'center',
     fontFamily: 'Poppins-Bold',
   },
   statusMessage: {
     fontSize: 16,
     color: '#666',
     textAlign: 'center',
     lineHeight: 24,
     marginBottom: 32,
     fontFamily: 'Poppins-Regular',
   },
   refreshButton: {
     backgroundColor: Colors.secondary,
     borderRadius: 16,
     paddingHorizontal: 32,
     paddingVertical: 16,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   refreshButtonText: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#FFFFFF',
     fontFamily: 'Poppins-Bold',
   },
   // Document upload styles
   uploadedFileContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8FFF8',
     borderWidth: 2,
     borderColor: '#4CAF50',
     borderRadius: 16,
     padding: 16,
     marginBottom: 20,
   },
   uploadedFileInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
   },
   uploadedFileDetails: {
     marginLeft: 12,
     flex: 1,
   },
   uploadedFileName: {
     fontSize: 16,
     fontWeight: '600',
     color: Colors.text.primary,
     fontFamily: 'Poppins-SemiBold',
   },
   uploadedFileStatus: {
     fontSize: 14,
     color: '#4CAF50',
     fontFamily: 'Poppins-Regular',
   },
   removeFileButton: {
     padding: 4,
   },
   uploadingContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
   },
   uploadingSpinner: {
     width: 20,
     height: 20,
     borderRadius: 10,
     borderWidth: 2,
     borderColor: '#E0E0E0',
     borderTopColor: Colors.secondary,
     marginRight: 8,
   },
   uploadingText: {
     fontSize: 16,
     color: Colors.text.secondary,
     fontFamily: 'Poppins-Regular',
   },
   // Profile picture upload styles
   profilePictureSection: {
     marginBottom: 24,
   },

   requirementsText: {
     fontSize: 14,
     color: Colors.text.secondary,
     marginBottom: 16,
     fontFamily: 'Poppins-Regular',
     lineHeight: 20,
   },
   profilePictureContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8FFF8',
     borderWidth: 2,
     borderColor: '#4CAF50',
     borderRadius: 16,
     padding: 16,
   },
   profilePicturePreview: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
   },
   profilePictureName: {
     fontSize: 16,
     fontWeight: '600',
     color: Colors.text.primary,
     marginLeft: 12,
     fontFamily: 'Poppins-SemiBold',
   },
   profilePictureStatus: {
     fontSize: 14,
     color: '#4CAF50',
     marginLeft: 8,
     fontFamily: 'Poppins-Regular',
   },
   removeProfileButton: {
     padding: 4,
   },
   profilePictureUploadButton: {
     backgroundColor: '#F8F9FA',
     borderWidth: 2,
     borderColor: '#E9ECEF',
     borderStyle: 'dashed',
     borderRadius: 16,
     padding: 24,
     alignItems: 'center',
     justifyContent: 'center',
   },
   profilePictureUploadText: {
     fontSize: 16,
     fontWeight: '600',
     color: Colors.secondary,
     marginTop: 8,
     fontFamily: 'Poppins-SemiBold',
   },
   profilePictureHint: {
     fontSize: 14,
     color: '#999999',
     marginTop: 4,
     fontFamily: 'Poppins-Regular',
   },
   // Auto-save indicator styles
   saveIndicator: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#F8F9FA',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 16,
     marginLeft: 8,
   },
   saveSpinner: {
     width: 12,
     height: 12,
     borderRadius: 6,
     borderWidth: 1.5,
     borderColor: '#E0E0E0',
     borderTopColor: Colors.secondary,
     marginRight: 6,
   },
   saveText: {
     fontSize: 12,
     color: Colors.text.secondary,
     fontFamily: 'Poppins-Regular',
   },
 });
