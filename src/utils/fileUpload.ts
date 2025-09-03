import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ProfilePictureUploadResult extends UploadResult {
  profilePictureId?: string;
}

export interface DocumentUploadResult extends UploadResult {
  documentId?: string;
}

// Request permissions for camera and photo library
export const requestMediaPermissions = async () => {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  return {
    camera: cameraStatus === 'granted',
    library: libraryStatus === 'granted'
  };
};

// Upload profile picture
export const uploadProfilePicture = async (): Promise<ProfilePictureUploadResult> => {
  try {
    // Request permissions
    const permissions = await requestMediaPermissions();
    if (!permissions.library) {
      return {
        success: false,
        error: 'Permission to access photo library is required'
      };
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pictures
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets[0]) {
      return {
        success: false,
        error: 'No image selected'
      };
    }

    const asset = result.assets[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const fileName = `profile-${Date.now()}.${asset.type === 'image' ? 'jpg' : 'png'}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload using Supabase client for consistency
    if (!asset.uri) {
      return {
        success: false,
        error: 'No file URI provided'
      };
    }

    // Read file as base64, then convert to binary for proper upload
    const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64
    });



    // Convert base64 to Uint8Array for proper binary upload
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);



    // Upload binary data to Supabase profile-pictures bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, byteArray, {
        contentType: asset.type === 'image' ? 'image/jpeg' : 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('📸 Upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload image: ${uploadError.message}`
      };
    }

    // Use binary data size
    const actualSize = byteArray.length;

    // Get public URL from Supabase
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);



    // Test download to verify file was uploaded correctly
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('profile-pictures')
      .download(filePath);

    if (downloadError) {
      console.error('Profile picture download test failed:', downloadError);
    }

    const { data: profilePictureData, error: dbError } = await supabase
      .from('profile_pictures')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: urlData.publicUrl,
        file_size: downloadData?.size || actualSize,
        mime_type: asset.type === 'image' ? 'image/jpeg' : 'image/png',
        storage_bucket: 'profile-pictures'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Profile picture database error:', dbError);
      return {
        success: false,
        error: 'Failed to save profile picture data'
      };
    }

    return {
      success: true,
      url: fullPublicUrl,
      fileName: fileName,
      fileSize: downloadData?.size || asset.fileSize || 0,
      mimeType: asset.type === 'image' ? 'image/jpeg' : 'image/png',
      profilePictureId: profilePictureData.id
    };

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

// Upload document (ID, proof of address, or driver's license)
export const uploadDocument = async (documentType: 'id' | 'address' | 'drivers_license'): Promise<DocumentUploadResult> => {
  try {
    // Pick document
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return {
        success: false,
        error: 'No document selected'
      };
    }

    const asset = result.assets[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const fileName = `${documentType}-${Date.now()}.${asset.mimeType?.includes('pdf') ? 'pdf' : 'jpg'}`;
    const filePath = `${user.id}/${fileName}`;

    if (!asset.uri) {
      return {
        success: false,
        error: 'No file URI provided'
      };
    }

    // Read file as base64, then convert to binary for proper upload
    const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64
    });



    // Convert base64 to Uint8Array for proper binary upload
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);



    // Upload binary data to Supabase documents bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, byteArray, {
        contentType: asset.mimeType || 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error(`📄 Upload error for ${documentType}:`, uploadError);
      return {
        success: false,
        error: `Failed to upload document: ${uploadError.message}`
      };
    }

    // Use binary data size
    const actualSize = byteArray.length;

    if (actualSize === 0) {
      console.error(`📄 File is empty for ${documentType}`);
      return {
        success: false,
        error: 'Document file is empty'
      };
    }

    // Get public URL from Supabase
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Test download to verify file was uploaded correctly
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError) {
      console.error(`Document download test failed for ${documentType}:`, downloadError);
    }

    const { data: documentData, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        document_type: documentType,
        file_name: fileName,
        file_path: urlData.publicUrl,
        file_size: downloadData?.size || actualSize,
        mime_type: asset.mimeType || 'application/pdf',
        storage_bucket: 'documents'
      })
      .select()
      .single();

    if (dbError) {
      console.error(`Database error for ${documentType}:`, dbError);
      return {
        success: false,
        error: 'Failed to save document data'
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: fileName,
      fileSize: downloadData?.size || actualSize,
      mimeType: asset.mimeType || 'application/pdf',
      documentId: documentData.id
    };

  } catch (error) {
    console.error(`Document upload error for ${documentType}:`, error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

// Delete file from storage
export const deleteFile = async (bucket: string, filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
};

// Get file URL (public or signed)
export const getFileUrl = async (bucket: string, filePath: string, isPublic: boolean = false) => {
  if (isPublic) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return data.publicUrl;
  } else {
    const { data } = supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    return data?.signedUrl;
  }
};

