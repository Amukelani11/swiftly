'use client'

import React, { useState, useRef } from 'react'
import { supabaseStorage } from '../lib/supabase-admin'

interface ImageUploaderProps {
  label: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
  accept?: string
  maxSizeMB?: number
  className?: string
  bucket?: string
}

export default function ImageUploader({
  label,
  value,
  onChange,
  placeholder = "No image selected",
  accept = "image/*",
  maxSizeMB = 5,
  className = "",
  bucket = "store-images"
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select an image file')
      return
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`❌ File size must be less than ${maxSizeMB}MB`)
      return
    }

    console.log(`📤 Image Upload: Starting upload for ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)

    try {
      setUploading(true)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `store_images/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      // Debug: Check if supabaseStorage is properly configured
      console.log(`📤 Image Upload: Using bucket: ${bucket}`)
      console.log(`📤 Image Upload: File details: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)

      // Upload to Supabase Storage
      console.log(`📤 Image Upload: Uploading to ${bucket}/${fileName}`)
      const { data: uploadData, error: uploadError } = await supabaseStorage.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('📤 Image Upload: Upload error details:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('📤 Image Upload: File uploaded successfully to storage')
      console.log('📤 Image Upload: Upload response:', uploadData)

      // Get public URL
      const { data: urlData } = supabaseStorage.storage
        .from(bucket)
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl
      console.log(`📤 Image Upload: Public URL generated: ${publicUrl}`)

      // Update the value
      onChange(publicUrl)
      setPreviewUrl(URL.createObjectURL(file))

      console.log('✅ Image Upload: Upload completed successfully')

    } catch (error) {
      console.error('❌ Image Upload: Upload failed:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
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

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const clearImage = () => {
    onChange('')
    setPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Image Preview */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="w-20 h-20 object-cover rounded-lg border border-gray-300"
          />
          <button
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-purple-400 bg-purple-50'
            : value
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {uploading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
            <span className="text-sm text-gray-600">Uploading...</span>
          </div>
        ) : value ? (
          <div className="text-green-600">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-sm">Image uploaded</p>
            <p className="text-xs text-gray-500 mt-1">Click to change</p>
          </div>
        ) : (
          <div>
            <div className="text-2xl text-gray-400 mb-2">📷</div>
            <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
            <p className="text-xs text-gray-400 mt-1">
              {accept} (max {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Current URL Display */}
      {value && (
        <div className="text-xs text-gray-500 break-all">
          URL: {value}
        </div>
      )}
    </div>
  )
}
