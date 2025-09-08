-- =========================================
-- SWIFTLY DATABASE SCHEMA - UPDATED
-- PostgreSQL with Supabase RLS
-- Generated from live database: akqwnbrikxryikjyyyov
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =========================================
-- ENUMS AND TYPES
-- =========================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');

-- Task status
CREATE TYPE task_status AS ENUM (
  'draft', 'posted', 'bidding', 'assigned', 'in_progress',
  'completed', 'cancelled', 'disputed'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded'
);

-- Service categories
CREATE TYPE service_category AS ENUM (
  'shopping', 'handyman', 'cleaning', 'delivery',
  'assembly', 'moving', 'tutoring', 'tech_support',
  'gardening', 'pet_care', 'other'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'task_posted', 'bid_received', 'bid_accepted',
  'task_started', 'task_completed', 'payment_received',
  'review_received', 'system_message'
);

-- =========================================
-- CORE TABLES
-- =========================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_verified BOOLEAN DEFAULT FALSE,
  documents_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Location data
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'South Africa',

  -- Provider specific fields
  bio TEXT,
  skills TEXT[],
  experience_years INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  max_distance_km INTEGER DEFAULT 50,

  -- Verification documents
  id_document_url TEXT,
  proof_of_address_url TEXT,
  qualifications_urls TEXT[],

  -- Vehicle information
  drivers_license_url TEXT,
  vehicle_type TEXT CHECK (vehicle_type = ANY (ARRAY['car'::text, 'motorbike'::text])),
  vehicle_license_plate TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_verified BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(8,2),
  provider_type TEXT CHECK (provider_type = ANY (ARRAY['personal_shopper'::text, 'tasker'::text])),

  -- File references
  profile_picture_id UUID,
  profile_picture_url VARCHAR(500),
  id_document_id UUID,
  proof_of_address_id UUID,
  drivers_license_id UUID,

  -- Smart Float system for provider cash management
  declared_float DECIMAL(8,2) DEFAULT 0,
  float_last_updated TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN DEFAULT FALSE
);

-- Service categories with details
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT,
  color_code TEXT,
  base_price DECIMAL(8,2),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tasks/Requests
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category service_category NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Location
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,

  -- Pricing
  budget_min DECIMAL(8,2) NOT NULL,
  budget_max DECIMAL(8,2) NOT NULL,
  final_price DECIMAL(8,2),

  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_duration_hours INTEGER CHECK (estimated_duration_hours > 0 AND estimated_duration_hours <= 24),
  is_flexible_schedule BOOLEAN DEFAULT FALSE,

  -- Status and assignment
  status task_status DEFAULT 'draft' NOT NULL,
  provider_id UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Task details
  images_urls TEXT[],
  requirements TEXT,
  special_instructions TEXT,

  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CHECK (budget_max >= budget_min)
);

-- Bids/Offers
CREATE TABLE public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Bid details
  proposed_price DECIMAL(8,2) NOT NULL CHECK (proposed_price > 0),
  estimated_hours INTEGER NOT NULL CHECK (estimated_hours > 0 AND estimated_hours <= 24),
  proposed_date DATE,
  proposed_time TIME,
  message TEXT,

  -- Status
  is_accepted BOOLEAN DEFAULT FALSE,
  is_counter_offer BOOLEAN DEFAULT FALSE,
  counter_price DECIMAL(8,2),

  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Constraints
  UNIQUE(task_id, provider_id)
);

-- Payments
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Payment details
  amount DECIMAL(8,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(8,2) NOT NULL CHECK (platform_fee >= 0),
  provider_earnings DECIMAL(8,2) NOT NULL CHECK (provider_earnings >= 0),

  -- Status and tracking
  status payment_status DEFAULT 'pending' NOT NULL,
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  payment_gateway TEXT,

  -- Dates
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Reviews and Ratings
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  review_type TEXT CHECK (review_type = ANY (ARRAY['customer_to_provider'::text, 'provider_to_customer'::text])),

  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Constraints
  UNIQUE(task_id, reviewer_id, reviewee_id)
);

-- Messages/Chat
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text])),
  file_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Related entities
  task_id UUID REFERENCES public.tasks(id),
  sender_id UUID REFERENCES public.profiles(id),

  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Saved addresses/locations
CREATE TABLE public.saved_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  UNIQUE(user_id, name)
);

-- Provider availability schedule
CREATE TABLE public.availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  UNIQUE(provider_id, day_of_week),
  CHECK (end_time > start_time)
);

-- =========================================
-- STORE MANAGEMENT TABLES
-- =========================================

-- Stores
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_image_url TEXT,
  category TEXT DEFAULT 'general',
  
  -- Location
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'South Africa',
  
  -- Store details
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  delivery_fee DECIMAL(8,2) DEFAULT 0,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 60,
  is_open BOOLEAN DEFAULT TRUE,
  opening_hours JSONB,
  operating_hours TEXT,
  
  -- Contact
  contact_phone TEXT,
  contact_email TEXT,
  website_url TEXT,
  
  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Images
