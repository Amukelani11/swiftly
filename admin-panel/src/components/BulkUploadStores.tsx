'use client'

import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete'
import BulkLogoUploader from './BulkLogoUploader'
import ImageUploader from './ImageUploader'
import ImageManager from './ImageManager'
import { googleMapsAdmin } from '../lib/googleMaps-admin'

interface Props {
  onClose: () => void
  onComplete?: () => void
}

interface StoreForm {
  name: string
  category: string
  description: string
  logo_url: string
  banner_image_url: string
  address: string
  city: string
  province: string
  latitude: number | null
  longitude: number | null
  rating: string
  review_count: string
  delivery_fee: string
  is_open: boolean
  is_featured: boolean
  is_active: boolean
  sort_order: string
}

export default function BulkUploadStores({ onClose, onComplete }: Props) {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'logos' | 'images'>('individual')

  // Bulk upload states
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)

  // Individual store states
  const [storeForm, setStoreForm] = useState<StoreForm>({
    name: '',
    category: '',
    description: '',
    logo_url: '',
    banner_image_url: '',
    address: '',
    city: '',
    province: '',
    latitude: null,
    longitude: null,
    rating: '',
    review_count: '',
    delivery_fee: '',
    is_open: true,
    is_featured: false,
    is_active: true,
    sort_order: '0'
  })
  const [pendingStores, setPendingStores] = useState<StoreForm[]>([])
  const [savingIndividual, setSavingIndividual] = useState(false)

  const normalizeRow = (r: any) => {
    const map: any = {}
    for (const key of Object.keys(r)) {
      map[key.toString().trim().toLowerCase()] = r[key]
    }
    return map
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) {
      console.log('📁 Bulk Upload: No file selected')
      return
    }

    console.log(`📁 Bulk Upload: Starting file processing - ${f.name} (${f.size} bytes, ${f.type})`)
    setLoading(true)
    setErrors([])

    try {
      console.log('📁 Bulk Upload: Reading file into memory...')
      const data = await f.arrayBuffer()
      console.log(`📁 Bulk Upload: File loaded successfully (${data.byteLength} bytes)`)

      console.log('📁 Bulk Upload: Parsing Excel file...')
      const wb = XLSX.read(data)
      console.log(`📁 Bulk Upload: Excel file parsed. Available sheets: [${wb.SheetNames.join(', ')}]`)

      const sheet = wb.Sheets[wb.SheetNames[0]]
      console.log(`📁 Bulk Upload: Processing sheet "${wb.SheetNames[0]}"`)

      const json = XLSX.utils.sheet_to_json(sheet, { defval: null })
      console.log(`📁 Bulk Upload: Sheet converted to JSON. Raw rows: ${json.length}`)

      console.log('📁 Bulk Upload: Normalizing data fields...')
      const normalized = json.map(normalizeRow)
      console.log(`📁 Bulk Upload: Data normalization complete. Final rows: ${normalized.length}`)

      setRows(normalized)
      console.log('✅ Bulk Upload: File processing completed successfully. Ready for upload.')
    } catch (err: any) {
      console.error('❌ Bulk Upload: Error processing file:', err)
      console.error('❌ Bulk Upload: Stack trace:', err.stack)
      setErrors([String(err)])
    } finally {
      setLoading(false)
    }
  }

  const validateRow = (r: any) => {
    const errs: string[] = []
    if (!r.name) errs.push('Missing name')
    if (!r.category) errs.push('Missing category')

    // Log validation results for debugging
    if (errs.length > 0) {
      console.warn(`⚠️ Bulk Upload: Validation failed for row - Errors: [${errs.join(', ')}]`)
    }

    return errs
  }

  // Geocode addresses that don't have coordinates
  const geocodeAddresses = async (validated: any[]) => {
    const geocodedStores: any[] = []
    const geocodingErrors: string[] = []
    const storesToGeocode = validated.filter(store => store.address && (!store.latitude || !store.longitude))

    console.log(`🔍 Smart Geocoding: Starting geocoding process for ${storesToGeocode.length} stores`)
    console.log(`🔍 Smart Geocoding: Total stores: ${validated.length}, Need geocoding: ${storesToGeocode.length}`)

    if (storesToGeocode.length === 0) {
      console.log('🔍 Smart Geocoding: No stores need geocoding (all have coordinates)')
      return { geocodedStores: validated, geocodingErrors }
    }

    console.log('🔍 Smart Geocoding: Processing addresses through Google Places API...')

    for (let i = 0; i < validated.length; i++) {
      const store = { ...validated[i] }

      // If we have an address but no coordinates, geocode it
      if (store.address && (!store.latitude || !store.longitude)) {
        console.log(`📍 Smart Geocoding: Processing store ${geocodedStores.length + 1}/${storesToGeocode.length} - ${store.name}`)
        console.log(`📍 Smart Geocoding: Address: "${store.address}"`)

        try {
          console.log('📍 Smart Geocoding: Calling Google Places Geocoding API...')
          const geocodeResult = await googleMapsAdmin.geocodeAddress(store.address)

          console.log(`📍 Smart Geocoding: API Response received - Status: ${geocodeResult.status}`)
          console.log(`📍 Smart Geocoding: Results found: ${geocodeResult.results?.length || 0}`)

          if (geocodeResult.results && geocodeResult.results.length > 0) {
            const result = geocodeResult.results[0]
            const location = result.geometry.location

            store.latitude = location.lat
            store.longitude = location.lng

            console.log(`📍 Smart Geocoding: ✅ Coordinates found: ${store.latitude.toFixed(6)}, ${store.longitude.toFixed(6)}`)

            // Also extract city and province if not provided
            if (!store.city || !store.province) {
              console.log('📍 Smart Geocoding: Extracting location details from address components...')
              const addressComponents = result.address_components
              addressComponents.forEach((component: any) => {
                if (component.types.includes('locality') && !store.city) {
                  store.city = component.long_name
                  console.log(`📍 Smart Geocoding: City extracted: ${store.city}`)
                }
                if (component.types.includes('administrative_area_level_1') && !store.province) {
                  store.province = component.long_name
                  console.log(`📍 Smart Geocoding: Province extracted: ${store.province}`)
                }
              })
            }

            console.log(`✅ Smart Geocoding: SUCCESS - ${store.name} geocoded successfully`)
          } else {
            console.warn(`⚠️ Smart Geocoding: No results found for ${store.name}: ${store.address}`)
            geocodingErrors.push(`Could not geocode: ${store.name} - ${store.address}`)
          }
        } catch (error) {
          console.error(`❌ Smart Geocoding: API Error for ${store.name}:`, error)
          geocodingErrors.push(`Geocoding error for ${store.name}: ${(error as Error).message}`)
          // Continue with the store even if geocoding fails
        }
      } else if (!store.address) {
        console.log(`📍 Smart Geocoding: Skipping ${store.name} - No address provided`)
      } else {
        console.log(`📍 Smart Geocoding: Skipping ${store.name} - Already has coordinates`)
      }

      geocodedStores.push(store)
    }

    console.log(`🔍 Smart Geocoding: Process completed`)
    console.log(`🔍 Smart Geocoding: Successfully geocoded: ${storesToGeocode.length - geocodingErrors.length}/${storesToGeocode.length}`)
    console.log(`🔍 Smart Geocoding: Errors: ${geocodingErrors.length}`)

    if (geocodingErrors.length > 0) {
      console.warn('⚠️ Smart Geocoding: Some addresses could not be geocoded:')
      geocodingErrors.forEach((error, index) => {
        console.warn(`   ${index + 1}. ${error}`)
      })
    }

    return { geocodedStores, geocodingErrors }
  }

  const upload = async () => {
    console.log('🚀 Bulk Upload: Starting upload process...')
    console.log(`🚀 Bulk Upload: Processing ${rows.length} rows from Excel file`)

    setLoading(true)
    setErrors([])

    try {
      console.log('🚀 Bulk Upload: Validating data rows...')
      const validated: any[] = []
      const rowErrors: any[] = []

      rows.forEach((r, idx) => {
        const e = validateRow(r)
        if (e.length) {
          rowErrors.push({ row: idx + 2, errors: e })
        } else {
          // map fields expected by API / DB
          validated.push({
            name: r.name,
            category: r.category,
            description: r.description || null,
            logo_url: r.logo_url || null,
            banner_image_url: r.banner_image_url || null,
            address: r.address || null,
            city: r.city || null,
            province: r.province || null,
            latitude: r.latitude ? parseFloat(r.latitude) : null,
            longitude: r.longitude ? parseFloat(r.longitude) : null,
            rating: r.rating ? parseFloat(r.rating) : 0,
            review_count: r.review_count ? parseInt(r.review_count) : 0,
            delivery_fee: r.delivery_fee ? parseFloat(r.delivery_fee) : 0,
            is_open: parseBool(r.is_open),
            is_featured: parseBool(r.is_featured),
            is_active: parseBool(r.is_active),
            sort_order: r.sort_order ? parseInt(r.sort_order) : 0,
          })
        }
      })

      console.log(`🚀 Bulk Upload: Validation complete - Valid: ${validated.length}, Errors: ${rowErrors.length}`)

      if (rowErrors.length) {
        console.error('❌ Bulk Upload: Validation failed for some rows:')
        rowErrors.forEach(error => {
          console.error(`   Row ${error.row}: ${error.errors.join(', ')}`)
        })
        setErrors(rowErrors.map((r) => `Row ${r.row}: ${r.errors.join(', ')}`))
        setLoading(false)
        return
      }

      console.log('✅ Bulk Upload: All rows validated successfully')

      // Geocode addresses that don't have coordinates
      console.log('🔍 Smart Geocoding: Starting geocoding process...')
      const { geocodedStores, geocodingErrors } = await geocodeAddresses(validated)
      console.log(`✅ Bulk Upload: Geocoding complete - Processed ${geocodedStores.length} stores`)

      // Add any geocoding errors to the errors array
      if (geocodingErrors.length > 0) {
        console.warn(`⚠️ Bulk Upload: ${geocodingErrors.length} geocoding warnings - continuing with upload`)
        setErrors(prev => [...prev, ...geocodingErrors])
      }

      console.log('🚀 Bulk Upload: Sending data to API...')
      console.log(`🚀 Bulk Upload: Final store count: ${geocodedStores.length}`)

      const res = await fetch('/api/dashboard/stores/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: geocodedStores }),
      })

      console.log(`🚀 Bulk Upload: API Response - Status: ${res.status} ${res.statusText}`)

      const result = await res.json()
      console.log('🚀 Bulk Upload: API Response data:', result)

      setReport(result)

      if (res.ok) {
        console.log('✅ Bulk Upload: SUCCESS - All stores uploaded successfully!')
        console.log(`✅ Bulk Upload: ${geocodedStores.length} stores created/updated`)
        onComplete?.()
      } else {
        console.error('❌ Bulk Upload: FAILED - API returned error')
        console.error('❌ Bulk Upload: Error details:', result)
      }
    } catch (err: any) {
      console.error('❌ Bulk Upload: Exception during upload process:', err)
      console.error('❌ Bulk Upload: Stack trace:', err.stack)
      setErrors([String(err)])
    } finally {
      setLoading(false)
      console.log('🚀 Bulk Upload: Process completed')
    }
  }

  const parseBool = (v: any) => {
    if (v === null || v === undefined) return false
    const s = String(v).toLowerCase()
    return ['1', 'true', 'yes', 'y'].includes(s)
  }

  const downloadTemplate = () => {
    const headers = ['name','category','description','logo_url','banner_image_url','address','city','province','latitude','longitude','rating','review_count','delivery_fee','is_open','is_featured','is_active','sort_order']

    // Create sample data with comments
    const sampleData = [
      headers,
      [
        'Example Store',
        'supermarket',
        'A great local supermarket',
        'https://example.com/logo.jpg',
        'https://example.com/banner.jpg',
        '123 Main Street, Cape Town', // Address will be geocoded if lat/lng not provided
        '', // City will be auto-filled from geocoding
        '', // Province will be auto-filled from geocoding
        '', // Leave empty to use geocoding from address above
        '', // Leave empty to use geocoding from address above
        '4.5',
        '150',
        '25.00',
        'true',
        'false',
        'true',
        '0'
      ]
    ]

    const csv = sampleData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'stores_template.csv'
    link.click()
  }

  // Individual store functions
  const addStore = () => {
    if (!storeForm.name.trim() || !storeForm.category.trim()) {
      alert('Please fill in at least the store name and category')
      return
    }

    setPendingStores(prev => [...prev, { ...storeForm }])
    resetForm()
  }

  const resetForm = () => {
    setStoreForm({
      name: '',
      category: '',
      description: '',
      logo_url: '',
      banner_image_url: '',
      address: '',
      city: '',
      province: '',
      latitude: null,
      longitude: null,
      rating: '',
      review_count: '',
      delivery_fee: '',
      is_open: true,
      is_featured: false,
      is_active: true,
      sort_order: '0'
    })
  }

  const removePendingStore = (index: number) => {
    setPendingStores(prev => prev.filter((_, i) => i !== index))
  }

  const uploadIndividualStores = async () => {
    if (pendingStores.length === 0) {
      alert('No stores to upload')
      return
    }

    setSavingIndividual(true)
    try {
      const formattedStores = pendingStores.map(store => ({
        name: store.name,
        category: store.category,
        description: store.description || null,
        logo_url: store.logo_url || null,
        banner_image_url: store.banner_image_url || null,
        address: store.address || null,
        city: store.city || null,
        province: store.province || null,
        latitude: store.latitude,
        longitude: store.longitude,
        rating: store.rating ? parseFloat(store.rating) : 0,
        review_count: store.review_count ? parseInt(store.review_count) : 0,
        delivery_fee: store.delivery_fee ? parseFloat(store.delivery_fee) : 0,
        is_open: store.is_open,
        is_featured: store.is_featured,
        is_active: store.is_active,
        sort_order: store.sort_order ? parseInt(store.sort_order) : 0,
      }))

      const res = await fetch('/api/dashboard/stores/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: formattedStores }),
      })

      const result = await res.json()

      if (res.ok) {
        alert(`Successfully uploaded ${pendingStores.length} store${pendingStores.length !== 1 ? 's' : ''}!`)
        setPendingStores([])
        onComplete?.()
      } else {
        alert('Upload failed: ' + JSON.stringify(result))
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + String(error))
    } finally {
      setSavingIndividual(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <h2 className="text-2xl font-bold">🛍️ Store Management</h2>
          <p className="text-purple-100 mt-1">Add stores individually, upload in bulk, or manage images</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 px-4 py-4 font-medium transition-colors text-sm ${
              activeTab === 'individual'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ➕ Add Stores
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 px-4 py-4 font-medium transition-colors text-sm ${
              activeTab === 'bulk'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📄 Bulk Upload
          </button>
          <button
            onClick={() => setActiveTab('logos')}
            className={`flex-1 px-3 py-4 font-medium transition-colors text-xs ${
              activeTab === 'logos'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🏪 Bulk Logos
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 px-3 py-4 font-medium transition-colors text-xs ${
              activeTab === 'images'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🖼️ Image Manager
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'individual' ? (
            <div className="space-y-6">
              {/* Add Store Form */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Add New Store</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="Enter store name..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={storeForm.category}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                    >
                      <option value="">Select category...</option>
                      <option value="supermarket">🏪 Supermarket</option>
                      <option value="convenience">🛒 Convenience Store</option>
                      <option value="restaurant">🍽️ Restaurant</option>
                      <option value="pharmacy">💊 Pharmacy</option>
                      <option value="other">🏢 Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating (0-5)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={storeForm.rating}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, rating: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="4.5"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={storeForm.description}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      rows={3}
                      placeholder="Describe the store..."
                    />
                  </div>

                  {/* Images */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ImageUploader
                        label="Store Logo"
                        value={storeForm.logo_url}
                        onChange={(url) => setStoreForm(prev => ({ ...prev, logo_url: url }))}
                        bucket="store-images"
                      />
                      <ImageUploader
                        label="Banner Image"
                        value={storeForm.banner_image_url}
                        onChange={(url) => setStoreForm(prev => ({ ...prev, banner_image_url: url }))}
                        bucket="store-images"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address (Search with Google Places)
                    </label>
                    <GooglePlacesAutocomplete
                      value={storeForm.address}
                      onChange={(value) => setStoreForm(prev => ({ ...prev, address: value }))}
                      onSelect={(place) => {
                        setStoreForm(prev => ({
                          ...prev,
                          address: place.address,
                          city: place.city || prev.city,
                          province: place.province || prev.province,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        }));
                      }}
                      placeholder="Search for store address..."
                      className="w-full"
                    />
                    {storeForm.latitude && storeForm.longitude && (
                      <div className="mt-2 text-xs text-green-600">
                        ✅ Coordinates: {storeForm.latitude.toFixed(6)}, {storeForm.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={storeForm.city}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="Auto-filled from address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      value={storeForm.province}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, province: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="Auto-filled from address"
                    />
                  </div>

                  {/* Business Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Fee (R)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={storeForm.delivery_fee}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, delivery_fee: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="25.00"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      💡 Delivery time will be calculated automatically based on distance
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Count
                    </label>
                    <input
                      type="number"
                      value={storeForm.review_count}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, review_count: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                      placeholder="150"
                    />
                  </div>

                  {/* Status Options */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_open"
                          checked={storeForm.is_open}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, is_open: e.target.checked }))}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_open" className="ml-2 text-sm text-gray-700">
                          🟢 Open
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_featured"
                          checked={storeForm.is_featured}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700">
                          ⭐ Featured
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={storeForm.is_active}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                          ✅ Active
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={storeForm.sort_order}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, sort_order: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="md:col-span-2 flex gap-3">
                    <button
                      onClick={addStore}
                      className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      ➕ Add Store
                    </button>
                    <button
                      onClick={resetForm}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      🔄 Reset Form
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Stores */}
              {pendingStores.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">
                      📋 Pending Stores ({pendingStores.length})
                    </h3>
                    <button
                      onClick={uploadIndividualStores}
                      disabled={savingIndividual}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        savingIndividual
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {savingIndividual ? '💾 Uploading...' : `💾 Upload ${pendingStores.length} Store${pendingStores.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pendingStores.map((store, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{store.name}</h4>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                {store.category}
                              </span>
                              {store.is_featured && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                  ⭐ Featured
                                </span>
                              )}
                            </div>

                            {store.description && (
                              <p className="text-sm text-gray-600 mb-2">{store.description}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                              {store.address && <div>📍 {store.address}</div>}
                              {store.city && <div>🏙️ {store.city}</div>}
                              {store.rating && <div>⭐ {store.rating}/5</div>}
                              {store.delivery_fee && <div>💰 R{store.delivery_fee}</div>}
                            </div>
                          </div>

                          <button
                            onClick={() => removePendingStore(index)}
                            className="text-red-500 hover:text-red-700 ml-4"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'bulk' ? (
            /* Bulk Upload Tab */
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">📄 Bulk Upload</h3>
                <p className="text-orange-800 mb-4">
                  Upload multiple stores at once using an Excel or CSV file. Perfect for importing large datasets.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm">
                    <strong>🗺️ Smart Geocoding:</strong> If you provide addresses without coordinates,
                    they'll be automatically geocoded using Google Places API to get accurate latitude/longitude.
                  </p>
                  <p className="text-blue-800 text-sm mt-2">
                    <strong>📷 Image URLs:</strong> You can provide logo_url and banner_image_url as direct URLs,
                    or leave them blank and upload images separately using the individual store creation form.
                  </p>
                </div>

                <div className="flex gap-3 mb-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFile}
                    className="border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    📥 Download Template
                  </button>
      </div>

                {loading && (
                  <div className="flex items-center text-orange-700">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600 mr-2"></div>
                    {rows.length === 0 ? 'Parsing file...' : 'Geocoding addresses...'}
                  </div>
                )}

      {errors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-red-800 font-medium mb-2">❌ Errors found:</h4>
                    {errors.map((error, i) => (
                      <div key={i} className="text-red-700 text-sm">{error}</div>
                    ))}
        </div>
      )}

      {rows.length > 0 && (
                  <div className="bg-white rounded-lg border border-orange-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        📊 Preview ({rows.length} rows)
                      </h4>
                      <button
                        onClick={upload}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        💾 Upload All
                      </button>
                    </div>

          <div className="max-h-64 overflow-auto border rounded">
            <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(rows[0]).slice(0, 8).map((header) => (
                              <th key={header} className="px-3 py-2 text-left font-medium text-gray-700">
                                {header}
                              </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                          {rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="even:bg-gray-50">
                              {Object.keys(rows[0]).slice(0, 8).map((key) => (
                                <td key={key} className="px-3 py-2 text-gray-900">
                                  {String(row[key] ?? '')}
                                </td>
                              ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

                    {rows.length > 10 && (
                      <div className="mt-2 text-sm text-gray-600">
                        And {rows.length - 10} more rows...
          </div>
                    )}
        </div>
      )}

      {report && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">📋 Upload Report:</h4>
                    <pre className="text-xs bg-white p-2 rounded border max-h-32 overflow-auto">
                      {JSON.stringify(report, null, 2)}
                    </pre>
        </div>
      )}
              </div>
            </div>
          ) : activeTab === 'logos' ? (
            <BulkLogoUploader onComplete={onComplete} />
          ) : activeTab === 'images' ? (
            <ImageManager
              bucket="store-images"
              title="Store Image Manager"
              description="Upload and manage logos, banners, and promotional images for your stores"
              onImageSelect={(url) => console.log('Selected image:', url)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
