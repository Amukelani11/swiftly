-- =========================================
-- SWIFTLY DATABASE SCHEMA
-- PostgreSQL with Supabase RLS
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
-- TABLES
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
  estimated_duration_hours INTEGER,
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
  CHECK (budget_max >= budget_min),
  CHECK (estimated_duration_hours > 0 AND estimated_duration_hours <= 24)
);

-- Bids/Offers
CREATE TABLE public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Bid details
  proposed_price DECIMAL(8,2) NOT NULL,
  estimated_hours INTEGER NOT NULL,
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
  UNIQUE(task_id, provider_id),
  CHECK (proposed_price > 0),
  CHECK (estimated_hours > 0 AND estimated_hours <= 24)
);

-- Payments
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Payment details
  amount DECIMAL(8,2) NOT NULL,
  platform_fee DECIMAL(8,2) NOT NULL,
  provider_earnings DECIMAL(8,2) NOT NULL,

  -- Status and tracking
  status payment_status DEFAULT 'pending' NOT NULL,
  payment_method TEXT, -- 'card', 'bank_transfer', etc.
  transaction_id TEXT UNIQUE,
  payment_gateway TEXT, -- 'stripe', 'paystack', etc.

  -- Dates
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Constraints
  CHECK (amount > 0),
  CHECK (platform_fee >= 0),
  CHECK (provider_earnings >= 0)
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

  -- Review type (customer reviewing provider or vice versa)
  review_type TEXT CHECK (review_type IN ('customer_to_provider', 'provider_to_customer')),

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
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
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
  data JSONB, -- Additional data for the notification

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
  name TEXT NOT NULL, -- 'Home', 'Work', 'Gym', etc.
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

  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  UNIQUE(provider_id, day_of_week),
  CHECK (end_time > start_time)
);

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

-- Categories are public
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by all authenticated users" ON public.profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    role IN ('customer', 'provider')
  );

CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Tasks policies
CREATE POLICY "Users can view tasks in their area" ON public.tasks
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    status IN ('posted', 'bidding', 'assigned', 'in_progress', 'completed')
  );

CREATE POLICY "Customers can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('customer', 'provider')
    )
  );

CREATE POLICY "Customers can update their own tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = customer_id OR
    (auth.uid() = provider_id AND status IN ('assigned', 'in_progress'))
  );

-- Bids policies
CREATE POLICY "Providers can view bids on tasks" ON public.bids
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id
    )
  );

CREATE POLICY "Providers can create bids" ON public.bids
  FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'provider'
    ) AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND status = 'bidding'
    )
  );

CREATE POLICY "Providers can update their own bids" ON public.bids
  FOR UPDATE USING (auth.uid() = provider_id);

-- Payments policies
CREATE POLICY "Users can view payments for their tasks" ON public.payments
  FOR SELECT USING (
    auth.uid() = customer_id OR auth.uid() = provider_id
  );

CREATE POLICY "System can create payments" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update payments" ON public.payments
  FOR UPDATE USING (true);

-- Reviews policies
CREATE POLICY "Users can view reviews" ON public.reviews
  FOR SELECT USING (
    auth.role() = 'authenticated' OR
    auth.uid() = reviewer_id OR
    auth.uid() = reviewee_id
  );

