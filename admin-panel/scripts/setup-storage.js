m const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://akqwnbrikxryikjyyyov.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNDU3NywiZXhwIjoyMDcxNjEwNTc3fQ.sw-1uz2zU7k077XjYJjvZjZy-0cHIIY1EPF_bfZvg1o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupStorageBuckets() {
  try {
    console.log('🚀 Setting up Supabase Storage buckets...');

    // Create store-images bucket
    console.log('📦 Creating store-images bucket...');
    const { data: storeImagesBucket, error: storeImagesError } = await supabase.storage.createBucket('store-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (storeImagesError) {
      if (storeImagesError.message.includes('already exists')) {
        console.log('✅ store-images bucket already exists');
      } else {
        console.error('❌ Error creating store-images bucket:', storeImagesError);
      }
    } else {
      console.log('✅ store-images bucket created successfully');
    }

    // Create banners bucket
    console.log('📦 Creating banners bucket...');
    const { data: bannersBucket, error: bannersError } = await supabase.storage.createBucket('banners', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10485760, // 10MB for banner images
    });

    if (bannersError) {
      if (bannersError.message.includes('already exists')) {
        console.log('✅ banners bucket already exists');
      } else {
        console.error('❌ Error creating banners bucket:', bannersError);
      }
    } else {
      console.log('✅ banners bucket created successfully');
    }

    // Create profile-pictures bucket
    console.log('📦 Creating profile-pictures bucket...');
    const { data: profilePicsBucket, error: profilePicsError } = await supabase.storage.createBucket('profile-pictures', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (profilePicsError) {
      if (profilePicsError.message.includes('already exists')) {
        console.log('✅ profile-pictures bucket already exists');
      } else {
        console.error('❌ Error creating profile-pictures bucket:', profilePicsError);
      }
    } else {
      console.log('✅ profile-pictures bucket created successfully');
    }

    // Create documents bucket
    console.log('📦 Creating documents bucket...');
    const { data: documentsBucket, error: documentsError } = await supabase.storage.createBucket('documents', {
      public: false, // Private bucket for sensitive documents
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      fileSizeLimit: 10485760, // 10MB
    });

    if (documentsError) {
      if (documentsError.message.includes('already exists')) {
        console.log('✅ documents bucket already exists');
      } else {
        console.error('❌ Error creating documents bucket:', documentsError);
      }
    } else {
      console.log('✅ documents bucket created successfully');
    }

    console.log('\n🎉 Storage bucket setup completed!');
    console.log('\n📋 Available buckets:');
    console.log('  • store-images - for store logos and images');
    console.log('  • banners - for promotional banners');
    console.log('  • profile-pictures - for user profile images');
    console.log('  • documents - for verification documents');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupStorageBuckets();
