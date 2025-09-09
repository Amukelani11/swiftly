import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { formatCurrencySafe } from '../utils/format';

interface SmartFloatModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (floatAmount: number) => void;
  currentFloat: number;
  suggestedFloat: number;
  loading?: boolean;
}

const SmartFloatModal: React.FC<SmartFloatModalProps> = ({
  visible,
  onClose,
  onConfirm,
  currentFloat,
  suggestedFloat,
  loading = false,
}) => {
  const [floatAmount, setFloatAmount] = useState('');

  useEffect(() => {
    if (visible) {
      // Pre-populate with suggested amount
      setFloatAmount(suggestedFloat.toString());
    }
  }, [visible, suggestedFloat]);

  const handleConfirm = () => {
    const amount = parseFloat(floatAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (amount > 10000) {
      Alert.alert('High Amount', 'Please confirm this is the correct amount.');
    }

    onConfirm(amount);
  };

  const handleQuickAmount = (amount: number) => {
    setFloatAmount(amount.toString());
  };

  const formatAmount = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }

    return numericValue;
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatAmount(value);
    setFloatAmount(formatted);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[Colors.white, Colors.background.base]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="wallet" size={32} color="#00D4AA" />
              <Text style={styles.headerTitle}>Confirm Your Float</Text>
              <Text style={styles.headerSubtitle}>
                How much cash do you have available for orders?
              </Text>
            </View>
          </View>

          {/* Smart Suggestion */}
          {suggestedFloat > 0 && (
            <View style={styles.suggestionContainer}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>Smart Suggestion</Text>
                <Text style={styles.suggestionText}>
                  Based on your recent earnings, you might have{' '}
                  <Text style={styles.suggestionAmount}>
                    {formatCurrencySafe(suggestedFloat)}
                  </Text>{' '}
                  available.
                </Text>
                <TouchableOpacity
                  style={styles.useSuggestionButton}
                  onPress={() => handleQuickAmount(suggestedFloat)}
                >
                  <Text style={styles.useSuggestionText}>Use This Amount</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Available Float</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>R</Text>
              <TextInput
                style={styles.amountInput}
                value={floatAmount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="numeric"
                maxLength={8}
                editable={!loading}
              />
            </View>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.quickAmountsLabel}>Quick Amounts</Text>
            <View style={styles.quickAmountsGrid}>
              {[50, 100, 200, 500, 1000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(amount)}
                  disabled={loading}
                >
                  <Text style={styles.quickAmountText}>
                    {formatCurrencySafe(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#00D4AA" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How does this work?</Text>
              <Text style={styles.infoText}>
                This amount helps us show you orders you can actually fulfill.
                You can update it anytime based on your available cash.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={loading || !floatAmount.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Go Online</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Poppins-Regular',
  },

  suggestionContainer: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  suggestionAmount: {
    color: '#00D4AA',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  useSuggestionButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  useSuggestionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },

  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  currencySymbol: {
    fontSize: 20,
    color: Colors.text.secondary,
    marginLeft: 16,
    marginRight: 8,
    fontFamily: 'Poppins-Medium',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    color: Colors.text.primary,
    paddingVertical: 16,
    paddingRight: 16,
    fontFamily: 'Poppins-Bold',
  },

  quickAmountsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickAmountsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    width: '30%',
    backgroundColor: Colors.background.base,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  quickAmountText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },

  infoContainer: {
    backgroundColor: '#F0FDF9',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  infoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    fontFamily: 'Poppins-Regular',
  },

  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background.base,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default SmartFloatModal;


