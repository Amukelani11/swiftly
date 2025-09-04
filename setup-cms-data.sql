-- Create CMS pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id uuid not null default extensions.uuid_generate_v4(),
  page_key text not null,
  title text null,
  meta jsonb null,
  content jsonb null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint cms_pages_pkey primary key (id),
  constraint cms_pages_page_key_key unique (page_key)
);

-- Enable RLS if needed
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
DROP POLICY IF EXISTS "Allow all operations on cms_pages" ON public.cms_pages;
CREATE POLICY "Allow all operations on cms_pages" ON public.cms_pages
  FOR ALL USING (true);

-- Insert sample CMS page for customer dashboard
INSERT INTO public.cms_pages (page_key, title, meta, content, is_active) 
VALUES (
  'customer_dashboard',
  'Customer Dashboard',
  '{"description": "Main customer dashboard with dynamic sections", "version": "1.0"}',
  '{
    "sections": [
      {
        "section_key": "categories",
        "section_title": "Shop by Category",
        "layout": "pills",
        "is_visible": true,
        "sort_order": 10,
        "max_items": 8
      },
      {
        "section_key": "featured_stores",
        "section_title": "Featured Stores",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 20,
        "max_items": 6,
        "filters": {
          "featured_only": true
        }
      },
      {
        "section_key": "popular_nearby",
        "section_title": "Popular Near You",
        "layout": "list",
        "is_visible": true,
        "sort_order": 30,
        "max_items": 5,
        "filters": {
          "open_only": true,
          "sort": "rating"
        }
      },
      {
        "section_key": "promotions",
        "section_title": "Today''s Deals",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 40,
        "max_items": 4
      }
    ]
  }',
  true
) ON CONFLICT (page_key) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();

-- Insert sample categories data
INSERT INTO public.categories (id, name, slug, description, icon_name, color_code, is_active) VALUES
  (uuid_generate_v4(), 'Fast Food', 'fast-food', 'Quick and convenient fast food', 'fast-food-outline', '#FF6B6B', true),
  (uuid_generate_v4(), 'Restaurants', 'restaurants', 'Fine dining and casual restaurants', 'restaurant-outline', '#4ECDC4', true),
  (uuid_generate_v4(), 'Grocery', 'grocery', 'Fresh groceries and essentials', 'basket-outline', '#45B7D1', true),
  (uuid_generate_v4(), 'Coffee', 'coffee', 'Coffee shops and cafes', 'cafe-outline', '#96CEB4', true),
  (uuid_generate_v4(), 'Pizza', 'pizza', 'Pizza delivery and takeaway', 'pizza-outline', '#FFEAA7', true),
  (uuid_generate_v4(), 'Asian', 'asian', 'Asian cuisine and restaurants', 'restaurant-outline', '#DDA0DD', true),
  (uuid_generate_v4(), 'Desserts', 'desserts', 'Sweet treats and desserts', 'ice-cream-outline', '#F7DC6F', true),
  (uuid_generate_v4(), 'Healthy', 'healthy', 'Healthy and organic options', 'leaf-outline', '#A8E6CF', true)
ON CONFLICT (slug) DO NOTHING;

-- Create stores table if it doesn't exist (based on your existing structure)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid not null default extensions.uuid_generate_v4(),
  name text not null,
  description text,
  address text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  rating decimal(3,2) default 0,
  delivery_time text,
  minimum_order decimal(8,2) default 0,
  delivery_fee decimal(8,2) default 0,
  image_url text,
  category_id uuid references public.categories(id),
  distance decimal(5,2) default 0,
  is_featured boolean default false,
  is_open boolean default true,
  eta integer default 30,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint stores_pkey primary key (id)
);

-- Create promotions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid not null default extensions.uuid_generate_v4(),
  title text not null,
  description text,
  discount integer default 0,
  valid_until timestamp with time zone,
  store_id uuid references public.stores(id),
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint promotions_pkey primary key (id)
);

-- Enable RLS for stores and promotions
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create policies for stores and promotions (allow all for now)
DROP POLICY IF EXISTS "Allow all operations on stores" ON public.stores;
CREATE POLICY "Allow all operations on stores" ON public.stores
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on promotions" ON public.promotions;
CREATE POLICY "Allow all operations on promotions" ON public.promotions
  FOR ALL USING (true);

