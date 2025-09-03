import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';
import { Colors } from '../styles/theme';
import type { CmsSection, CmsPageContent } from '../types/cms';
import supabase from '../lib/supabase';

type CmsDashboardEditorNavigationProp = StackNavigationProp<RootStackParamList, 'CmsDashboardEditor'>;

interface Props {
  navigation: CmsDashboardEditorNavigationProp;
}

const { width } = Dimensions.get('window');
const BOTTOM_NAV_HEIGHT = 84;

// Available section types for the CMS
const SECTION_TYPES = [
  { key: 'categories', label: 'Categories', icon: 'grid', color: '#3B82F6' },
  { key: 'promotions', label: 'Promotions', icon: 'gift', color: '#EF4444' },
  { key: 'stores', label: 'Stores', icon: 'storefront', color: '#10B981' },
  { key: 'banners', label: 'Banners', icon: 'image', color: '#F59E0B' },
  { key: 'text', label: 'Text Block', icon: 'document-text', color: '#8B5CF6' },
];

// Available layouts for sections
const LAYOUT_OPTIONS = [
  { key: 'list', label: 'List', icon: 'list' },
  { key: 'grid', label: 'Grid', icon: 'grid' },
  { key: 'carousel', label: 'Carousel', icon: 'albums' },
  { key: 'pills', label: 'Pills', icon: 'radio-button-on' },
  { key: 'banner', label: 'Banner', icon: 'image' },
  { key: 'text', label: 'Text', icon: 'document-text' },
];