CREATE POLICY "Users can create reviews for completed tasks" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND
      (customer_id = auth.uid() OR provider_id = auth.uid()) AND
      status = 'completed'
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages for their tasks" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Users can send messages for their tasks" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND
      (customer_id = auth.uid() OR provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Saved addresses policies
CREATE POLICY "Users can manage their own addresses" ON public.saved_addresses
  FOR ALL USING (auth.uid() = user_id);

-- Availability policies
CREATE POLICY "Providers can manage their availability" ON public.availability
  FOR ALL USING (auth.uid() = provider_id);

-- Categories are public
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

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

-- Function to calculate distance between two points (in km)
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
  earth_radius DECIMAL := 6371; -- Earth radius in km
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);

  a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby providers
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  task_lat DECIMAL,
  task_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 50,
  category_filter service_category DEFAULT NULL
)
RETURNS TABLE (
  provider_id UUID,
  distance_km DECIMAL,
  rating DECIMAL,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    public.calculate_distance(task_lat, task_lng, p.latitude, p.longitude) as distance_km,
    p.rating,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE
    p.role = 'provider'
    AND p.is_available = TRUE
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND public.calculate_distance(task_lat, task_lng, p.latitude, p.longitude) <= max_distance_km
    AND (category_filter IS NULL OR category_filter = ANY(p.skills))
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  user_id UUID,
  notification_type notification_type,
  title TEXT,
  message TEXT,
  task_id UUID DEFAULT NULL,
  sender_id UUID DEFAULT NULL,
  data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, task_id, sender_id, data)
  VALUES (user_id, notification_type, title, message, task_id, sender_id, data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate provider rating
CREATE OR REPLACE FUNCTION public.update_provider_rating(provider_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  new_rating DECIMAL;
  review_count INTEGER;
BEGIN
  SELECT
    AVG(rating)::DECIMAL(3,2),
    COUNT(*)
  INTO new_rating, review_count
  FROM public.reviews
  WHERE reviewee_id = provider_id AND review_type = 'customer_to_provider';

  UPDATE public.profiles
  SET
    rating = new_rating,
    total_reviews = review_count,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = provider_id;

  RETURN new_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process payment
CREATE OR REPLACE FUNCTION public.process_task_payment(
  task_id UUID,
  payment_amount DECIMAL,
  payment_method TEXT DEFAULT 'card'
)
RETURNS UUID AS $$
DECLARE
  task_record RECORD;
  payment_id UUID;
  platform_fee_rate DECIMAL := 0.15; -- 15% platform fee
BEGIN
  -- Get task details
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF task_record.status != 'completed' THEN
    RAISE EXCEPTION 'Task must be completed to process payment';
  END IF;

  IF task_record.final_price IS NULL THEN
    RAISE EXCEPTION 'Task must have a final price set';
  END IF;

  -- Calculate fees
  INSERT INTO public.payments (
    task_id,
    customer_id,
    provider_id,
    amount,
    platform_fee,
    provider_earnings,
    payment_method,
    status
  ) VALUES (
    task_id,
    task_record.customer_id,
    task_record.provider_id,
    payment_amount,
    payment_amount * platform_fee_rate,
    payment_amount * (1 - platform_fee_rate),
    payment_method,
    'pending'
  ) RETURNING id INTO payment_id;

  -- Update provider earnings
  UPDATE public.profiles
  SET total_earnings = total_earnings + (payment_amount * (1 - platform_fee_rate))
  WHERE id = task_record.provider_id;

  -- Create notifications
  PERFORM public.create_notification(
    task_record.provider_id,
    'payment_received',
    'Payment Received',
    'You have received payment for a completed task',
    task_id,
    task_record.customer_id
  );

  RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task statistics
CREATE OR REPLACE FUNCTION public.get_task_statistics(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_tasks_created', COALESCE(t1.total_created, 0),
    'total_tasks_completed', COALESCE(t2.total_completed, 0),
    'total_earnings', COALESCE(p.total_earnings, 0),
    'average_rating', COALESCE(r.avg_rating, 0),
    'completion_rate', CASE
      WHEN COALESCE(t1.total_created, 0) > 0
      THEN ROUND((COALESCE(t2.total_completed, 0)::DECIMAL / t1.total_created) * 100, 2)
      ELSE 0
    END
  ) INTO stats
  FROM
    (SELECT COUNT(*) as total_created FROM public.tasks WHERE customer_id = user_id) t1,
    (SELECT COUNT(*) as total_completed FROM public.tasks WHERE customer_id = user_id AND status = 'completed') t2,
    (SELECT SUM(amount) as total_earnings FROM public.payments WHERE provider_id = user_id AND status = 'completed') p,
    (SELECT AVG(rating) as avg_rating FROM public.reviews WHERE reviewee_id = user_id) r;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Auto-update rating when review is added
CREATE OR REPLACE FUNCTION public.trigger_update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update rating for provider reviews
  IF NEW.review_type = 'customer_to_provider' THEN
    PERFORM public.update_provider_rating(NEW.reviewee_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_provider_rating();

-- =========================================
-- VIEWS
-- =========================================

-- View for active tasks with provider info
CREATE VIEW public.active_tasks AS
SELECT
  t.*,
  c.name as category_name,
  c.icon_name as category_icon,
  p.full_name as provider_name,
  p.phone as provider_phone,
  p.rating as provider_rating
FROM public.tasks t
LEFT JOIN public.categories c ON t.category::text = c.slug
LEFT JOIN public.profiles p ON t.provider_id = p.id
WHERE t.status IN ('posted', 'bidding', 'assigned', 'in_progress');

-- View for provider earnings
CREATE VIEW public.provider_earnings AS
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(SUM(pay.provider_earnings), 0) as total_earnings,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT t.id) as completed_tasks,
  COUNT(DISTINCT r.id) as total_reviews
FROM public.profiles p
LEFT JOIN public.tasks t ON p.id = t.provider_id AND t.status = 'completed'
LEFT JOIN public.payments pay ON t.id = pay.task_id AND pay.status = 'completed'
LEFT JOIN public.reviews r ON p.id = r.reviewee_id AND r.review_type = 'customer_to_provider'
WHERE p.role = 'provider'
GROUP BY p.id, p.full_name, p.email;

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

-- =========================================
-- COMPREHENSIVE INDEXES FOR PERFORMANCE
-- =========================================

-- Spatial indexes for location-based queries (if PostGIS is available)
DO $$
BEGIN
    -- Check if PostGIS is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        -- Create spatial indexes using PostGIS functions
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tasks_location_geom ON public.tasks USING gist (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_location_geom ON public.profiles USING gist (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))';
    ELSE
        -- Fallback: Create regular indexes on latitude/longitude columns
        CREATE INDEX IF NOT EXISTS idx_tasks_location ON public.tasks (latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (latitude, longitude);
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        -- Fallback if PostGIS functions are not available
        CREATE INDEX IF NOT EXISTS idx_tasks_location ON public.tasks (latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (latitude, longitude);
END $$;

-- Full text search indexes (with error handling)
DO $$
BEGIN
    -- Create task search index
    CREATE INDEX IF NOT EXISTS idx_tasks_search ON public.tasks USING gin (
      to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(requirements, ''))
    );
EXCEPTION
    WHEN others THEN
        -- Fallback: simpler index without concatenation
        CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON public.tasks USING gin (to_tsvector('english', COALESCE(title, '')));
        CREATE INDEX IF NOT EXISTS idx_tasks_desc_search ON public.tasks USING gin (to_tsvector('english', COALESCE(description, '')));
END $$;

DO $$
BEGIN
    -- Create profile search index
    CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING gin (
      to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(bio, ''))
    );
EXCEPTION
    WHEN others THEN
        -- Fallback: simpler index without concatenation
        CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles USING gin (to_tsvector('english', COALESCE(full_name, '')));
END $$;

-- Regular indexes for skills (without array_to_string)
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON public.profiles USING gin (skills);
