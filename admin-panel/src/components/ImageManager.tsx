'use client'

import React, { useState, useEffect } from 'react'
import { supabaseAdmin } from '../lib/supabase-admin'
import ImageUploader from './ImageUploader'

interface ImageFile {
  id: string
  name: string
  url: string
  size: number
  uploadedAt: string
  bucket: string
}

interface ImageManagerProps {
  bucket?: string
  title?: string
  description?: string
  onImageSelect?: (url: string) => void
  showUpload?: boolean
  showGallery?: boolean
}

export default function ImageManager({
  bucket = "store-images",
  title = "Image Manager",
  description = "Upload and manage images in your storage bucket",
  onImageSelect,
  showUpload = true,
  showGallery = true
}: ImageManagerProps) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  // Load existing images on mount
  useEffect(() => {
    if (showGallery) {
      loadImages()
    }
  }, [bucket, showGallery])

  const loadImages = async () => {
    try {
      setLoading(true)
      console.log(`🖼️ Image Manager: Loading images from ${bucket} bucket`)

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('🖼️ Image Manager: Error loading images:', error)
        return
      }

      console.log(`🖼️ Image Manager: Found ${data?.length || 0} images`)

      // Convert to our format
      const imageFiles: ImageFile[] = (data || [])
        .filter(file => file.name && !file.name.endsWith('/'))
        .map(file => ({
          id: file.id || file.name,
          name: file.name,
          url: supabaseAdmin.storage.from(bucket).getPublicUrl(file.name).data.publicUrl,
          size: file.metadata?.size || 0,
          uploadedAt: file.created_at || new Date().toISOString(),
          bucket
        }))

      setImages(imageFiles)
      console.log(`🖼️ Image Manager: Successfully loaded ${imageFiles.length} images`)

    } catch (error) {
      console.error('🖼️ Image Manager: Error loading images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (url: string) => {
    console.log('🖼️ Image Manager: New image uploaded:', url)
    if (showGallery) {
      loadImages() // Refresh the gallery
    }
    if (onImageSelect) {
      onImageSelect(url)
    }
  }

  const handleImageSelect = (url: string) => {
    setSelectedImage(url)
    if (onImageSelect) {
      onImageSelect(url)
    }
    console.log('🖼️ Image Manager: Image selected:', url)
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      console.log('🖼️ Image Manager: URL copied to clipboard:', url)
      // You could add a toast notification here
    } catch (error) {
      console.error('🖼️ Image Manager: Failed to copy URL:', error)
    }
  }

  const deleteImage = async (image: ImageFile) => {
    if (!confirm(`Are you sure you want to delete "${image.name}"?`)) {
      return
    }

    try {
      console.log(`🖼️ Image Manager: Deleting image: ${image.name}`)

      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove([image.name])

      if (error) {
        throw error
      }

      console.log('🖼️ Image Manager: Image deleted successfully')
      loadImages() // Refresh the gallery

    } catch (error) {
      console.error('🖼️ Image Manager: Error deleting image:', error)
      alert('Failed to delete image')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold">🖼️ {title}</h2>
        <p className="text-blue-100 mt-1">{description}</p>
        <p className="text-blue-200 text-sm mt-2">Bucket: {bucket}</p>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Upload New Image</h3>
          <ImageUploader
            label="Select Image"
            value=""
            onChange={handleImageUpload}
            bucket={bucket}
            maxSizeMB={10}
          />
        </div>
      )}

      {/* Gallery Section */}
      {showGallery && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🖼️ Image Gallery ({images.length} images)
            </h3>
            <button
              onClick={loadImages}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading images...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🖼️</div>
              <p className="text-lg font-medium">No images found</p>
              <p className="text-sm">Upload some images to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImage === image.url
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleImageSelect(image.url)}
                >
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5LjkgMTlMMTIgMTJDMTIuMSAxMiAxMiAxMS45IDEyIDExLjlMMTEuOSAxOUMxMS45IDIwIDEyIDIwLjEgMTIgMjBaTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5LjkgMTlMMTIgMTJDMTIuMSAxMiAxMiAxMS45IDEyIDExLjlMMTEuOSAxOUMxMS45IDIwIDEyIDIwLjEgMTIgMjBaIiBmaWxsPSIjOWNhM2FmIi8+Cjwvc3ZnPgo='
                      }}
                    />
                  </div>

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(image.url)
                        }}
                        className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Copy URL"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteImage(image)
                        }}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Delete Image"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                    <p className="text-xs truncate font-medium">{image.name}</p>
                    <p className="text-xs opacity-75">{formatFileSize(image.size)}</p>
                  </div>

                  {/* Selection indicator */}
                  {selectedImage === image.url && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Image Info */}
      {selectedImage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✅ Selected Image</h4>
          <div className="flex items-center space-x-4">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-16 h-16 object-cover rounded-lg border border-green-300"
            />
            <div className="flex-1">
              <p className="text-sm text-green-800 break-all">{selectedImage}</p>
              <button
                onClick={() => copyToClipboard(selectedImage)}
                className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
