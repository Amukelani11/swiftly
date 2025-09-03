'use client'

import React, { useState } from 'react'
import * as XLSX from 'xlsx'

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
  latitude: string
  longitude: string
  rating: string
  review_count: string
  delivery_fee: string
  delivery_time_min: string
  delivery_time_max: string
  is_open: boolean
  is_featured: boolean
  is_active: boolean
  sort_order: string
}

export default function BulkUploadStores({ onClose, onComplete }: Props) {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual')

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
    latitude: '',
    longitude: '',
    rating: '',
    review_count: '',
    delivery_fee: '',
    delivery_time_min: '',
    delivery_time_max: '',
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
    if (!f) return
    setLoading(true)
    setErrors([])
    try {
      const data = await f.arrayBuffer()
      const wb = XLSX.read(data)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: null })
      const normalized = json.map(normalizeRow)
      setRows(normalized)
    } catch (err: any) {
      setErrors([String(err)])
    } finally {
      setLoading(false)
    }
  }

  const validateRow = (r: any) => {
    const errs: string[] = []
    if (!r.name) errs.push('Missing name')
    if (!r.category) errs.push('Missing category')
    return errs
  }

  const upload = async () => {
    setLoading(true)
    setErrors([])
    try {
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
            delivery_time_min: r.delivery_time_min ? parseInt(r.delivery_time_min) : null,
            delivery_time_max: r.delivery_time_max ? parseInt(r.delivery_time_max) : null,
            is_open: parseBool(r.is_open),
            is_featured: parseBool(r.is_featured),
            is_active: parseBool(r.is_active),
            sort_order: r.sort_order ? parseInt(r.sort_order) : 0,
          })
        }
      })

      if (rowErrors.length) {
        setErrors(rowErrors.map((r) => `Row ${r.row}: ${r.errors.join(', ')}`))
        setLoading(false)
        return
      }

      const res = await fetch('/api/dashboard/stores/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: validated }),
      })
      const result = await res.json()
      setReport(result)
      if (res.ok) onComplete?.()
    } catch (err: any) {
      setErrors([String(err)])
    } finally {
      setLoading(false)
    }
  }

  const parseBool = (v: any) => {
    if (v === null || v === undefined) return false
    const s = String(v).toLowerCase()
    return ['1', 'true', 'yes', 'y'].includes(s)
  }

  const downloadTemplate = () => {
    const headers = ['name','category','description','logo_url','banner_image_url','address','city','province','latitude','longitude','rating','review_count','delivery_fee','delivery_time_min','delivery_time_max','is_open','is_featured','is_active','sort_order']
    const csv = headers.join(',') + '\n' + headers.map(() => '').join(',')
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
      latitude: '',
      longitude: '',
      rating: '',
      review_count: '',
      delivery_fee: '',
      delivery_time_min: '',
      delivery_time_max: '',
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
        latitude: store.latitude ? parseFloat(store.latitude) : null,
        longitude: store.longitude ? parseFloat(store.longitude) : null,
        rating: store.rating ? parseFloat(store.rating) : 0,
        review_count: store.review_count ? parseInt(store.review_count) : 0,
        delivery_fee: store.delivery_fee ? parseFloat(store.delivery_fee) : 0,
        delivery_time_min: store.delivery_time_min ? parseInt(store.delivery_time_min) : null,
        delivery_time_max: store.delivery_time_max ? parseInt(store.delivery_time_max) : null,
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
          <p className="text-purple-100 mt-1">Add stores individually or upload in bulk</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'individual'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ➕ Add Individual Stores
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'bulk'
                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📄 Bulk Upload
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={3}
                      placeholder="Describe the store..."
                    />
                  </div>

                  {/* Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={storeForm.logo_url}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="https://example.com/logo.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banner Image URL
                    </label>
                    <input
                      type="url"
                      value={storeForm.banner_image_url}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, banner_image_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={storeForm.city}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Cape Town"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Western Cape"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={storeForm.latitude}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="-33.9249"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={storeForm.longitude}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="18.4241"
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
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="25.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Time (Min)
                    </label>
                    <input
                      type="number"
                      value={storeForm.delivery_time_min}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, delivery_time_min: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Time (Max)
                    </label>
                    <input
                      type="number"
                      value={storeForm.delivery_time_max}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, delivery_time_max: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Count
                    </label>
                    <input
                      type="number"
                      value={storeForm.review_count}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, review_count: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
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
                          className="w-full border border-gray-300 rounded-md px-3 py-1 focus:ring-purple-500 focus:border-purple-500"
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
          ) : (
            /* Bulk Upload Tab */
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">📄 Bulk Upload</h3>
                <p className="text-orange-800 mb-4">
                  Upload multiple stores at once using an Excel or CSV file. Perfect for importing large datasets.
                </p>

                <div className="flex gap-3 mb-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFile}
                    className="border border-gray-300 rounded-md px-3 py-2"
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
                    Parsing file...
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
          )}
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