CREATE TABLE public.store_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'gallery' CHECK (image_type = ANY (ARRAY['logo'::text, 'banner'::text, 'gallery'::text, 'menu'::text])),
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners
CREATE TABLE public.banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  link_type TEXT DEFAULT 'store' CHECK (link_type = ANY (ARRAY['store'::text, 'category'::text, 'external'::text, 'none'::text])),
  linked_store_id UUID REFERENCES public.stores(id),
  linked_category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions
CREATE TABLE public.promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  store TEXT NOT NULL,
  discount DECIMAL(8,2) DEFAULT 0,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- FILE MANAGEMENT TABLES
-- =========================================

-- Profile Pictures
CREATE TABLE public.profile_pictures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'profile-pictures',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type::text = ANY (ARRAY['id'::character varying, 'address'::character varying, 'drivers_license'::character varying]::text[])),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'documents',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- CMS TABLES
-- =========================================

-- Dashboard Sections
CREATE TABLE public.dashboard_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL,
  section_title TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  section_type TEXT DEFAULT 'list' CHECK (section_type = ANY (ARRAY['list'::text, 'grid'::text, 'carousel'::text, 'hero'::text])),
  max_items INTEGER DEFAULT 10,
  refresh_interval_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS Pages
CREATE TABLE public.cms_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_key TEXT UNIQUE NOT NULL,
  title TEXT,
  meta JSONB,
  content JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- FOREIGN KEY CONSTRAINTS
-- =========================================

-- Profile foreign keys
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_picture_id_fkey 
  FOREIGN KEY (profile_picture_id) REFERENCES public.profile_pictures(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_document_id_fkey 
  FOREIGN KEY (id_document_id) REFERENCES public.documents(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_proof_of_address_id_fkey 
  FOREIGN KEY (proof_of_address_id) REFERENCES public.documents(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_drivers_license_id_fkey 
  FOREIGN KEY (drivers_license_id) REFERENCES public.documents(id);

-- =========================================
-- INDEXES
-- =========================================

-- Performance indexes
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX idx_tasks_provider_id ON public.tasks(provider_id);
CREATE INDEX idx_tasks_category ON public.tasks(category);
CREATE INDEX idx_tasks_location ON public.tasks(latitude, longitude);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at);

CREATE INDEX idx_bids_task_id ON public.bids(task_id);
CREATE INDEX idx_bids_provider_id ON public.bids(provider_id);
CREATE INDEX idx_bids_created_at ON public.bids(created_at);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_city ON public.profiles(city);
CREATE INDEX idx_profiles_rating ON public.profiles(rating);
CREATE INDEX idx_profiles_location ON public.profiles(latitude, longitude);

CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_task_id ON public.payments(task_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX idx_messages_task_id ON public.messages(task_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Store indexes
CREATE INDEX idx_stores_category ON public.stores(category);
CREATE INDEX idx_stores_location ON public.stores(latitude, longitude);
CREATE INDEX idx_stores_is_active ON public.stores(is_active);
CREATE INDEX idx_stores_is_featured ON public.stores(is_featured);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_pictures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_sections ENABLE ROW LEVEL SECURITY;

-- =========================================
-- FUNCTIONS
-- =========================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- TRIGGERS
-- =========================================

-- Auto-update updated_at timestamp
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_bids
  BEFORE UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_messages
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_saved_addresses
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_availability
  BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- INITIAL DATA
-- =========================================

-- Insert default categories
INSERT INTO public.categories (name, slug, description, icon_name, color_code, base_price) VALUES
('Shopping', 'shopping', 'Grocery shopping, essentials delivery', 'shopping-cart', '#FF6B6B', 50.00),
('Handyman', 'handyman', 'Home repairs, installations, maintenance', 'tools', '#4ECDC4', 100.00),
('Cleaning', 'cleaning', 'Home cleaning, office cleaning', 'broom', '#45B7D1', 75.00),
('Delivery', 'delivery', 'Package delivery, document delivery', 'truck', '#96CEB4', 40.00),
('Assembly', 'assembly', 'Furniture assembly, equipment setup', 'cogs', '#FFEAA7', 80.00),
('Moving Help', 'moving', 'Moving assistance, packing help', 'dolly', '#DDA0DD', 120.00),
('Tutoring', 'tutoring', 'Academic tutoring, skill teaching', 'book', '#98D8C8', 60.00),
('Tech Support', 'tech_support', 'Computer repair, software help', 'laptop', '#F7DC6F', 90.00),
('Gardening', 'gardening', 'Garden maintenance, landscaping', 'leaf', '#A8E6CF', 85.00),
('Pet Care', 'pet_care', 'Pet sitting, dog walking', 'paw', '#FFB6C1', 45.00);

-- Insert default dashboard sections
INSERT INTO public.dashboard_sections (section_key, section_title, section_type, sort_order) VALUES
('featured_stores', 'Featured Stores', 'carousel', 1),
('nearby_stores', 'Stores Near You', 'grid', 2),
('categories', 'Browse Categories', 'list', 3),
('promotions', 'Special Offers', 'carousel', 4),
('recent_orders', 'Recent Orders', 'list', 5),
('recommendations', 'Recommended for You', 'grid', 6);



