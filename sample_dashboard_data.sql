-- Sample data for the customer dashboard
-- Run this after creating the additional tables

-- Insert sample stores
INSERT INTO public.stores (name, description, address, latitude, longitude, phone, rating, delivery_time, minimum_order, delivery_fee, image_url, cuisine_type, price_range, is_featured, is_open) VALUES
('Fresh Market', 'Fresh groceries and organic produce', '123 Main St, Cape Town', -33.9249, 18.4241, '+27123456789', 4.8, '25-35 min', 50.00, 15.00, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 'Grocery', '$$', true, true),
('Ocean Basket', 'Fresh seafood and Mediterranean cuisine', '456 Beach Rd, Cape Town', -33.9150, 18.4300, '+27123456790', 4.6, '30-40 min', 80.00, 20.00, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400', 'Seafood', '$$$', true, true),
('Coffee Corner', 'Artisan coffee and fresh pastries', '789 Coffee St, Cape Town', -33.9300, 18.4200, '+27123456791', 4.9, '15-25 min', 30.00, 10.00, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', 'Coffee', '$', false, true),
('Pizza Palace', 'Wood-fired pizzas and Italian classics', '321 Pizza Ave, Cape Town', -33.9200, 18.4350, '+27123456792', 4.7, '20-30 min', 60.00, 18.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', 'Italian', '$$', true, true),
('Healthy Bites', 'Organic salads and healthy meals', '654 Health St, Cape Town', -33.9350, 18.4150, '+27123456793', 4.5, '25-35 min', 45.00, 12.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 'Healthy', '$$', false, true),
('Burger Junction', 'Gourmet burgers and loaded fries', '987 Burger Blvd, Cape Town', -33.9180, 18.4280, '+27123456794', 4.4, '20-30 min', 55.00, 16.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'Fast Food', '$$', true, true),
('Sushi Express', 'Fresh sushi and Japanese cuisine', '147 Sushi St, Cape Town', -33.9320, 18.4220, '+27123456795', 4.8, '25-40 min', 70.00, 0.00, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', 'Japanese', '$$$', true, true),
('Thai Garden', 'Authentic Thai flavors and spices', '258 Thai Ave, Cape Town', -33.9280, 18.4190, '+27123456796', 4.6, '30-45 min', 65.00, 14.00, 'https://images.unsplash.com/photo-1559314809-0f31657def5e?w=400', 'Thai', '$$', false, true);

-- Insert sample promotions
INSERT INTO public.promotions (store_id, title, description, discount, minimum_order, promo_code, valid_until, image_url) VALUES
((SELECT id FROM public.stores WHERE name = 'Ocean Basket'), '50% Off First Order', 'Get 50% off your first order with any restaurant', 50.00, 80.00, 'FIRST50', NOW() + INTERVAL '7 days', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'),
((SELECT id FROM public.stores WHERE name = 'Fresh Market'), 'Free Delivery Weekend', 'Free delivery on all orders this weekend', 0.00, 50.00, 'FREEDEL', NOW() + INTERVAL '3 days', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400'),
((SELECT id FROM public.stores WHERE name = 'Coffee Corner'), 'Buy 2 Get 1 Free', 'Coffee special - buy 2 coffees get 1 free', 33.00, 30.00, 'COFFEE3', NOW() + INTERVAL '5 days', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'),
((SELECT id FROM public.stores WHERE name = 'Pizza Palace'), 'Pizza Tuesday', 'Get 25% off all pizzas every Tuesday', 25.00, 60.00, 'PIZZATUES', NOW() + INTERVAL '14 days', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400');

-- Insert sample banners
INSERT INTO public.banners (title, subtitle, image_url, link_url, position, is_active, end_date) VALUES
('Summer Special', 'Get up to 50% off on selected restaurants', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=200&fit=crop', '/promotions/summer', 1, true, NOW() + INTERVAL '30 days'),
('Fast Delivery', 'Order now and get delivery in under 30 minutes', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&h=200&fit=crop', '/fast-delivery', 2, true, NOW() + INTERVAL '60 days'),
('New Restaurant Alert', 'Discover amazing new restaurants in your area', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=200&fit=crop', '/new-restaurants', 3, true, NOW() + INTERVAL '45 days');

-- Update categories with proper icons and colors for food delivery
UPDATE public.categories SET 
  icon_name = CASE 
    WHEN slug = 'shopping' THEN 'basket'
    WHEN slug = 'delivery' THEN 'bicycle'
    ELSE icon_name
  END,
  color_code = CASE
    WHEN slug = 'shopping' THEN '#FF6B6B'
    WHEN slug = 'handyman' THEN '#4ECDC4' 
    WHEN slug = 'cleaning' THEN '#45B7D1'
    WHEN slug = 'delivery' THEN '#96CEB4'
    WHEN slug = 'assembly' THEN '#FFEAA7'
    WHEN slug = 'moving' THEN '#DDA0DD'
    WHEN slug = 'tutoring' THEN '#98D8C8'
    WHEN slug = 'tech_support' THEN '#F7DC6F'
    WHEN slug = 'gardening' THEN '#A8E6CF'
    WHEN slug = 'pet_care' THEN '#FFB6C1'
    ELSE color_code
  END
WHERE slug IN ('shopping', 'handyman', 'cleaning', 'delivery', 'assembly', 'moving', 'tutoring', 'tech_support', 'gardening', 'pet_care');

-- Add some food-specific categories
INSERT INTO public.categories (name, slug, description, icon_name, color_code, base_price) VALUES
('Restaurants', 'restaurants', 'Local restaurants and eateries', 'restaurant', '#FF6B6B', 0.00),
('Fast Food', 'fast-food', 'Quick bites and fast food chains', 'fast-food', '#FFA500', 0.00),
('Coffee & Tea', 'coffee', 'Coffee shops and tea houses', 'cafe', '#8B4513', 0.00),
('Desserts', 'desserts', 'Ice cream, cakes, and sweet treats', 'ice-cream', '#FFB6C1', 0.00),
('Healthy Food', 'healthy', 'Organic and healthy meal options', 'nutrition', '#32CD32', 0.00),
('Asian Cuisine', 'asian', 'Chinese, Thai, Japanese, and more', 'restaurant', '#FF4500', 0.00),
('Groceries', 'grocery', 'Fresh groceries and daily essentials', 'storefront', '#4CAF50', 0.00),
('Pharmacy', 'pharmacy', 'Medicines and health products', 'medical', '#2196F3', 0.00)
ON CONFLICT (slug) DO NOTHING;