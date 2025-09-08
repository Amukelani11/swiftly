import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

type CreateShoppingListNavigationProp = StackNavigationProp<RootStackParamList, 'CreateShoppingList'>;

interface Props {
  navigation: CreateShoppingListNavigationProp;
}

interface ShoppingItem {
  id: string;
  text: string;
  quantity: number;
  notes?: string | undefined;
  allowSubstitute?: boolean;
  substituteNotes?: string;
}




const CreateShoppingList: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'CreateShoppingList'>>();
  const { selectedStore: selectedStoreParam } = route.params || {};
  const scrollRef = useRef<ScrollView>(null);
  const [shoppingText, setShoppingText] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productDebounceRef = useRef<any>(null);

  // Debug logging
  useEffect(() => {
    console.log('CreateShoppingList mounted with selectedStore:', !!selectedStoreParam);
  }, [selectedStoreParam]);


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
      const quantity = quantityMatch && quantityMatch[1] ? parseInt(quantityMatch[1]) : 1;
      const text = quantityMatch ? (quantityMatch[2]?.trim() || trimmed) : trimmed;

      return {
        id: `item_${Date.now()}_${index}`,
        text: text || 'Unnamed item',
        quantity,
        notes: detectComplexity(text)?.isHeavy ? 'Heavy item - extra care needed' : undefined,
        allowSubstitute: false,
        substituteNotes: '',
      };
    });

    setItems(prev => [...prev, ...newItems]);
    setShoppingText('');
  }, [shoppingText, detectComplexity]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const setItemSubstituteAllowed = useCallback((id: string, value: boolean) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, allowSubstitute: value } : it));
  }, []);

  const setItemSubstituteNotes = useCallback((id: string, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, substituteNotes: value } : it));
  }, []);

  const setItemText = useCallback((id: string, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, text: value } : it));
  }, []);

  const incQty = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: (it.quantity || 1) + 1 } : it));
  }, []);

  const decQty = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(1, (it.quantity || 1) - 1) } : it));
  }, []);

  const addNewItem = useCallback(() => {
    const newItem: ShoppingItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      text: '',
      quantity: 1,
      allowSubstitute: false,
      substituteNotes: '',
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  // Product suggestions (debounced)
  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    if (!shoppingText || shoppingText.trim().length < 2) {
      setProductSuggestions([]);
      return;
    }
    productDebounceRef.current = setTimeout(async () => {
      try {
        setLoadingProducts(true);
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: { path: 'shopping-search', params: { q: shoppingText.trim(), num: 6, gl: 'za' } },
        });
        if (error) throw error;
        setProductSuggestions(data?.items || []);
      } catch (e) {
        console.log('product search failed', e);
        setProductSuggestions([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 300);
    return () => productDebounceRef.current && clearTimeout(productDebounceRef.current);
  }, [shoppingText]);

  const handlePickSuggestion = useCallback((p: any) => {
    const title: string = p?.title || shoppingText.trim();
    const brand: string | undefined = p?.brand;
    const size: string | undefined = p?.size;
    const imageUrl: string | undefined = p?.imageUrl;
    const newItem: ShoppingItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      text: title,
      quantity: 1,
      allowSubstitute: true,
      substituteNotes: '',
    };
    // We can persist metadata alongside in a parallel map if needed; for now keep display-friendly text
    setItems(prev => [newItem, ...prev]);
    setShoppingText('');
    setProductSuggestions([]);
  }, [shoppingText]);


  const handleContinue = useCallback(() => {

    // First, check if we have any items
    if (items.length === 0) {
      Alert.alert('Add Items', 'Please add at least one item to your shopping list.');
      return;
    }

    // If we came from home with a selected store, go directly to delivery details
    if (selectedStoreParam) {
      navigation.navigate('DeliveryDetails' as never, {
        items,
        stores: [String((selectedStoreParam as any)?.id ?? '')],
        selectedStore: selectedStoreParam,
      } as never);
      return;
    }

    // Otherwise, go to store selection
    navigation.navigate('StoreSelection', {
      items,
    });
  }, [items, selectedStoreParam, navigation]);

  const handleAddAnotherStore = useCallback(() => {
    // Navigate to store selection with the current selected store already included
    navigation.navigate('StoreSelection', {
      items,
      selectedStore: selectedStoreParam, // Pass along the pre-selected store
    });
  }, [items, selectedStoreParam, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={scrollRef}
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
            <Text style={styles.title}>
              {selectedStoreParam ? `Shopping at ${selectedStoreParam.name}` : 'Create Shopping List'}
            </Text>
            <View style={styles.placeholder} />
          </View>


          {/* Smart List Builder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What do you need?</Text>
            <Text style={styles.sectionSubtitle}>
              Add items to your shopping list
            </Text>

            {/* Quick Add Section */}
          <View style={styles.quickAddContainer}>
            <View style={styles.quickAddInputContainer}>
              <TextInput
                style={styles.quickAddInput}
                placeholder="Type item name..."
                placeholderTextColor={Colors.text.tertiary}
                value={shoppingText}
                onChangeText={setShoppingText}
                onSubmitEditing={parseShoppingText}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.quickAddBtn}
                onPress={parseShoppingText}
                disabled={!shoppingText.trim()}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Product suggestions - horizontal carousel */}
            {loadingProducts && (
              <View style={styles.suggestLoading}><Text style={{ color: Colors.text.secondary }}>Searching products…</Text></View>
            )}
            {!loadingProducts && productSuggestions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.suggestCarousel}
                contentContainerStyle={styles.suggestCarouselContent}
              >
                {productSuggestions.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.suggestCard} onPress={() => handlePickSuggestion(p)} activeOpacity={0.85}>
                    {p.imageUrl ? (
                      <Image
                        source={{ uri: p.imageUrl }}
                        style={styles.suggestCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.suggestCardImage, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={22} color={Colors.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.suggestCardInfo}>
                      <Text style={styles.suggestCardTitle} numberOfLines={2}>{p.title}</Text>
                      <Text style={styles.suggestCardMeta} numberOfLines={1}>
                        {[p.brand, p.size].filter(Boolean).join(' • ') || 'Product'}
                      </Text>
                      {p.price ? (
                        <Text style={styles.suggestCardPrice} numberOfLines={1}>
                          {p.currency ? `${p.currency} ` : ''}{p.price}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

              <View style={styles.quickAddActions}>
                <TouchableOpacity
                  style={styles.voiceButton}
                  onPress={() => Alert.alert('Voice Input', 'Voice input coming soon!')}
                >
                  <Text style={styles.voiceIcon}>🎤</Text>
                  <Text style={styles.voiceText}>Voice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bulkAddButton}
                  onPress={() => Alert.alert('Bulk Add', 'Type multiple items (one per line) and tap the + button')}
                >
                  <Text style={styles.bulkAddText}>Bulk Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.section}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                Your List ({items.length} {items.length === 1 ? 'item' : 'items'})
              </Text>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={addNewItem}
              >
                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🛒</Text>
                <Text style={styles.emptyStateTitle}>No items yet</Text>
                <Text style={styles.emptyStateText}>Tap "Add Item" or type above to start your list</Text>
              </View>
            ) : (
              <>
                {/* Bulk Substitution Toggle */}
                <View style={styles.bulkRow}>
                  <View style={styles.subSwitchRow}>
                    <Switch
                      value={items.length > 0 && items.every(i => !!i.allowSubstitute)}
                      onValueChange={(v) => setItems(prev => prev.map(it => ({ ...it, allowSubstitute: v })))}
                      trackColor={{ false: '#d1d5db', true: '#80d8e1' }}
                      thumbColor={(items.length > 0 && items.every(i => !!i.allowSubstitute)) ? Colors.primary : '#f4f3f4'}
                    />
                    <Text style={styles.subLabel}>Allow substitutes for all items</Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemContent}>
                        <TextInput
                          value={item.text}
                          onChangeText={(t) => setItemText(item.id, t)}
                          placeholder="Item name"
                          placeholderTextColor={Colors.text.tertiary}
                          style={styles.itemTextInput}
                        />
                        {item.notes && !selectedStoreParam && (
                          <Text style={styles.itemNote}>{item.notes}</Text>
                        )}
                      </View>

                      <View style={styles.itemControls}>
                        <View style={styles.qtyControls}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => decQty(item.id)}>
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity || 1}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => incQty(item.id)}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Compact substitute toggle pill */}
                        <TouchableOpacity
                          style={[styles.subPill, item.allowSubstitute && styles.subPillOn]}
                          onPress={() => setItemSubstituteAllowed(item.id, !item.allowSubstitute)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={item.allowSubstitute ? 'checkmark-circle' : 'swap-horizontal-outline'}
                            size={14}
                            color={item.allowSubstitute ? Colors.white : Colors.primary}
                          />
                          <Text style={[styles.subPillText, item.allowSubstitute && styles.subPillTextOn]}>Substitute</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeItem(item.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color={Colors.white} />
                        </TouchableOpacity>
                      </View>

                      {/* Substitution controls */}
                      <View style={styles.subControlsWrap}>
                        {item.allowSubstitute && (
                          <TextInput
                            style={styles.subInput}
                            placeholder="Substitution notes (optional): any brand, similar size, etc."
                            placeholderTextColor={Colors.text.tertiary}
                            value={item.substituteNotes || ''}
                            onChangeText={(t) => setItemSubstituteNotes(item.id, t)}
                          />
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>


          {/* Removed: informational banner */}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {selectedStoreParam ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  items.length === 0 && styles.disabledButton,
                ]}
                onPress={handleContinue}
                disabled={items.length === 0}
              >
                <Text style={[
                  styles.secondaryButtonText,
                  items.length === 0 && { color: '#999' }
                ]}>
                  Continue to Delivery
                </Text>
                <Ionicons name="chevron-forward" size={18} color={items.length === 0 ? '#999' : Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddAnotherStore}
              >
                <Ionicons name="add-circle" size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>
                  Add Another Store
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                items.length === 0 && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={items.length === 0}
            >
                              <Text style={[styles.submitButtonText, items.length === 0 && { color: '#999' }]}>
                  Next
                </Text>
            </TouchableOpacity>
          )}
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
  suggestList: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  suggestLeft: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  suggestThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  // New carousel styles
  suggestLoading: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  suggestCarousel: {
    marginTop: Spacing.sm,
  },
  suggestCarouselContent: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  suggestCard: {
    width: 140,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  suggestCardImage: {
    width: 140,
    height: 90,
    backgroundColor: Colors.background.secondary,
  },
  suggestCardInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  suggestCardTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
  },
  suggestCardMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  suggestCardPrice: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
  },
  suggestMiddle: {
    flex: 1,
  },
  suggestTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  suggestMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  suggestRight: {
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
  },
  suggestPrice: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  itemsList: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    fontSize: 0,
    fontWeight: 'bold',
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
    backgroundColor: '#E5E5E5',
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  // New button styles
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  // New styles for improved UI
  quickAddContainer: {
    marginBottom: Spacing.md,
  },
  quickAddInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quickAddInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingRight: 50,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  quickAddBtn: {
    position: 'absolute',
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkAddButton: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bulkAddText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  addItemText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  itemTextInput: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    flex: 1,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    gap: Spacing.sm,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  qtyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
  },
  qtyText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  // Continue section styles
  continueSection: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  continueText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  continueSubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  // Substitution controls
  subControlsWrap: {
    width: '100%',
    alignSelf: 'stretch',
    flexBasis: '100%',
    marginTop: Spacing.sm,
  },
  subSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  subPillOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  subPillTextOn: {
    color: Colors.white,
  },
  subLabel: {
    marginLeft: 8,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
  },
  subInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
  },
  bulkRow: {
    marginBottom: Spacing.md,
  },
  selectedStoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  selectedStoreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  selectedStoreIcon: {
    fontSize: 18,
  },
  selectedStoreName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  selectedStoreMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  selectedStoreDot: {
    color: Colors.text.tertiary,
  },
  changeStoreBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    alignSelf: 'center',
    marginLeft: Spacing.md,
  },
  changeStoreText: {
    color: Colors.white,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
});

export default CreateShoppingList;


