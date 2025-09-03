'use client'

import React, { useState, useEffect } from 'react'
import { supabaseAdmin } from '../lib/supabase-admin'

interface Store {
  id: string
  name: string
  logo_url?: string
  category: string
}

interface BulkLogoUploaderProps {
  onComplete?: () => void
}

export default function BulkLogoUploader({ onComplete }: BulkLogoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Load stores on component mount
  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      console.log('🏪 Bulk Logo: Loading stores...')

      const response = await fetch('/api/dashboard/stores')
      const result = await response.json()

      if (response.ok && result.stores) {
        setStores(result.stores)
        console.log(`🏪 Bulk Logo: Loaded ${result.stores.length} stores`)
      } else {
        console.error('🏪 Bulk Logo: Failed to load stores:', result)
        setMessage('❌ Failed to load stores')
      }
    } catch (error) {
      console.error('🏪 Bulk Logo: Error loading stores:', error)
      setMessage('❌ Error loading stores')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage('❌ File size must be less than 5MB')
      return
    }

    console.log(`🏪 Bulk Logo: Selected file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMessage(`✅ Selected: ${file.name}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const toggleStoreSelection = (storeId: string) => {
    const newSelected = new Set(selectedStores)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedStores(newSelected)
    console.log(`🏪 Bulk Logo: ${newSelected.size} stores selected`)
  }

  const selectAllStores = () => {
    if (selectedStores.size === stores.length) {
      setSelectedStores(new Set())
      console.log('🏪 Bulk Logo: Deselected all stores')
    } else {
      setSelectedStores(new Set(stores.map(store => store.id)))
      console.log(`🏪 Bulk Logo: Selected all ${stores.length} stores`)
    }
  }

  const uploadLogo = async () => {
    if (!selectedFile || selectedStores.size === 0) {
      setMessage('❌ Please select a logo file and at least one store')
      return
    }

    try {
      setUploading(true)
      setMessage('📤 Uploading logo...')

      console.log('🏪 Bulk Logo: Starting logo upload...')
      console.log(`🏪 Bulk Logo: File: ${selectedFile.name}`)
      console.log(`🏪 Bulk Logo: Target stores: ${selectedStores.size}`)

      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `store_logos/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase Storage
      console.log(`🏪 Bulk Logo: Uploading to storage: ${fileName}`)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('store-images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('🏪 Bulk Logo: File uploaded successfully to storage')

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('store-images')
        .getPublicUrl(fileName)

      const logoUrl = urlData.publicUrl
      console.log(`🏪 Bulk Logo: Public URL generated: ${logoUrl}`)

      // Update selected stores with the logo URL
      setMessage(`🔄 Updating ${selectedStores.size} stores...`)

      const updatePromises = Array.from(selectedStores).map(async (storeId) => {
        console.log(`🏪 Bulk Logo: Updating store ${storeId}...`)

        const response = await fetch(`/api/dashboard/stores/${storeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo_url: logoUrl }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update store ${storeId}`)
        }

        return response.json()
      })

      const results = await Promise.allSettled(updatePromises)
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      console.log(`🏪 Bulk Logo: Update complete - Success: ${successful}, Failed: ${failed}`)

      if (failed > 0) {
        setMessage(`⚠️ Updated ${successful}/${selectedStores.size} stores. ${failed} failed.`)
      } else {
        setMessage(`✅ Success! Updated ${successful} stores with new logo.`)
      }

      // Reset form
      setSelectedFile(null)
      setPreviewUrl('')
      setSelectedStores(new Set())

      // Reload stores to show updated logos
      await loadStores()

      onComplete?.()

    } catch (error) {
      console.error('❌ Bulk Logo: Upload failed:', error)
      setMessage(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setSelectedStores(new Set())
    setMessage('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold">🏪 Bulk Logo Uploader</h2>
        <p className="text-purple-100 mt-1">Upload a logo and apply it to multiple stores at once</p>
      </div>

      {/* Logo Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Upload Logo</h3>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-purple-400 bg-purple-50'
              : selectedFile
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Logo preview"
                className="max-w-32 max-h-32 mx-auto rounded-lg object-contain"
              />
              <div>
                <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) : 0)} KB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">📷</div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drag & drop your logo here
                </p>
                <p className="text-sm text-gray-500">or click to browse files</p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports: JPG, PNG, GIF (max 5MB)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Choose File
              </label>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        {(selectedFile || selectedStores.size > 0) && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={uploadLogo}
              disabled={uploading || selectedStores.size === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                uploading || selectedStores.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {uploading ? '📤 Uploading...' : `📤 Upload to ${selectedStores.size} Store${selectedStores.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={clearSelection}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              🔄 Clear All
            </button>
          </div>
        )}
      </div>

      {/* Store Selection Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🏪 Select Stores ({selectedStores.size}/{stores.length} selected)
          </h3>
          <button
            onClick={selectAllStores}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            {selectedStores.size === stores.length ? '❌ Deselect All' : '✅ Select All'}
          </button>
        </div>

        {/* Store Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedStores.has(store.id)
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleStoreSelection(store.id)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedStores.has(store.id)}
                  onChange={() => toggleStoreSelection(store.id)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-xs">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        '🏪'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {store.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {store.category}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {stores.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🏪</div>
            <p>No stores found. Add some stores first.</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedStores.size > 0 && selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📋 Ready to Upload</h4>
          <div className="text-sm text-blue-800">
            <p>• Logo: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
            <p>• Stores: {selectedStores.size} selected</p>
            <p>• Action: Upload logo and update all selected stores</p>
          </div>
        </div>
      )}
    </div>
  )
}
