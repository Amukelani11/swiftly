import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import BulkUploadStores from '@/components/BulkUploadStores';
import ImageUploader from '@/components/ImageUploader';

// Define types inline for admin panel compatibility
interface CmsSection {
  section_key: string;
  section_title?: string;
  section_type?: 'categories' | 'promotions' | 'stores' | 'category-stores' | 'banners' | 'text';
  layout?: 'list' | 'grid' | 'carousel' | 'pills' | 'banner' | 'text';
  is_visible?: boolean;
  sort_order?: number;
  max_items?: number;
  banners?: CmsBanner[];
  text_content?: string;
  title_suggestions?: string[]; // For title suggestions

  // Location-based filtering for stores
  use_location_filter?: boolean;
  location_radius_km?: number; // Default radius in kilometers
  sort_by_distance?: boolean; // Sort by proximity instead of other criteria

  // Categories selection for categories sections
  selected_categories?: string[]; // Selected categories to display

  // Single category selection for category-stores sections
  selected_category?: string; // Single category for category stores section
}

interface CmsBanner {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  banner_image_url?: string;
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  province?: string;
  rating: number;
  review_count: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
  is_featured: boolean;
  is_active: boolean;
  operating_hours?: string;
  created_at: string;
  updated_at: string;
}

interface CmsPageContent {
  sections?: CmsSection[];
}

interface Props {
  navigation?: any; // Optional for admin panel compatibility
  onBulkUploadComplete?: () => void; // Callback for when bulk upload completes
}

