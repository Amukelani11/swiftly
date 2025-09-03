import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../lib/supabase-admin';
import ImageUploader from './ImageUploader';

interface StoreData {
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
  sort_order: number;
  operating_hours?: string;
  created_at: string;
  updated_at: string;
}

const BulkFieldEditor: React.FC = () => {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [bulkValues, setBulkValues] = useState<Partial<StoreData>>({});
  const [activeField, setActiveField] = useState<string>('');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [uploadingBanners, setUploadingBanners] = useState(false);
  const [uploadedBanners, setUploadedBanners] = useState<{[storeId: string]: string}>({});
  const [extractingHours, setExtractingHours] = useState(false);
  const [deletingStores, setDeletingStores] = useState(false);

  const editableFields = [
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'logo_url', label: 'Logo URL', type: 'url' },
    { key: 'banner_image_url', label: 'Banner Image URL', type: 'url' },
    { key: 'category', label: 'Category', type: 'select', options: ['supermarket', 'convenience', 'restaurant', 'pharmacy', 'other'] },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'province', label: 'Province', type: 'text' },
    { key: 'delivery_fee', label: 'Delivery Fee (R)', type: 'number' },
    { key: 'rating', label: 'Rating', type: 'number', min: 0, max: 5, step: 0.1 },
    { key: 'is_featured', label: 'Featured Store', type: 'checkbox' },
    { key: 'is_open', label: 'Open Status', type: 'checkbox' },
    { key: 'operating_hours', label: 'Operating Hours', type: 'textarea', readonly: true },
  ];

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stores');
      const result = await response.json();

      if (response.ok) {
        setStores(result.stores || []);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId);
    } else {
      newSelected.add(storeId);
    }
    setSelectedStores(newSelected);
  };

  const selectAllStores = () => {
    if (selectedStores.size === stores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(stores.map(store => store.id)));
    }
  };

  const selectStoresMissingField = (field: string) => {
    const missingStores = stores.filter(store => {
      const value = store[field as keyof StoreData];
      return value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
    });
    setSelectedStores(new Set(missingStores.map(store => store.id)));
  };

  const applyBulkUpdate = async () => {
    if (selectedStores.size === 0 || !activeField) {
      alert('Please select stores and a field to update');
      return;
    }

    setSaving(true);
    try {
      const updates = { [activeField]: bulkValues[activeField as keyof StoreData] };

      // Update each selected store
      for (const storeId of selectedStores) {
        const response = await fetch(`/api/dashboard/stores/${storeId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to update store ${storeId}`);
        }
      }

      await loadStores(); // Refresh the list
      setSelectedStores(new Set()); // Clear selection
      setBulkValues({}); // Clear bulk values
      setActiveField(''); // Clear active field

      alert(`Successfully updated ${selectedStores.size} stores!`);
    } catch (error) {
      console.error('Error updating stores:', error);
      alert('Failed to update stores. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkBannerUpload = async (bannerUrl: string) => {
    if (selectedStores.size === 0) {
      alert('Please select at least one store first');
      return;
    }

    try {
      setUploadingBanners(true);
      console.log(`📤 Bulk Banner Upload: Starting upload for ${selectedStores.size} stores`);

      // Update all selected stores with the banner URL
      const updatePromises = Array.from(selectedStores).map(async (storeId) => {
        console.log(`📤 Bulk Banner Upload: Updating store ${storeId}`);
        const response = await fetch(`/api/dashboard/stores/${storeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banner_image_url: bannerUrl }),
        });
        if (!response.ok) {
          throw new Error(`Failed to update store ${storeId}`);
        }
        return response.json();
      });

      const results = await Promise.allSettled(updatePromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      console.log(`📤 Bulk Banner Upload: Complete - Success: ${successful}, Failed: ${failed}`);

      if (failed > 0) {
        alert(`Updated ${successful}/${selectedStores.size} stores. ${failed} failed.`);
      } else {
        alert(`✅ Successfully updated ${successful} stores with new banner!`);
      }

      // Store the uploaded banner URL for display
      const updatedBanners = { ...uploadedBanners };
      selectedStores.forEach(storeId => {
        updatedBanners[storeId] = bannerUrl;
      });
      setUploadedBanners(updatedBanners);

      // Refresh the stores list
      await loadStores();
      setShowBannerModal(false);

    } catch (error) {
      console.error('❌ Bulk Banner Upload: Failed:', error);
      alert('Failed to upload banner. Please try again.');
    } finally {
      setUploadingBanners(false);
    }
  };

  const extractOperatingHours = async () => {
    if (selectedStores.size === 0) {
      alert('Please select at least one store first');
      return;
    }

    const storesToProcess = stores.filter(store => selectedStores.has(store.id));
    const storesWithDescriptions = storesToProcess.filter(store => store.description);

    if (storesWithDescriptions.length === 0) {
      alert('None of the selected stores have descriptions to extract hours from');
      return;
    }

    try {
      setExtractingHours(true);
      console.log(`🤖 AI Extraction: Starting to extract hours from ${storesWithDescriptions.length} stores`);

      let successCount = 0;
      let errorCount = 0;

      for (const store of storesWithDescriptions) {
        try {
          console.log(`🤖 AI Extraction: Processing ${store.name}`);

          const response = await fetch('/api/extract-hours', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: store.description })
          });

          if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
          }

          const result = await response.json();
          console.log(`🤖 AI Extraction: Extracted hours for ${store.name}:`, result);

          // Update the store with extracted hours
          if (result.operating_hours) {
            const hoursString = formatOperatingHours(result.operating_hours);
            console.log(`🤖 AI Extraction: Formatted hours for ${store.name}:`, hoursString);

            const updatePayload = {
              operating_hours: hoursString,
            };
            console.log(`🤖 AI Extraction: Update payload for ${store.name}:`, updatePayload);

            const updateResponse = await fetch(`/api/dashboard/stores/${store.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });

            console.log(`🤖 AI Extraction: Update response status for ${store.name}:`, updateResponse.status);

            if (updateResponse.ok) {
              const updateResult = await updateResponse.json();
              console.log(`🤖 AI Extraction: Update result for ${store.name}:`, updateResult);
              successCount++;
              console.log(`✅ AI Extraction: Successfully updated ${store.name}`);
            } else {
              const errorText = await updateResponse.text();
              console.error(`❌ AI Extraction: Failed to update ${store.name}. Status: ${updateResponse.status}, Error:`, errorText);
              errorCount++;
            }
          }

        } catch (error) {
          console.error(`❌ AI Extraction: Error processing ${store.name}:`, error);
          errorCount++;
        }
      }

      // Refresh the stores list
      await loadStores();

      if (successCount > 0) {
        alert(`✅ Successfully extracted operating hours for ${successCount} out of ${storesWithDescriptions.length} stores${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        alert('❌ Failed to extract operating hours from any stores');
      }

    } catch (error) {
      console.error('❌ AI Extraction: Failed:', error);
      alert('Failed to extract operating hours. Please try again.');
    } finally {
      setExtractingHours(false);
    }
  };

  const deleteSelectedStores = async () => {
    if (selectedStores.size === 0) {
      alert('Please select at least one store first');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedStores.size} store${selectedStores.size !== 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingStores(true);
      console.log(`🗑️ Deleting Stores: Starting deletion of ${selectedStores.size} stores`);

      let successCount = 0;
      let errorCount = 0;

      for (const storeId of selectedStores) {
        try {
          console.log(`🗑️ Deleting Stores: Deleting store ${storeId}`);
          const response = await fetch(`/api/dashboard/stores/${storeId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            successCount++;
            console.log(`✅ Deleting Stores: Successfully deleted store ${storeId}`);
          } else {
            errorCount++;
            console.error(`❌ Deleting Stores: Failed to delete store ${storeId}`);
          }
        } catch (error) {
          console.error(`❌ Deleting Stores: Error deleting store ${storeId}:`, error);
          errorCount++;
        }
      }

      // Refresh the stores list
      await loadStores();
      setSelectedStores(new Set()); // Clear selection

      if (successCount > 0) {
        alert(`✅ Successfully deleted ${successCount} store${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        alert('❌ Failed to delete any stores');
      }

    } catch (error) {
      console.error('❌ Deleting Stores: Failed:', error);
      alert('Failed to delete stores. Please try again.');
    } finally {
      setDeletingStores(false);
    }
  };

  const formatOperatingHours = (hours: any) => {
    if (!hours) return '';

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let formatted = '';

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayName = dayNames[i];
      if (hours[day]) {
        formatted += `${dayName}: ${hours[day]}\n`;
      }
    }

    if (hours.holidays) {
      formatted += `Holidays: ${hours.holidays}\n`;
    }

    return formatted.trim();
  };

  const getFieldValue = (store: StoreData, field: string) => {
    const value = store[field as keyof StoreData];
    if (value === null || value === undefined || value === '') return '❌ Missing';
    if (typeof value === 'boolean') return value ? '✅ Yes' : '❌ No';
    if (typeof value === 'number' && isNaN(value)) return '❌ Missing';

    // Special handling for operating_hours to show a preview
    if (field === 'operating_hours' && typeof value === 'string') {
      const lines = value.split('\n');
      const firstLine = lines[0] || '';
      if (lines.length > 1) {
        return `${firstLine} (+${lines.length - 1} more)`;
      }
      return firstLine;
    }

    return String(value);
  };

  const getMissingFieldsCount = (store: StoreData) => {
    return editableFields.filter(field => {
      const value = store[field.key as keyof StoreData];
      return value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">{stores.length}</h3>
          <p className="text-sm text-gray-600">Total Stores</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-green-600">{selectedStores.size}</h3>
          <p className="text-sm text-gray-600">Selected for Edit</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-orange-600">
            {stores.reduce((sum, store) => sum + getMissingFieldsCount(store), 0)}
          </h3>
          <p className="text-sm text-gray-600">Total Missing Fields</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-blue-600">
            {stores.filter(store => getMissingFieldsCount(store) === 0).length}
          </h3>
          <p className="text-sm text-gray-600">Complete Profiles</p>
        </div>
      </div>

      {/* Bulk Edit Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Field Editor</h2>

        {selectedStores.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">
              📝 Bulk Edit {selectedStores.size} Selected Store{selectedStores.size !== 1 ? 's' : ''}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Field to Edit
                </label>
                <select
                  value={activeField}
                  onChange={(e) => setActiveField(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select a field...</option>
                  {editableFields.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {activeField && (() => {
                const fieldConfig = editableFields.find(f => f.key === activeField);
                if (!fieldConfig) return null;

                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Value for "{fieldConfig.label}"
                    </label>
                    {fieldConfig.type === 'textarea' && (
                      <textarea
                        value={bulkValues[activeField] || ''}
                        onChange={(e) => setBulkValues({...bulkValues, [activeField]: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        rows={3}
                        placeholder="Enter description..."
                      />
                    )}
                    {fieldConfig.type === 'url' && (
                      <input
                        type="url"
                        value={bulkValues[activeField] || ''}
                        onChange={(e) => setBulkValues({...bulkValues, [activeField]: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="https://example.com/image.jpg"
                      />
                    )}
                    {fieldConfig.type === 'select' && (
                      <select
                        value={bulkValues[activeField] || ''}
                        onChange={(e) => setBulkValues({...bulkValues, [activeField]: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">Select category...</option>
                        {fieldConfig.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {fieldConfig.type === 'number' && (
                      <input
                        type="number"
                        value={bulkValues[activeField] || ''}
                        onChange={(e) => setBulkValues({...bulkValues, [activeField]: parseFloat(e.target.value) || 0})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        min={fieldConfig.min}
                        max={fieldConfig.max}
                        step={fieldConfig.step}
                      />
                    )}
                    {fieldConfig.type === 'checkbox' && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={bulkValues[activeField] || false}
                          onChange={(e) => setBulkValues({...bulkValues, [activeField]: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          {bulkValues[activeField] ? 'Yes' : 'No'}
                        </label>
                      </div>
                    )}
                    {fieldConfig.type === 'text' && (
                      <input
                        type="text"
                        value={bulkValues[activeField] || ''}
                        onChange={(e) => setBulkValues({...bulkValues, [activeField]: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="Enter value..."
                      />
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={applyBulkUpdate}
                disabled={saving || !activeField}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  saving || !activeField
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saving ? '💾 Applying...' : `💾 Apply to ${selectedStores.size} Store${selectedStores.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Bulk Banner Upload */}
        {selectedStores.size > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-green-900">
                🖼️ Bulk Banner Upload for {selectedStores.size} Store{selectedStores.size !== 1 ? 's' : ''}
              </h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBannerModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Upload Banner
                </button>
                <button
                  onClick={extractOperatingHours}
                  disabled={extractingHours}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    extractingHours
                      ? 'bg-blue-300 text-blue-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {extractingHours ? '🤖 Extracting...' : '🤖 Extract Hours'}
                </button>
                <button
                  onClick={deleteSelectedStores}
                  disabled={deletingStores}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    deletingStores
                      ? 'bg-red-300 text-red-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {deletingStores ? '🗑️ Deleting...' : '🗑️ Delete Stores'}
                </button>
              </div>
            </div>
            {selectedStores.size > 0 && (
              <div className="text-sm text-green-700">
                Selected stores: {Array.from(selectedStores).slice(0, 3).join(', ')}
                {selectedStores.size > 3 && ` and ${selectedStores.size - 3} more`}
              </div>
            )}
          </div>
        )}

        {/* Quick Select Buttons */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Select:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={selectAllStores}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition-colors"
            >
              {selectedStores.size === stores.length ? '❌ Deselect All' : '✅ Select All'}
            </button>
            {editableFields.map(field => {
              const missingCount = stores.filter(store => {
                const value = store[field.key as keyof StoreData];
                return value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
              }).length;

              if (missingCount === 0) return null;

              return (
                <button
                  key={field.key}
                  onClick={() => selectStoresMissingField(field.key)}
                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm hover:bg-orange-200 transition-colors"
                >
                  🔧 Missing {field.label} ({missingCount})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedStores.size === stores.length && stores.length > 0}
                    onChange={selectAllStores}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {editableFields.slice(0, 6).map(field => (
                  <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing Fields
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.map((store) => {
                const missingCount = getMissingFieldsCount(store);
                return (
                  <tr key={store.id} className={`hover:bg-gray-50 ${selectedStores.has(store.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStores.has(store.id)}
                        onChange={() => toggleStoreSelection(store.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                          {store.logo_url ? (
                            <img
                              src={store.logo_url}
                              alt={store.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-gray-600">🏪</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{store.name}</div>
                          <div className="text-sm text-gray-500">{store.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        store.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {store.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {editableFields.slice(0, 6).map(field => {
                      const fieldValue = getFieldValue(store, field.key);
                      const fullValue = field.key === 'operating_hours' ? store.operating_hours : fieldValue;

                      return (
                        <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span
                            className={fieldValue.startsWith('❌') ? 'text-red-600' : ''}
                            title={fullValue && fullValue !== fieldValue ? fullValue : undefined}
                          >
                            {fieldValue}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        missingCount === 0
                          ? 'bg-green-100 text-green-800'
                          : missingCount <= 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {missingCount === 0 ? '✅ Complete' : `⚠️ ${missingCount} missing`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banner Upload Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  🖼️ Upload Banner for {selectedStores.size} Store{selectedStores.size !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setShowBannerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <ImageUploader
                  label="Store Banner"
                  value=""
                  onChange={handleBulkBannerUpload}
                  bucket="store-images"
                  maxSizeMB={10}
                />
              </div>

              {uploadingBanners && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Uploading and updating stores...</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBannerModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkFieldEditor;