-- Insert sample stores (get category IDs first)
DO $$
DECLARE
  fast_food_id uuid;
  restaurant_id uuid;
  grocery_id uuid;
  coffee_id uuid;
  pizza_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO fast_food_id FROM public.categories WHERE slug = 'fast-food' LIMIT 1;
  SELECT id INTO restaurant_id FROM public.categories WHERE slug = 'restaurants' LIMIT 1;
  SELECT id INTO grocery_id FROM public.categories WHERE slug = 'grocery' LIMIT 1;
  SELECT id INTO coffee_id FROM public.categories WHERE slug = 'coffee' LIMIT 1;
  SELECT id INTO pizza_id FROM public.categories WHERE slug = 'pizza' LIMIT 1;

  -- Insert sample stores
  INSERT INTO public.stores (name, description, address, rating, delivery_time, minimum_order, delivery_fee, image_url, category_id, distance, is_featured, is_open, eta) VALUES
    ('McDonald''s', 'Fast food favorites delivered quickly', '123 Main St, Cape Town', 4.2, '25-35 min', 50, 15, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400', fast_food_id, 1.2, true, true, 25),
    ('Spur Steak Ranches', 'Flame-grilled steaks and family favorites', '456 Oak Ave, Cape Town', 4.5, '35-45 min', 80, 20, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', restaurant_id, 2.1, true, true, 40),
    ('Woolworths Food', 'Quality groceries and fresh produce', '789 Pine Rd, Cape Town', 4.3, '45-60 min', 100, 0, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', grocery_id, 0.8, false, true, 50),
    ('Vida e Caffè', 'Premium coffee and light meals', '321 Coffee St, Cape Town', 4.7, '15-25 min', 30, 10, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', coffee_id, 0.5, true, true, 20),
    ('Debonairs Pizza', 'Freshly made pizzas with quality toppings', '654 Pizza Lane, Cape Town', 4.1, '30-40 min', 60, 18, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', pizza_id, 1.8, false, true, 35);

  -- Insert sample promotions
  INSERT INTO public.promotions (title, description, discount, valid_until, store_id, image_url)
  SELECT 
    promo.title,
    promo.description,
    promo.discount,
    promo.valid_until,
    s.id,
    promo.image_url
  FROM (VALUES
    ('50% Off First Order', 'Get half price on your first McDonald''s order', 50, now() + interval '7 days', 'McDonald''s', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400'),
    ('Free Coffee Friday', 'Buy any meal and get a free coffee at Vida e Caffè', 30, now() + interval '3 days', 'Vida e Caffè', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'),
    ('Family Feast Deal', 'Family meal for 4 at Spur - includes dessert', 25, now() + interval '5 days', 'Spur Steak Ranches', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'),
    ('Free Delivery Weekend', 'No delivery fees on orders over R100 this weekend', 15, now() + interval '2 days', 'Woolworths Food', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400')
  ) AS promo(title, description, discount, valid_until, store_name, image_url)
  JOIN public.stores s ON s.name = promo.store_name;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cms_pages_page_key ON public.cms_pages(page_key);
CREATE INDEX IF NOT EXISTS idx_cms_pages_is_active ON public.cms_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_is_featured ON public.stores(is_featured);
CREATE INDEX IF NOT EXISTS idx_stores_is_open ON public.stores(is_open);
CREATE INDEX IF NOT EXISTS idx_stores_rating ON public.stores(rating);
CREATE INDEX IF NOT EXISTS idx_promotions_valid_until ON public.promotions(valid_until);

-- Grant necessary permissions (adjust as needed)
GRANT ALL ON public.cms_pages TO authenticated;
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.promotions TO authenticated;
GRANT ALL ON public.categories TO authenticated;

-- Display created data
SELECT 'CMS Pages created:' as info;
SELECT page_key, title, is_active FROM public.cms_pages;

SELECT 'Categories created:' as info;
SELECT name, slug, color_code FROM public.categories LIMIT 5;

SELECT 'Stores created:' as info;
SELECT name, rating, is_featured, is_open FROM public.stores;

SELECT 'Promotions created:' as info;
SELECT title, discount, valid_until > now() as is_active FROM public.promotions;