// Available section types for the CMS
const SECTION_TYPES = [
  { key: 'categories', label: 'Categories', icon: 'grid', color: '#3B82F6' },
  { key: 'promotions', label: 'Promotions', icon: 'gift', color: '#EF4444' },
  { key: 'stores', label: 'Stores', icon: 'storefront', color: '#10B981' },
  { key: 'category-stores', label: 'Category Stores', icon: 'shopping-bag', color: '#06B6D4' },
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

const InteractiveCmsEditor: React.FC<Props> = ({ navigation, onBulkUploadComplete }) => {
  const [cmsSections, setCmsSections] = useState<CmsSection[]>([]);
  const [pageTitle, setPageTitle] = useState('Customer Dashboard');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load existing CMS configuration and stores
  useEffect(() => {
    loadCmsConfiguration();
    loadStores();
  }, []);



  // Debug stores table
  const debugStoresTable = async () => {
    try {
      console.log('🔍 CMS Editor: Running stores table debug...');
      const response = await fetch('/api/dashboard/debug-stores');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔍 CMS Editor: Debug failed:', errorData);
        alert(`Debug failed: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      console.log('🔍 CMS Editor: Debug results:', data);

      let message = data.message || 'Debug complete - check console for details';

      if (data.error) {
        message = `❌ Error: ${data.error}\n\n${data.suggestion || ''}`;
        if (data.availableTables) {
          message += `\n\nAvailable tables: ${data.availableTables.map((t: any) => t.table_name).join(', ')}`;
        }
      } else if (data.analysis) {
        console.log('🔍 Stores Analysis:');
        console.log(`  - Total stores: ${data.analysis.totalStores}`);
        console.log(`  - Has category field: ${data.analysis.hasCategoryField}`);
        console.log(`  - Stores with categories: ${data.analysis.storesWithCategories}`);
        console.log(`  - Categories found: ${data.analysis.categoriesFound.length}`);
        console.log(`  - Categories: ${data.analysis.categoriesFound.join(', ')}`);

        if (data.nextSteps) {
          message += '\n\n📋 Next Steps:\n' + data.nextSteps.join('\n');
        }

        if (data.sqlQuery) {
          console.log('🔍 SQL Query for manual check:');
          console.log(data.sqlQuery);
        }
      }

      alert(message);

    } catch (error) {
      console.error('🔍 CMS Editor: Debug error:', error);
      alert('Debug failed - check console for details');
    }
  };

  // Load stores from database
  const loadStores = async () => {
    try {
      setLoadingStores(true);
      console.log('🏪 CMS Editor: Loading stores from database');

      const response = await fetch('/api/dashboard/stores');
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const data = await response.json();
      const storesData = data.stores || data;

      console.log(`🏪 CMS Editor: Loaded ${storesData.length} stores from database`);
      if (storesData.length > 0) {
        console.log(`🏪 CMS Editor: First store sample:`, storesData[0]);
        console.log(`🏪 CMS Editor: Store keys:`, Object.keys(storesData[0]));
        console.log(`🏪 CMS Editor: All store categories:`, storesData.map((s: any) => s.category));
      }
      setStores(storesData);

      // Extract unique categories from stores
      if (storesData.length === 0) {
        setCategories([]);
        return;
      }

      const categoriesSet = new Set(
        storesData
          .map((store: any) => store.category)
          .filter((cat: any) => cat && typeof cat === 'string' && cat.trim().length > 0)
      );

      const uniqueCategories: string[] = Array.from(categoriesSet) as string[];
      console.log(`🏪 CMS Editor: Extracted ${uniqueCategories.length} categories:`, uniqueCategories);
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('🏪 CMS Editor: Error loading stores:', error);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadCmsConfiguration = async () => {
    try {
      const response = await fetch('/api/cms/pages/customer_dashboard');
      if (response.ok) {
        const data = await response.json();
        const content: CmsPageContent = data?.page?.content || {};
        setCmsSections(content.sections || []);
      }
    } catch (error) {
      console.error('Error loading CMS config:', error);
    }
  };

  const saveCmsConfiguration = async () => {
    setSaving(true);
    try {
      const content: CmsPageContent = {
        sections: cmsSections,
      };

      const response = await fetch('/api/cms/pages/customer_dashboard', {
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
        alert('CMS configuration saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving CMS config:', error);
      alert('Failed to save CMS configuration');
    } finally {
      setSaving(false);
    }
  };

  // Predefined title suggestions for different section types
  const getTitleSuggestions = (sectionType: string) => {
    const suggestions = {
      categories: [
        'Browse Categories',
        'Shop by Category',
        'Find What You Need',
        'Explore Categories',
        'What are you looking for?',
        'Choose a Category',
        'Discover More'
      ],
      promotions: [
        'Special Deals',
        'Today\'s Offers',
        'Featured Promotions',
        'Discounts & Offers',
        'Hot Deals',
        'Limited Time Offers',
        'Save Big Today',
        'Exclusive Offers'
      ],
      stores: [
        'Popular Stores',
        'Nearby Stores',
        'Recommended Stores',
        'Store Directory',
        'Stores Near You',
        'Local Favorites',
        'Top Rated Stores',
        'Featured Partners',
        'Your Favorite Spots'
      ],
      'category-stores': [
        'Pizza Places',
        'Coffee Shops',
        'Fast Food',
        'Restaurants',
        'Grocery Stores',
        'Pharmacies',
        'Gas Stations',
        'Banks',
        'Clothing Stores',
        'Electronics',
        'Bookstores',
        'Fitness Centers',
        'Beauty Salons',
        'Auto Services',
        'Pet Stores',
        'Hardware Stores',
        'Home & Garden',
        'Department Stores',
        'Convenience Stores',
        'Specialty Shops'
      ],
      banners: [
        'Featured Offers',
        'Special Announcements',
        'Hero Banners',
        'Promotional Content',
        'Breaking News',
        'Important Updates',
        'Seasonal Specials'
      ],
      text: [
        'Welcome Message',
        'About Us',
        'Important Notice',
        'Custom Content',
        'Welcome to Swiftly',
        'Get Started',
        'How It Works',
        'Important Information'
      ]
    };
    return suggestions[sectionType as keyof typeof suggestions] || ['Custom Section'];
  };

  const addSection = (sectionType: string) => {
    const suggestions = getTitleSuggestions(sectionType);
    const defaultTitle = suggestions[0] || `${SECTION_TYPES.find(s => s.key === sectionType)?.label || 'New Section'}`;

    const newSection: CmsSection = {
      section_key: `${sectionType}_${Date.now()}`,
      section_title: defaultTitle,
      section_type: sectionType as any,
      layout: 'list',
      is_visible: true,
      sort_order: cmsSections.length,
      max_items: 10,
      title_suggestions: suggestions, // Store suggestions for UI

      // Default location-based settings for stores
      use_location_filter: sectionType === 'stores' ? true : false,
      location_radius_km: 10, // Default 10km radius
      sort_by_distance: sectionType === 'stores' ? true : false,
    };

    setCmsSections(prev => [...prev, newSection]);
  };

  const updateSection = (index: number, updates: Partial<CmsSection>) => {
    setCmsSections(prev => prev.map((section, i) =>
      i === index ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (index: number) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setCmsSections(prev => prev.filter((_, i) => i !== index));
    }
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    setCmsSections(prev => {
      const newSections = [...prev];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);

      return newSections.map((section, index) => ({
        ...section,
        sort_order: index,
      }));
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    setDraggedIndex(null);

    if (dragIndex === null || dragIndex === dropIndex) return;

    moveSection(dragIndex, dropIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setPreviewMode(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              ← Back to Editor
            </button>
            <h1 className="text-2xl font-bold">Preview: {pageTitle}</h1>
            <button
              onClick={saveCmsConfiguration}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-4">
            {cmsSections
              .filter(section => section.is_visible)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((section, index) => (
                <div key={section.section_key} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">{section.section_title}</h3>
                  <div className="bg-gray-100 p-4 rounded">
                    <p className="text-gray-600">
                      {section.section_type} section • {section.layout} layout • {section.max_items} items
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interactive CMS Editor</h1>
              <p className="mt-1 text-sm text-gray-500">Build your customer dashboard with drag & drop</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setPreviewMode(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                👁️ Preview
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
              >
                📤 Bulk Upload
              </button>
              <button
                onClick={saveCmsConfiguration}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                {saving ? '💾 Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Title</label>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
            placeholder="Customer Dashboard"
          />
        </div>

        {/* Stores Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">🏪 Stores Database</h2>
            <button
              onClick={loadStores}
              disabled={loadingStores}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loadingStores ? '🔄 Loading...' : '🔄 Refresh Stores'}
            </button>
            <button
              onClick={debugStoresTable}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              🔍 Debug Stores
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{stores.length}</h3>
              <p className="text-sm text-gray-600">Total Stores</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-green-600">
                {stores.filter(store => store.is_active).length}
              </h3>
              <p className="text-sm text-gray-600">Active Stores</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-blue-600">
                {stores.filter(store => store.operating_hours).length}
              </h3>
              <p className="text-sm text-gray-600">With Hours</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-purple-600">
                {stores.filter(store => store.banner_image_url).length}
              </h3>
              <p className="text-sm text-gray-600">With Banners</p>
            </div>
          </div>

          {/* Recent Stores Preview */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Stores & Categories ({categories.length} categories)
            </h3>
            {categories.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Categories:</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 8).map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {category} ({stores.filter(store => store.category === category).length})
                    </span>
                  ))}
                  {categories.length > 8 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{categories.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Stores:</h4>
            {loadingStores ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading stores...</p>
              </div>
            ) : stores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.slice(0, 6).map((store) => (
                  <div key={store.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-xs">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          '🏪'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                        <p className="text-xs text-gray-500 truncate">{store.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {store.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {store.operating_hours && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          Has Hours
                        </span>
                      )}
                      {store.banner_image_url && (
                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                          Has Banner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🏪</div>
                <p className="text-lg font-medium">No stores found</p>
                <p className="text-sm">Add stores using the Bulk Upload button above</p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Section</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {SECTION_TYPES.map((sectionType) => (
              <button
                key={sectionType.key}
                onClick={() => addSection(sectionType.key)}
                className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors text-center"
                style={{ borderColor: sectionType.color + '80' }}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: sectionType.color + '20', color: sectionType.color }}
                >
                  {sectionType.icon === 'grid' ? '⊞' :
                   sectionType.icon === 'gift' ? '🎁' :
                   sectionType.icon === 'storefront' ? '🏪' :
                   sectionType.icon === 'shopping-bag' ? '🛒' :
                   sectionType.icon === 'image' ? '🖼️' :
                   sectionType.icon === 'document-text' ? '📄' : '□'}
                </div>
                <div className="font-medium" style={{ color: sectionType.color }}>
                  {sectionType.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sections List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sections ({cmsSections.length})</h2>

          {cmsSections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
              <p className="text-gray-500">Add sections above to build your dashboard</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cmsSections.map((section, index) => (
                <div
                  key={section.section_key}
                  className={`bg-white p-6 rounded-lg shadow transition-all duration-200 ${
                    draggedIndex === index
                      ? 'opacity-50 shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '3px solid #3B82F6';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderTop = 'none';
                  }}
                  onDrop={(e) => {
                    e.currentTarget.style.borderTop = 'none';
                    handleDrop(e, index);
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center flex-1">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4"
                        style={{
                          backgroundColor: SECTION_TYPES.find(s => s.key === section.section_type)?.color + '20',
                          color: SECTION_TYPES.find(s => s.key === section.section_type)?.color
                        }}
                      >
                        {SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'grid' ? '⊞' :
                         SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'gift' ? '🎁' :
                         SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'storefront' ? '🏪' :
                         SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'shopping-bag' ? '🛒' :
                         SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'image' ? '🖼️' :
                         SECTION_TYPES.find(s => s.key === section.section_type)?.icon === 'document-text' ? '📄' : '□'}
                      </div>
                      <div className="flex-1">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={section.section_title || ''}
                                onChange={(e) => updateSection(index, { section_title: e.target.value })}
                                className="w-full text-lg font-semibold border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                                placeholder="Enter a catchy section title..."
                              />
                              {section.section_type === 'category-stores' && section.selected_category && (
                                <div className="absolute -top-1 -right-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    💡 Editable
                                  </span>
                                </div>
                              )}
                            </div>
                            {section.title_suggestions && section.title_suggestions.length > 1 && (
                              <select
                                onChange={(e) => updateSection(index, { section_title: e.target.value })}
                                className="ml-3 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                              >
                                <option value="">💡 Suggestions</option>
                                {section.title_suggestions.slice(0, 6).map((suggestion: string, i: number) => (
                                  <option key={i} value={suggestion}>{suggestion}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Popular title presets */}
                          <div className="flex flex-wrap gap-2">
                            {section.section_type === 'stores' && (
                              <>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Stores Near You' })}
                                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                                >
                                  📍 Stores Near You
                                </button>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Your Favorites' })}
                                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
                                >
                                  ❤️ Your Favorites
                                </button>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Trending Now' })}
                                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium hover:bg-orange-200 transition-colors"
                                >
                                  🔥 Trending Now
                                </button>
                              </>
                            )}
                            {section.section_type === 'promotions' && (
                              <>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Today\'s Best Deals' })}
                                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
                                >
                                  💰 Today\'s Best Deals
                                </button>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Flash Sale' })}
                                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors"
                                >
                                  ⚡ Flash Sale
                                </button>
                              </>
                            )}
                            {section.section_type === 'categories' && (
                              <>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'What\'s Popular' })}
                                  className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium hover:bg-pink-200 transition-colors"
                                >
                                  📈 What's Popular
                                </button>
                                <button
                                  onClick={() => updateSection(index, { section_title: 'Quick Browse' })}
                                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium hover:bg-indigo-200 transition-colors"
                                >
                                  🚀 Quick Browse
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{section.section_type}</span>
                          <span className="mx-2">•</span>
                          <span>{section.layout}</span>
                          <span className="mx-2">•</span>
                          <span>{section.max_items} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateSection(index, { is_visible: !section.is_visible })}
                        className={`px-3 py-1 rounded text-sm ${
                          section.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {section.is_visible ? '👁️ Visible' : '🙈 Hidden'}
                      </button>
                      <button
                        onClick={() => deleteSection(index)}
                        className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        🗑️ Delete
                      </button>
                      <div
                        className={`text-gray-400 cursor-move select-none transition-colors hover:text-gray-600 ${draggedIndex === index ? 'text-blue-500' : ''}`}
                        title="Drag to reorder"
                      >
                        ⋮⋮
                      </div>
                    </div>
                  </div>

                  {section.section_type === 'categories' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">📂 Select Categories to Display</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => updateSection(index, { selected_categories: categories })}
                            className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                          >
                            ✅ Select All ({categories.length})
                          </button>
                          <button
                            onClick={() => updateSection(index, { selected_categories: [] })}
                            className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                          >
                            ❌ Clear All
                          </button>
                          <span className="text-sm text-gray-600">
                            Selected: {(section.selected_categories || []).length} of {categories.length}
                          </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                          {categories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categories.map((category) => {
                                const isSelected = (section.selected_categories || []).includes(category);
                                return (
                                  <label key={category} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        const currentSelected = section.selected_categories || [];
                                        const newSelected = isSelected
                                          ? currentSelected.filter(c => c !== category)
                                          : [...currentSelected, category];
                                        updateSection(index, { selected_categories: newSelected });
                                      }}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{category}</span>
                                    <span className="text-xs text-gray-500">
                                      ({stores.filter(store => store.category === category).length} stores)
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <div className="text-2xl mb-2">📂</div>
                              <p className="text-sm">No categories found</p>
                              <p className="text-xs">Add stores with categories to see them here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.section_type === 'category-stores' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">🛒 Select Category to Display Stores From</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {section.selected_category
                              ? `Selected: ${section.selected_category}`
                              : 'No category selected'
                            }
                          </span>
                          <button
                            onClick={() => updateSection(index, {
                              selected_category: undefined,
                              section_title: section.section_title?.replace(`${section.selected_category} `, '') || ''
                            })}
                            className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                          >
                            ❌ Clear Selection
                          </button>
                        </div>

                        {/* Category Title Suggestions */}
                        {section.selected_category && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">💡 Suggested Titles for {section.selected_category}</h5>
                            <div className="flex flex-wrap gap-2">
                              {[
                                `${section.selected_category} Near You`,
                                `Best ${section.selected_category}`,
                                `Top ${section.selected_category}`,
                                `Local ${section.selected_category}`,
                                `${section.selected_category} Directory`,
                                `Find ${section.selected_category}`,
                                `Explore ${section.selected_category}`,
                                `${section.selected_category} in Your Area`
                              ].map((suggestion, i) => (
                                <button
                                  key={i}
                                  onClick={() => updateSection(index, { section_title: suggestion })}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                          {categories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categories.map((category) => {
                                const isSelected = section.selected_category === category;
                                const storesInCategory = stores.filter(store => store.category === category);
                                return (
                                  <label key={category} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`category-${index}`}
                                      checked={isSelected}
                                      onChange={() => {
                                        const defaultTitle = `${category} Near You`;
                                        updateSection(index, {
                                          selected_category: category,
                                          section_title: section.section_title || defaultTitle
                                        });
                                      }}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{category}</span>
                                    <span className="text-xs text-gray-500">
                                      ({storesInCategory.length} stores)
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <div className="text-2xl mb-2">📂</div>
                              <p className="text-sm">No categories found</p>
                              <p className="text-xs">Add stores with categories to see them here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {section.section_type === 'banners' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Banner Images ({(section.banners || []).length})</h4>
                      {(section.banners || []).map((banner, bannerIndex) => (
                        <div key={banner.id} className="bg-gray-50 p-3 rounded mb-4 border">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              {banner.image_url ? (
                                <img src={banner.image_url} alt={banner.title} className="w-20 h-16 object-cover rounded border" />
                              ) : (
                                <div className="w-20 h-16 bg-gray-200 rounded border flex items-center justify-center">
                                  <span className="text-xs text-gray-500">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Banner Title</label>
                                <input
                                  type="text"
                                  value={banner.title}
                                  onChange={(e) => {
                                    const updatedBanners = [...(section.banners || [])];
                                    updatedBanners[bannerIndex] = { ...banner, title: e.target.value };
                                    updateSection(index, { banners: updatedBanners });
                                  }}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="Banner title"
                                />
                              </div>
                              <div>
                                <ImageUploader
                                  label="Banner Image"
                                  value={banner.image_url}
                                  onChange={(url) => {
                                    const updatedBanners = [...(section.banners || [])];
                                    updatedBanners[bannerIndex] = { ...banner, image_url: url };
                                    updateSection(index, { banners: updatedBanners });
                                  }}
                                  bucket="banners"
                                  maxSizeMB={10}
                                  className="mb-2"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Link URL (Optional)</label>
                                <input
                                  type="url"
                                  value={banner.link_url || ''}
                                  onChange={(e) => {
                                    const updatedBanners = [...(section.banners || [])];
                                    updatedBanners[bannerIndex] = { ...banner, link_url: e.target.value };
                                    updateSection(index, { banners: updatedBanners });
                                  }}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const updatedBanners = (section.banners || []).filter(b => b.id !== banner.id);
                                updateSection(index, { banners: updatedBanners });
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove banner"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const banner = {
                            id: `banner_${Date.now()}`,
                            title: 'New Banner',
                            image_url: '',
                            link_url: '',
                          };
                          updateSection(index, {
                            banners: [...(section.banners || []), banner]
                          });
                        }}
                        className="w-full bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-3 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors text-sm flex items-center justify-center"
                      >
                        ➕ Add New Banner
                      </button>
                    </div>
                  )}

                  {section.section_type === 'text' && (
                    <div className="border-t pt-4">
                      <textarea
                        value={section.text_content || ''}
                        onChange={(e) => updateSection(index, { text_content: e.target.value })}
                        className="w-full border border-gray-300 rounded-md p-3 focus:ring-purple-500 focus:border-purple-500"
                        rows={3}
                        placeholder="Enter your text content here..."
                      />
                    </div>
                  )}

                  {section.section_type === 'stores' && (
                    <div className="border-t pt-4">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          📍 Location-Based Filtering
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            New Feature
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={section.use_location_filter || false}
                              onChange={(e) => updateSection(index, { use_location_filter: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700">
                              Show nearby stores only
                            </label>
                          </div>

                          {section.use_location_filter && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Search Radius (km)
                                </label>
                                <input
                                  type="number"
                                  value={section.location_radius_km || 10}
                                  onChange={(e) => updateSection(index, { location_radius_km: parseFloat(e.target.value) || 10 })}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                  min="1"
                                  max="100"
                                  step="1"
                                />
                              </div>

                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={section.sort_by_distance || false}
                                  onChange={(e) => updateSection(index, { sort_by_distance: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                  Sort by distance
                                </label>
                              </div>
                            </>
                          )}
                        </div>

                        {section.use_location_filter && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <div className="text-blue-600 mr-3">ℹ️</div>
                              <div>
                                <h5 className="font-medium text-blue-900 mb-1">Location-Based Filtering Active</h5>
                                <p className="text-sm text-blue-800">
                                  This section will only show stores within {section.location_radius_km}km of the user's location.
                                  {section.sort_by_distance ? ' Stores will be sorted by proximity.' : ' Stores will be sorted normally.'}
                                </p>
                                <p className="text-xs text-blue-700 mt-2">
                                  📍 Uses user's current location from the app
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick radius presets */}
                        {section.use_location_filter && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-600 mr-2">Quick Radius:</span>
                            {[5, 10, 15, 25, 50].map(radius => (
                              <button
                                key={radius}
                                onClick={() => updateSection(index, { location_radius_km: radius })}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                  section.location_radius_km === radius
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {radius}km
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bulk Upload Stores</h3>
              <button
                onClick={() => setShowBulkUpload(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <BulkUploadStores
              onClose={() => setShowBulkUpload(false)}
              onComplete={() => {
                setShowBulkUpload(false);
                loadStores(); // Reload stores after bulk upload
                onBulkUploadComplete?.();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};



export default InteractiveCmsEditor;
