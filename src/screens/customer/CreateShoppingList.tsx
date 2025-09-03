import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Colors } from '../../styles/theme';
import { formatCurrencySafe } from '../../utils/format';

type CreateShoppingListNavigationProp = StackNavigationProp<RootStackParamList, 'CreateShoppingList'>;

interface Props {
  navigation: CreateShoppingListNavigationProp;
}

interface ShoppingItem {
  id: string;
  text: string;
  quantity: number;
  notes?: string;
}

interface Store {
  id: string;
  name: string;
  distance: number;
  rating: number;
  image: string;
}

const { width } = Dimensions.get('window');

// Mock data for stores
const mockStores: Store[] = [
  { id: '1', name: 'Checkers', distance: 2.1, rating: 4.2, image: '🏪' },
  { id: '2', name: 'Pick n Pay', distance: 3.8, rating: 4.5, image: '🛒' },
  { id: '3', name: 'Woolworths', distance: 4.2, rating: 4.7, image: '🏬' },
  { id: '4', name: 'Spar', distance: 1.5, rating: 3.8, image: '🏪' },
];

const CreateShoppingList: React.FC<Props> = ({ navigation }) => {
  const [shoppingText, setShoppingText] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [notes, setNotes] = useState('');

  // Smart complexity detection
  const detectComplexity = useCallback((text: string) => {
    const keywords = {
      heavy: ['5kg', 'dog food', 'cat food', 'water', 'bottled water', 'rice', 'flour', 'sugar', 'salt', 'heavy'],
      bulky: ['bulk', 'large', 'big', 'pack', 'case', 'crate', 'bag'],
      fragile: ['eggs', 'glass', 'fragile', 'breakable', 'wine', 'alcohol'],
      multiStore: ['and', 'plus', 'also', 'as well', 'in addition'],
    };

    const lowerText = text.toLowerCase();
    const complexity = {
      isHeavy: keywords.heavy.some(k => lowerText.includes(k)),
      isBulky: keywords.bulky.some(k => lowerText.includes(k)),
      isFragile: keywords.fragile.some(k => lowerText.includes(k)),
      needsMultiStore: keywords.multiStore.some(k => lowerText.includes(k)),
    };

    return complexity;
  }, []);

  const parseShoppingText = useCallback(() => {
    if (!shoppingText.trim()) return;

    const lines = shoppingText.split('\n').filter(line => line.trim());
    const newItems: ShoppingItem[] = lines.map((line, index) => {
      const trimmed = line.trim();
      // Extract quantity if present (e.g., "2x Milk", "5kg Rice")
      const quantityMatch = trimmed.match(/^(\d+)[x\s]*(.+)$/i);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      const text = quantityMatch ? quantityMatch[2].trim() : trimmed;

      return {
        id: `item_${Date.now()}_${index}`,
        text,
        quantity,
        notes: detectComplexity(text).isHeavy ? 'Heavy item - extra care needed' : undefined,
      };
    });

    setItems(prev => [...prev, ...newItems]);
    setShoppingText('');
  }, [shoppingText, detectComplexity]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const calculateFees = useCallback(() => {
    const baseCommuteFee = 40;
    let surcharge = 0;

    if (items.length > 25) {
      surcharge = 30;
    } else if (items.length > 10) {
      surcharge = 15;
    }

    // Add complexity surcharges
    const hasHeavyItems = items.some(item =>
      detectComplexity(item.text).isHeavy ||
      item.text.toLowerCase().includes('heavy') ||
      item.text.toLowerCase().includes('5kg') ||
      item.text.toLowerCase().includes('dog food')
    );

    if (hasHeavyItems) {
      surcharge += 10;
    }

    return { commuteFee: baseCommuteFee, surcharge, total: baseCommuteFee + surcharge };
  }, [items, detectComplexity]);

  const handleStoreSelect = useCallback((storeId: string) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (items.length === 0) {
      Alert.alert('Add Items', 'Please add at least one item to your shopping list.');
      return;
    }

    if (selectedStores.length === 0) {
      Alert.alert('Select Store', 'Please select at least one store.');
      return;
    }

    const fees = calculateFees();

    navigation.navigate('OrderTracking', {
      taskId: 'new_task_' + Date.now(),
      task: {
        items,
        stores: selectedStores,
        deliveryAddress,
        deliveryTime,
        notes,
        fees,
      }
    });
  }, [items, selectedStores, deliveryAddress, deliveryTime, notes, calculateFees, navigation]);

  const fees = calculateFees();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Shopping List</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Smart List Builder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What do you need?</Text>
            <Text style={styles.sectionSubtitle}>
              Type your items one per line, or use voice input
            </Text>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Milk&#10;Bread&#10;5kg Dog food&#10;Shampoo"
                placeholderTextColor={Colors.text.tertiary}
                value={shoppingText}
                onChangeText={setShoppingText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputActions}>
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => Alert.alert('Voice Input', 'Voice input coming soon!')}
              >
                <Text style={styles.voiceIcon}>🎤</Text>
                <Text style={styles.voiceText}>Voice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={parseShoppingText}
                disabled={!shoppingText.trim()}
              >
                <Text style={styles.addButtonText}>Add Items</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items List */}
          {items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your List ({items.length} items)</Text>

              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemText}>
                        {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.text}
                      </Text>
                      {item.notes && (
                        <Text style={styles.itemNote}>{item.notes}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.id)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Store Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Stores</Text>
            <Text style={styles.sectionSubtitle}>Select where to shop</Text>

            <View style={styles.storesGrid}>
              {mockStores.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeCard,
                    selectedStores.includes(store.id) && styles.storeCardSelected,
                  ]}
                  onPress={() => handleStoreSelect(store.id)}
                >
                  <Text style={styles.storeIcon}>{store.image}</Text>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeDistance}>{store.distance}km away</Text>
                  <View style={styles.storeRating}>
                    <Text style={styles.ratingText}>⭐ {store.rating}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Delivery Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Delivery Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Preferred Time</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => Alert.alert('Time Picker', 'Time picker coming soon!')}
              >
                <Text style={deliveryTime ? styles.inputText : styles.inputPlaceholder}>
                  {deliveryTime || 'Select delivery time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Special instructions, brand preferences..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Fee Summary */}
          <View style={styles.feeSummary}>
            <Text style={styles.feeTitle}>Fee Summary</Text>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Commute Fee</Text>
              <Text style={styles.feeValue}>{formatCurrencySafe(fees.commuteFee)}</Text>
            </View>

            {fees.surcharge > 0 && (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Complexity Surcharge</Text>
                <Text style={styles.feeValue}>{formatCurrencySafe(fees.surcharge)}</Text>
              </View>
            )}

            <View style={[styles.feeRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Upfront</Text>
              <Text style={styles.totalValue}>{formatCurrencySafe(fees.total)}</Text>
            </View>

            <Text style={styles.feeNote}>
              This fee compensates your provider for traveling to the store.
              Refunded if you cancel before a provider accepts.
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (items.length === 0 || selectedStores.length === 0) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={items.length === 0 || selectedStores.length === 0}
          >
            <Text style={styles.submitButtonText}>
              Pay R{fees.total} & Post Request
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    fontWeight: 'bold',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  textInputContainer: {
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
  },
  voiceIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  voiceText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  addButtonText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
  },
  itemsList: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  itemNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.warning,
    marginTop: Spacing.xs,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: 'bold',
  },
  storesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storeCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  storeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  storeIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  storeName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  storeDistance: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  storeRating: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  ratingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.secondary,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputText: {
    color: Colors.text.primary,
  },
  inputPlaceholder: {
    color: Colors.text.tertiary,
  },
  feeSummary: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  feeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  feeLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  feeValue: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  totalValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
  },
  feeNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  disabledButton: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
});

export default CreateShoppingList;
