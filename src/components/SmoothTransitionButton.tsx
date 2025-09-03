import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SmoothTransitionButtonProps {
  isOnline: boolean;
  isLoading: boolean;
  declaredFloat: number;
  onPress: () => void;
  onGoOffline: () => void;
}

const SmoothTransitionButton: React.FC<SmoothTransitionButtonProps> = ({
  isOnline,
  isLoading,
  declaredFloat,
  onPress,
  onGoOffline,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [animationsDisabled, setAnimationsDisabled] = useState(false);
  const lastIsOnlineRef = useRef<boolean>(isOnline);
  // Animation values - Initialize with proper values to prevent native driver conflicts
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const borderRadiusAnim = useRef(new Animated.Value(100)).current; // Start as circle
  const widthAnim = useRef(new Animated.Value(200)).current; // Width animation - JS driver only
  const heightAnim = useRef(new Animated.Value(200)).current; // Height animation - JS driver only
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const iconOpacityAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;

  // Colors - Use JS driver for color animations
  const backgroundColorAnim = useRef(new Animated.Value(0)).current; // 0 = white, 1 = teal
  const textColorAnim = useRef(new Animated.Value(0)).current; // 0 = teal, 1 = white

  // Initialize animation values with maximum safety to prevent immutable object errors
  useEffect(() => {
    let initTimer: NodeJS.Timeout;
    let markInitializedTimer: NodeJS.Timeout;

    const safeSetValue = (animValue: Animated.Value, value: number) => {
      try {
        // Check if object is frozen
        if (Object.isFrozen(animValue)) {
          console.warn('Animated.Value is frozen, skipping initialization');
          return false;
        }

        // Check if setValue method exists and is callable
        if (animValue && typeof animValue.setValue === 'function') {
          animValue.setValue(value);
          return true;
        }

        console.warn('Animated.Value setValue method not available');
        return false;
      } catch (error) {
        console.warn('Failed to set animation value:', error);
        return false;
      }
    };

    // Multiple attempts with increasing delays
    const initializeAnimations = (attempt: number = 1) => {
      try {
        let successCount = 0;

        if (safeSetValue(scaleAnim, 1)) successCount++;
        if (safeSetValue(translateYAnim, 0)) successCount++;
        if (safeSetValue(borderRadiusAnim, 100)) successCount++;
        if (safeSetValue(widthAnim, 200)) successCount++;
        if (safeSetValue(heightAnim, 200)) successCount++;
        if (safeSetValue(opacityAnim, 1)) successCount++;
        if (safeSetValue(iconOpacityAnim, 1)) successCount++;
        if (safeSetValue(textOpacityAnim, 1)) successCount++;
        if (safeSetValue(backgroundColorAnim, 0)) successCount++;
        if (safeSetValue(textColorAnim, 0)) successCount++;

        if (successCount > 0) {
          console.log(`Successfully initialized ${successCount}/10 animation values`);
        }

        // If we still couldn't initialize most animations, disable them completely
        if (successCount < 8) {
          console.warn(`Only ${successCount}/10 animations initialized successfully, disabling animations completely`);
          setAnimationsDisabled(true);
        }

        // Don't retry if we're getting frozen object errors - just disable animations
        if (successCount < 10 && attempt >= 3) {
          console.warn(`Animation initialization failed after ${attempt} attempts, disabling animations`);
          setAnimationsDisabled(true);
        } else if (successCount < 10 && attempt < 3) {
          initTimer = setTimeout(() => initializeAnimations(attempt + 1), 300 * attempt);
          return;
        }

      } catch (error) {
        console.error(`Animation initialization attempt ${attempt} failed:`, error);
        // If any attempt fails with frozen object error, disable animations immediately
        if (error.message && error.message.includes('frozen')) {
          console.warn('Frozen object detected, disabling animations immediately');
          setAnimationsDisabled(true);
        } else if (attempt < 3) {
          initTimer = setTimeout(() => initializeAnimations(attempt + 1), 300 * attempt);
        } else {
          console.warn('Animation initialization failed completely, disabling animations');
          setAnimationsDisabled(true);
        }
      }
    };

    // Start initialization with delay
    initTimer = setTimeout(() => initializeAnimations(1), 100);

    // Mark as initialized after multiple attempts (will be overridden if animations disabled)
    markInitializedTimer = setTimeout(() => {
      setIsInitialized(true);
      // Check if animations were disabled during initialization
      setTimeout(() => {
        console.log(`SmoothTransitionButton marked as initialized${animationsDisabled ? ' (animations disabled)' : ''}`);
      }, 50);
    }, 800);

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (markInitializedTimer) clearTimeout(markInitializedTimer);

      // Safely stop any ongoing animations during cleanup
      try {
        const safeStopAnimation = (animValue: Animated.Value) => {
          try {
            if (animValue && typeof animValue.stopAnimation === 'function') {
              animValue.stopAnimation();
            }
          } catch (error) {
            // Silently fail during cleanup
          }
        };

        safeStopAnimation(scaleAnim);
        safeStopAnimation(translateYAnim);
        safeStopAnimation(borderRadiusAnim);
        safeStopAnimation(widthAnim);
        safeStopAnimation(heightAnim);
        safeStopAnimation(opacityAnim);
        safeStopAnimation(iconOpacityAnim);
        safeStopAnimation(textOpacityAnim);
        safeStopAnimation(backgroundColorAnim);
        safeStopAnimation(textColorAnim);
      } catch (error) {
        // Silently fail during cleanup
      }
    };
  }, []);

  const interpolateColor = (animValue: Animated.Value, startColor: string, endColor: string) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [startColor, endColor],
    });
  };

  const backgroundColor = interpolateColor(
    backgroundColorAnim,
    '#FFFFFF', // White (offline)
    '#00D4AA'  // Teal (online)
  );

  const textColor = interpolateColor(
    textColorAnim,
    '#00D4AA', // Teal (offline)
    '#FFFFFF'  // White (online)
  );

  const borderColor = interpolateColor(
    backgroundColorAnim,
    '#00D4AA', // Teal border (offline)
    '#00D4AA'  // Teal (online)
  );

  // Keep button visuals in sync when isOnline changes outside this button
  useEffect(() => {
    if (!isInitialized || animationsDisabled) {
      lastIsOnlineRef.current = isOnline;
      return;
    }

    // Only run sync if the change did not originate from this button's own animation
    if (lastIsOnlineRef.current === isOnline) return;

    if (isOnline) {
      // Sync to expanded/online shape without triggering parent callbacks
      Animated.parallel([
        Animated.timing(widthAnim, {
          toValue: screenWidth - 40,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: screenHeight * 0.65,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(borderRadiusAnim, {
          toValue: 20,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(translateYAnim, {
          toValue: -(screenHeight * 0.35) + 120,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundColorAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(textColorAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(iconOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Sync back to compact/offline shape without triggering parent callbacks
      Animated.parallel([
        Animated.timing(widthAnim, {
          toValue: 200,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 200,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(borderRadiusAnim, {
          toValue: 100,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundColorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(textColorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(iconOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }

    lastIsOnlineRef.current = isOnline;
  }, [isOnline, isInitialized, animationsDisabled]);

  // Smooth morphing animation when going online
  const animateToOnline = () => {
    if (!isInitialized || animationsDisabled) {
      // If not initialized or animations disabled, just call onPress directly
      onPress();
      return;
    }

    try {
      // Final safety check - ensure no frozen objects before running animations
      const checkFrozen = (anim: Animated.Value, name: string) => {
        if (Object.isFrozen(anim)) {
          console.warn(`${name} is frozen, skipping animation`);
          return false;
        }
        return true;
      };

      if (!checkFrozen(scaleAnim, 'scaleAnim') ||
          !checkFrozen(translateYAnim, 'translateYAnim') ||
          !checkFrozen(borderRadiusAnim, 'borderRadiusAnim') ||
          !checkFrozen(widthAnim, 'widthAnim') ||
          !checkFrozen(heightAnim, 'heightAnim') ||
          !checkFrozen(opacityAnim, 'opacityAnim') ||
          !checkFrozen(iconOpacityAnim, 'iconOpacityAnim') ||
          !checkFrozen(textOpacityAnim, 'textOpacityAnim') ||
          !checkFrozen(backgroundColorAnim, 'backgroundColorAnim') ||
          !checkFrozen(textColorAnim, 'textColorAnim')) {
        console.warn('Frozen objects detected, falling back to direct function call');
        onPress();
        return;
      }

      // Phase 1: Button tap feedback (100ms)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        try {
      // Reset scale
      scaleAnim.setValue(1);

      // Phase 2: Smooth morphing animation (800ms)
      Animated.parallel([
        // Transform to map container shape
        Animated.timing(widthAnim, {
          toValue: screenWidth - 40, // Full width minus padding
          duration: 800,
          useNativeDriver: false, // Width/height animations cannot use native driver
        }),
        Animated.timing(heightAnim, {
          toValue: screenHeight * 0.65, // 65% of screen height
          duration: 800,
          useNativeDriver: false, // Width/height animations cannot use native driver
        }),
        // borderRadius cannot use the native driver
        Animated.timing(borderRadiusAnim, {
          toValue: 20, // Rounded rectangle
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(translateYAnim, {
          toValue: -(screenHeight * 0.35) + 120, // Move up to center
          duration: 800,
          useNativeDriver: true,
        }),

        // Color transitions
        Animated.timing(backgroundColorAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(textColorAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),

        // Fade out button elements
        Animated.timing(iconOpacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animation complete - trigger map reveal
        onPress();
      });
        } catch (error) {
          console.error('Inner animation error in animateToOnline:', error);
          // Fallback - just call onPress directly
          onPress();
        }
      });
    } catch (error) {
      console.error('Animation error in animateToOnline:', error);
      // Fallback - just call onPress directly
      onPress();
    }
  };

  // Reverse animation when going offline
  const animateToOffline = () => {
    if (!isInitialized || animationsDisabled) {
      // If not initialized or animations disabled, just call onGoOffline directly
      onGoOffline();
      return;
    }

    try {
      // Final safety check - ensure no frozen objects before running animations
      const checkFrozen = (anim: Animated.Value, name: string) => {
        if (Object.isFrozen(anim)) {
          console.warn(`${name} is frozen, skipping animation`);
          return false;
        }
        return true;
      };

      if (!checkFrozen(scaleAnim, 'scaleAnim') ||
          !checkFrozen(translateYAnim, 'translateYAnim') ||
          !checkFrozen(borderRadiusAnim, 'borderRadiusAnim') ||
          !checkFrozen(widthAnim, 'widthAnim') ||
          !checkFrozen(heightAnim, 'heightAnim') ||
          !checkFrozen(opacityAnim, 'opacityAnim') ||
          !checkFrozen(iconOpacityAnim, 'iconOpacityAnim') ||
          !checkFrozen(textOpacityAnim, 'textOpacityAnim') ||
          !checkFrozen(backgroundColorAnim, 'backgroundColorAnim') ||
          !checkFrozen(textColorAnim, 'textColorAnim')) {
        console.warn('Frozen objects detected in offline animation, falling back to direct function call');
        onGoOffline();
        return;
      }

      try {
        Animated.parallel([
          // Transform back to circle
          Animated.timing(widthAnim, {
            toValue: 200,
            duration: 600,
            useNativeDriver: false, // Width/height animations cannot use native driver
          }),
          Animated.timing(heightAnim, {
            toValue: 200,
            duration: 600,
            useNativeDriver: false, // Width/height animations cannot use native driver
          }),
          // borderRadius cannot use the native driver
          Animated.timing(borderRadiusAnim, {
            toValue: 100,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),

          // Color transitions back
          Animated.timing(backgroundColorAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(textColorAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),

          // Fade in button elements
          Animated.timing(iconOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onGoOffline();
        });
      } catch (error) {
        console.error('Inner animation error in animateToOffline:', error);
        // Fallback - just call onGoOffline directly
        onGoOffline();
      }
    } catch (error) {
      console.error('Animation error in animateToOffline:', error);
      // Fallback - just call onGoOffline directly
      onGoOffline();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: widthAnim,
          height: heightAnim,
          borderRadius: borderRadiusAnim,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.buttonTouchable}
        onPress={isOnline ? animateToOffline : animateToOnline}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        <View style={styles.buttonContent}>
          <Animated.View style={[styles.iconContainer, { opacity: iconOpacityAnim }]}>
            <Ionicons
              name={isOnline ? "pause" : "play"}
              size={32}
              color={isOnline ? "#FFFFFF" : "#00D4AA"}
            />
          </Animated.View>

          <Animated.View style={[styles.textContainer, { opacity: textOpacityAnim }]}>
            <Text style={[styles.buttonText, { color: textColor }]}>
              {isOnline ? 'Stop Earning' : 'Go Online'}
            </Text>
            {isOnline && (
              <Text style={[styles.floatText, { color: textColor }]}>
                Float: R{declaredFloat.toFixed(0)}
              </Text>
            )}
          </Animated.View>

          {isLoading && (
            <ActivityIndicator
              size="small"
              color={isOnline ? "#FFFFFF" : "#00D4AA"}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  floatText: {
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
    fontFamily: 'Poppins-Medium',
  },
});

export default SmoothTransitionButton;
