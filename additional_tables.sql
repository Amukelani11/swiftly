-- Additional tables needed for the customer dashboard
-- These tables extend the existing schema for food delivery functionality

-- Stores table for restaurants and food vendors
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  phone TEXT,
  email TEXT,
  
  -- Business info
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  delivery_time TEXT DEFAULT '30-45 min',
  minimum_order DECIMAL(8,2) DEFAULT 0,
  delivery_fee DECIMAL(8,2) DEFAULT 0,
  
  -- Media and branding
  image_url TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  
  -- Categories and features
  category_id UUID REFERENCES public.categories(id),
  cuisine_type TEXT,
  price_range TEXT DEFAULT '$$' CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  
  -- Status and availability
  is_open BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Operating hours (simplified - can be expanded to detailed schedule)
  opening_time TIME DEFAULT '08:00',
  closing_time TIME DEFAULT '22:00',
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions table for deals and discounts
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Promotion details
  title TEXT NOT NULL,
  description TEXT,
  discount DECIMAL(5,2) DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
  
  -- Conditions
  minimum_order DECIMAL(8,2) DEFAULT 0,
  maximum_discount DECIMAL(8,2),
  promo_code TEXT UNIQUE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Media
  image_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners table for promotional banners
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Banner content
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  
  -- Media
  image_url TEXT NOT NULL,
  mobile_image_url TEXT, -- Optional mobile-optimized version
  
  -- Action
  link_url TEXT,
  action_type TEXT DEFAULT 'navigate' CHECK (action_type IN ('navigate', 'external', 'modal')),
  action_data JSONB,
  
  -- Display settings
  position INTEGER DEFAULT 0, -- Order in banner rotation
  display_duration INTEGER DEFAULT 5000, -- Milliseconds to display
  
  -- Targeting (future enhancement)
  target_audience JSONB, -- Can include user segments, locations, etc.
  
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- System fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_rating ON public.stores(rating DESC);
CREATE INDEX IF NOT EXISTS idx_stores_category ON public.stores(category_id);
CREATE INDEX IF NOT EXISTS idx_stores_location ON public.stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stores_featured ON public.stores(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promotions_store ON public.promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(promo_code) WHERE promo_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Stores are viewable by all authenticated users" ON public.stores
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for promotions
CREATE POLICY "Active promotions are viewable by all authenticated users" ON public.promotions
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND is_active = true 
    AND valid_until > NOW()
  );

CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for banners
CREATE POLICY "Active banners are viewable by all authenticated users" ON public.banners
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND is_active = true 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date > NOW())
  );

CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER handle_updated_at_stores
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_promotions
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_banners
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();