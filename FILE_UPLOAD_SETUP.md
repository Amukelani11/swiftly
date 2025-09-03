# File Upload Setup Guide

This guide explains how to set up file upload functionality for profile pictures and documents in your Swiftly app.

## 📋 Prerequisites

1. **Supabase Project** - Make sure you have a Supabase project set up
2. **Expo Project** - Your React Native app should be using Expo
3. **Required Packages** - Install the necessary dependencies

## 📦 Install Dependencies

```bash
pnpm add expo-image-picker expo-document-picker
```

## 🗄️ Database Setup

### 1. Run the SQL Scripts

Execute the following SQL scripts in your Supabase SQL editor:

1. **Main Schema** - Run `database_schema.sql` to create:
   - `profile_pictures` table
   - `documents` table
   - User table updates
   - Row Level Security policies
   - Triggers and functions

2. **Storage Buckets** - Run `supabase/storage-buckets.sql` to create:
   - `profile-pictures` bucket (public)
   - `documents` bucket (private)
   - Storage policies

### 2. Storage Bucket Configuration

The storage buckets are configured with the following settings:

#### Profile Pictures Bucket
- **Name**: `profile-pictures`
- **Public**: `true` (profile pictures are publicly accessible)
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, WebP, HEIC

#### Documents Bucket
- **Name**: `documents`
- **Public**: `false` (documents are private)
- **File Size Limit**: 10MB
- **Allowed Types**: PDF, JPEG, PNG, WebP

## 🔐 Security Policies

### Row Level Security (RLS)
- Users can only access their own files
- Admins can view all files
- Document verification can only be done by admins

### Storage Policies
- Profile pictures are publicly accessible
- Documents require authentication
- Users can only upload to their own folder structure

## 📁 File Structure

Files are organized in the following structure:

```
profile-pictures/
├── {user-id}/
│   ├── profile-{timestamp}.jpg
│   └── profile-{timestamp}.png

documents/
├── {user-id}/
│   ├── id-{timestamp}.pdf
│   ├── address-{timestamp}.jpg
│   └── drivers-license-{timestamp}.pdf
```

## 🚀 Usage

### Profile Picture Upload

```typescript
import { uploadProfilePicture } from '../utils/fileUpload';

const handleProfileUpload = async () => {
  const result = await uploadProfilePicture();
  
  if (result.success) {
    console.log('Profile picture uploaded:', result.url);
    // Update UI with the uploaded image
  } else {
    console.error('Upload failed:', result.error);
  }
};
```

### Document Upload

```typescript
import { uploadDocument } from '../utils/fileUpload';

const handleDocumentUpload = async (type: 'id' | 'address') => {
  const result = await uploadDocument(type);
  
  if (result.success) {
    console.log('Document uploaded:', result.url);
    // Update UI with the uploaded document
  } else {
    console.error('Upload failed:', result.error);
  }
};
```

## 🔧 Configuration

### Environment Variables

Make sure your Supabase configuration is set up in your app:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Permissions

The app will request the following permissions:
- **Camera** - For taking profile pictures
- **Photo Library** - For selecting existing images
- **Document Picker** - For selecting documents

## 📱 Integration with Onboarding

The file upload functionality is integrated into the provider onboarding flow:

1. **Profile Picture** - Required in the "Tell us about yourself" section
2. **ID Document** - Required in the "Documents" section
3. **Proof of Address** - Required in the "Documents" section
4. **Driver's License** - Required for personal shoppers in the "Vehicle" section

## 🔍 Admin Panel Integration

Admins can:
- View all uploaded files
- Verify documents
- Access file URLs for review
- Manage file permissions

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure RLS policies are correctly set up
   - Check if user is authenticated

2. **File Upload Fails**
   - Verify file size is within limits
   - Check file type is allowed
   - Ensure storage bucket exists

3. **Database Errors**
   - Run all SQL scripts in correct order
   - Check if tables and triggers exist

### Debug Commands

```sql
-- Check if buckets exist
SELECT * FROM storage.buckets;

-- Check if policies exist
SELECT * FROM storage.policies;

-- Check user documents
SELECT * FROM documents WHERE user_id = 'your-user-id';

-- Check profile pictures
SELECT * FROM profile_pictures WHERE user_id = 'your-user-id';
```

## 📈 Performance Considerations

1. **Image Optimization** - Profile pictures are automatically compressed
2. **Caching** - Use signed URLs for documents with appropriate expiry
3. **Cleanup** - Implement file cleanup for unused uploads
4. **CDN** - Supabase storage uses CDN for fast global access

## 🔄 Future Enhancements

1. **Image Cropping** - Add client-side image cropping
2. **Batch Upload** - Support for multiple file uploads
3. **Progress Tracking** - Real-time upload progress
4. **File Validation** - Server-side file validation
5. **Compression** - Automatic image compression