const CmsDashboardEditor: React.FC<Props> = ({ navigation }) => {
  const [cmsSections, setCmsSections] = useState<CmsSection[]>([]);
  const [pageTitle, setPageTitle] = useState('Customer Dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CmsSection | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSectionForBanner, setSelectedSectionForBanner] = useState<string | null>(null);

  // Load existing CMS configuration
  useEffect(() => {
    loadCmsConfiguration();
  }, []);

  const loadCmsConfiguration = async () => {
    try {
      // Load from local storage first for immediate feedback
      const saved = await loadFromStorage();
      if (saved) {
        setCmsSections(saved.sections || []);
        setPageTitle(saved.title || 'Customer Dashboard');
        return;
      }

      // Try to load from server
      const response = await fetch('http://10.0.2.2:3000/api/cms/pages/customer_dashboard');
      if (response.ok) {
        const data = await response.json();
        const content: CmsPageContent = data?.page?.content || {};
        setCmsSections(content.sections || []);
      }
    } catch (error) {
      console.error('Error loading CMS config:', error);
    }
  };

  const loadFromStorage = async (): Promise<{title: string, sections: CmsSection[]} | null> => {
    try {
      // In a real app, you'd use AsyncStorage or similar
      return null;
    } catch {
      return null;
    }
  };

  const saveToStorage = async (title: string, sections: CmsSection[]) => {
    try {
      // In a real app, you'd save to AsyncStorage or similar
      console.log('Saving to storage:', { title, sections });
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const loadDemoConfiguration = () => {
    const demoSections: CmsSection[] = [
      {
        section_key: 'categories_demo',
        section_title: 'Browse Categories',
        section_type: 'categories',
        layout: 'pills',
        is_visible: true,
        sort_order: 0,
        max_items: 8,
      },
      {
        section_key: 'banners_demo',
        section_title: 'Featured Offers',
        section_type: 'banners',
        layout: 'carousel',
        is_visible: true,
        sort_order: 1,
        banners: [
          {
            id: 'banner_1',
            title: 'Summer Sale',
            image_url: 'https://via.placeholder.com/400x200/FF6B6B/FFFFFF?text=Summer+Sale',
            link_url: '',
          },
          {
            id: 'banner_2',
            title: 'Free Delivery',
            image_url: 'https://via.placeholder.com/400x200/4ECDC4/FFFFFF?text=Free+Delivery',
            link_url: '',
          },
        ],
      },
      {
        section_key: 'stores_demo',
        section_title: 'Popular Stores',
        section_type: 'stores',
        layout: 'grid',
        is_visible: true,
        sort_order: 2,
        max_items: 6,
      },
      {
        section_key: 'promotions_demo',
        section_title: 'Special Deals',
        section_type: 'promotions',
        layout: 'carousel',
        is_visible: true,
        sort_order: 3,
        max_items: 5,
      },
      {
        section_key: 'text_demo',
        section_title: 'Welcome Message',
        section_type: 'text',
        layout: 'text',
        is_visible: true,
        sort_order: 4,
        text_content: 'Welcome to Swiftly! Discover amazing stores and great deals in your area. Order food, groceries, and more with fast delivery.',
      },
    ];

    setCmsSections(demoSections);
    setPageTitle('Swiftly - Your Local Marketplace');
  };

  const saveCmsConfiguration = async () => {
    setSaving(true);
    try {
      const content: CmsPageContent = {
        sections: cmsSections,
      };

      const response = await fetch('http://10.0.2.2:3000/api/cms/pages/customer_dashboard', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          title: pageTitle,
        }),
      });

      if (response.ok) {
        await saveToStorage(pageTitle, cmsSections);
        Alert.alert('Success', 'CMS configuration saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving CMS config:', error);
      Alert.alert('Error', 'Failed to save CMS configuration');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (sectionType: string) => {
    const newSection: CmsSection = {
      section_key: `${sectionType}_${Date.now()}`,
      section_title: `${SECTION_TYPES.find(s => s.key === sectionType)?.label || 'New Section'}`,
      section_type: sectionType as any,
      layout: 'list',
      is_visible: true,
      sort_order: cmsSections.length,
      max_items: 10,
    };

    setCmsSections(prev => [...prev, newSection]);
  };

  const addBannerToSection = (sectionKey: string) => {
    // For now, just add a placeholder banner
    const banner = {
      id: `banner_${Date.now()}`,
      title: 'New Banner',
      image_url: 'https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=Banner',
      link_url: '',
    };

    setCmsSections(prev => prev.map(section => {
      if (section.section_key === sectionKey) {
        const banners = section.banners || [];
        return {
          ...section,
          banners: [...banners, banner],
        };
      }
      return section;
    }));

    setSelectedSectionForBanner(null);
  };

  const removeBanner = (sectionKey: string, bannerId: string) => {
    setCmsSections(prev => prev.map(section => {
      if (section.section_key === sectionKey) {
        return {
          ...section,
          banners: (section.banners || []).filter(b => b.id !== bannerId),
        };
      }
      return section;
    }));
  };

  const updateSection = (index: number, updates: Partial<CmsSection>) => {
    setCmsSections(prev => prev.map((section, i) =>
      i === index ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (index: number) => {
    Alert.alert(
      'Delete Section',
      'Are you sure you want to delete this section?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCmsSections(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    setCmsSections(prev => {
      const newSections = [...prev];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);

      // Update sort_order
      return newSections.map((section, index) => ({
        ...section,
        sort_order: index,
      }));
    });
  };

  const renderSectionTypeIcon = (sectionType: string) => {
    const section = SECTION_TYPES.find(s => s.key === sectionType);
    return section ? section.icon : 'square';
  };

  const renderLayoutIcon = (layout: string) => {
    const layoutOption = LAYOUT_OPTIONS.find(l => l.key === layout);
    return layoutOption ? layoutOption.icon : 'square';
  };

  const renderSectionEditor = ({ item, index, drag, isActive }: RenderItemParams<CmsSection>) => (
    <View style={[styles.sectionCard, isActive && styles.sectionCardDragging]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={[styles.sectionTypeIcon, {
            backgroundColor: SECTION_TYPES.find(s => s.key === item.section_type)?.color + '20' || '#E5E7EB'
          }]}>
            <Ionicons
              name={renderSectionTypeIcon(item.section_type || 'square') as any}
              size={20}
              color={SECTION_TYPES.find(s => s.key === item.section_type)?.color || '#6B7280'}
            />
          </View>
          <View style={styles.sectionInfo}>
            <TextInput
              style={styles.sectionTitleInput}
              value={item.section_title}
              onChangeText={(text) => updateSection(index, { section_title: text })}
              placeholder="Section Title"
            />
            <View style={styles.sectionMeta}>
              <Text style={styles.sectionType}>{item.section_type}</Text>
              <Text style={styles.metaSeparator}>·</Text>
              <Text style={styles.layoutType}>{item.layout}</Text>
              <Text style={styles.metaSeparator}>·</Text>
              <Text style={styles.maxItems}>{item.max_items} items</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateSection(index, { is_visible: !item.is_visible })}
          >
            <Ionicons
              name={item.is_visible ? 'eye' : 'eye-off'}
              size={18}
              color={item.is_visible ? '#10B981' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Layout picker */}}
          >
            <Ionicons name={renderLayoutIcon(item.layout || 'list') as any} size={18} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteSection(index)}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dragHandle} onLongPress={drag} disabled={isActive}>
            <Ionicons name="menu" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {item.section_type === 'banners' && (
        <View style={styles.bannerSection}>
          <Text style={styles.bannerTitle}>Banner Images ({(item.banners || []).length})</Text>
          {(item.banners || []).map((banner, bannerIndex) => (
            <View key={banner.id} style={styles.bannerItem}>
              <Image source={{ uri: banner.image_url }} style={styles.bannerPreview} />
              <View style={styles.bannerInfo}>
                <TextInput
                  style={styles.bannerTitleInput}
                  value={banner.title}
                  onChangeText={(text) => {
                    const updatedBanners = [...(item.banners || [])];
                    updatedBanners[bannerIndex] = { ...banner, title: text };
                    updateSection(index, { banners: updatedBanners });
                  }}
                  placeholder="Banner title"
                />
                <TextInput
                  style={styles.bannerLinkInput}
                  value={banner.link_url}
                  onChangeText={(text) => {
                    const updatedBanners = [...(item.banners || [])];
                    updatedBanners[bannerIndex] = { ...banner, link_url: text };
                    updateSection(index, { banners: updatedBanners });
                  }}
                  placeholder="Link URL (optional)"
                />
              </View>
              <TouchableOpacity
                style={styles.removeBannerButton}
                onPress={() => removeBanner(item.section_key, banner.id)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBannerButton}
            onPress={() => addBannerToSection(item.section_key)}
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text style={styles.addBannerText}>Add Banner</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.section_type === 'text' && (
        <View style={styles.textSection}>
          <TextInput
            style={styles.textContentInput}
            multiline
            placeholder="Enter your text content here..."
            value={item.text_content || ''}
            onChangeText={(text) => updateSection(index, { text_content: text })}
          />
        </View>
      )}
    </View>
  );

  const renderAddSectionButton = ({ item }: { item: typeof SECTION_TYPES[0] }) => (
    <TouchableOpacity
      style={[styles.addSectionCard, { borderColor: item.color }]}
      onPress={() => addSection(item.key)}
    >
      <View style={[styles.addSectionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text style={[styles.addSectionLabel, { color: item.color }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (previewMode) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 0 : 0 }]}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setPreviewMode(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Preview</Text>
          <TouchableOpacity onPress={saveCmsConfiguration} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewContainer}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          {cmsSections
            .filter(section => section.is_visible)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((section, index) => (
              <View key={section.section_key} style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>{section.section_title}</Text>
                <View style={styles.previewSectionContent}>
                  <Text style={styles.previewPlaceholder}>
                    {section.section_type} section - {section.layout} layout
                  </Text>
                </View>
              </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 0 : 0 }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TextInput
            style={styles.pageTitleInput}
            value={pageTitle}
            onChangeText={setPageTitle}
            placeholder="Page Title"
          />
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setPreviewMode(true)}
            style={styles.previewButton}
          >
            <Ionicons name="eye" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={loadDemoConfiguration}
            style={styles.demoButton}
          >
            <Ionicons name="flask" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveCmsConfiguration}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionHeading}>Add New Section</Text>
        <FlatList
          horizontal
          data={SECTION_TYPES}
          renderItem={renderAddSectionButton}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.addSectionList}
        />

        <Text style={styles.sectionHeading}>Sections ({cmsSections.length})</Text>

        {cmsSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No sections yet</Text>
            <Text style={styles.emptyText}>Add sections above to build your dashboard</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={cmsSections}
            renderItem={renderSectionEditor}
            keyExtractor={(item) => item.section_key}
            onDragEnd={({ data }) => {
              setCmsSections(data.map((section, index) => ({
                ...section,
                sort_order: index,
              })));
            }}
            contentContainerStyle={styles.sectionsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      <BottomNavigation activeTab="profile" userType="customer" onTabPress={() => {}} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  pageTitleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins-SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewButton: {
    padding: 8,
    marginRight: 8,
  },
  demoButton: {
    padding: 8,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  addSectionList: {
    paddingVertical: 8,
  },
  addSectionCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  addSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionsList: {
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCardDragging: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionType: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },
  layoutType: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },
  maxItems: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins-Regular',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 4,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  deleteButton: {
    marginLeft: 8,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 8,
  },
  bannerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bannerPreview: {
    width: 60,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitleInput: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  bannerLinkInput: {
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeBannerButton: {
    padding: 4,
    marginLeft: 8,
  },
  addBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addBannerText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  textSection: {
    marginTop: 16,
  },
  textContentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  previewSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewSectionContent: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  previewPlaceholder: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default CmsDashboardEditor;
