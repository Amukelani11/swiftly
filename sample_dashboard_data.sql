-- Sample data for the customer dashboard
-- Run this after creating the tables from the schema

-- Insert sample stores
INSERT INTO public.stores (name, description, logo_url, banner_image_url, category, latitude, longitude, address, city, province, rating, review_count, delivery_fee, delivery_time_min, delivery_time_max, is_open, contact_phone, is_featured, sort_order) VALUES
('Fresh Market', 'Fresh groceries and organic produce', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 'grocery', -33.9249, 18.4241, '123 Main St, Cape Town', 'Cape Town', 'Western Cape', 4.8, 245, 15.00, 25, 35, true, '+27123456789', true, 1),
('Ocean Basket', 'Fresh seafood and Mediterranean cuisine', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400', 'seafood', -33.9150, 18.4300, '456 Beach Rd, Cape Town', 'Cape Town', 'Western Cape', 4.6, 189, 20.00, 30, 40, true, '+27123456790', true, 2),
('Coffee Corner', 'Artisan coffee and fresh pastries', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', 'coffee', -33.9300, 18.4200, '789 Coffee St, Cape Town', 'Cape Town', 'Western Cape', 4.9, 156, 10.00, 15, 25, true, '+27123456791', false, 3),
('Pizza Palace', 'Wood-fired pizzas and Italian classics', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', 'italian', -33.9200, 18.4350, '321 Pizza Ave, Cape Town', 'Cape Town', 'Western Cape', 4.7, 312, 18.00, 20, 30, true, '+27123456792', true, 4),
('Healthy Bites', 'Organic salads and healthy meals', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 'healthy', -33.9350, 18.4150, '654 Health St, Cape Town', 'Cape Town', 'Western Cape', 4.5, 98, 12.00, 25, 35, true, '+27123456793', false, 5),
('Burger Junction', 'Gourmet burgers and loaded fries', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'fast_food', -33.9180, 18.4280, '987 Burger Blvd, Cape Town', 'Cape Town', 'Western Cape', 4.4, 234, 16.00, 20, 30, true, '+27123456794', true, 6),
('Sushi Express', 'Fresh sushi and Japanese cuisine', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', 'japanese', -33.9320, 18.4220, '147 Sushi St, Cape Town', 'Cape Town', 'Western Cape', 4.8, 167, 0.00, 25, 40, true, '+27123456795', true, 7),
('Thai Garden', 'Authentic Thai flavors and spices', 'https://images.unsplash.com/photo-1559314809-0f31657def5e?w=200', 'https://images.unsplash.com/photo-1559314809-0f31657def5e?w=400', 'thai', -33.9280, 18.4190, '258 Thai Ave, Cape Town', 'Cape Town', 'Western Cape', 4.6, 143, 14.00, 30, 45, true, '+27123456796', false, 8),
('Indian Spice', 'Authentic Indian curries and tandoor', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400', 'indian', -33.9220, 18.4320, '369 Spice Rd, Cape Town', 'Cape Town', 'Western Cape', 4.7, 201, 17.00, 25, 40, true, '+27123456797', true, 9),
('Mexican Cantina', 'Tacos, burritos and Mexican favorites', 'https://images.unsplash.com/photo-1565299585323-38174c4a6d52?w=200', 'https://images.unsplash.com/photo-1565299585323-38174c4a6d52?w=400', 'mexican', -33.9310, 18.4260, '741 Fiesta St, Cape Town', 'Cape Town', 'Western Cape', 4.3, 87, 19.00, 25, 35, true, '+27123456798', false, 10);

-- Insert sample promotions
INSERT INTO public.promotions (title, description, store, discount, image_url, link_url, start_date, end_date, sort_order) VALUES
('50% Off First Order', 'Get 50% off your first order with any restaurant', 'Ocean Basket', 50.00, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', '/promotions/first-order', NOW(), NOW() + INTERVAL '7 days', 1),
('Free Delivery Weekend', 'Free delivery on all orders this weekend', 'Fresh Market', 0.00, 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400', '/promotions/free-delivery', NOW(), NOW() + INTERVAL '3 days', 2),
('Buy 2 Get 1 Free', 'Coffee special - buy 2 coffees get 1 free', 'Coffee Corner', 33.00, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400', '/promotions/coffee-deal', NOW(), NOW() + INTERVAL '5 days', 3),
('Pizza Tuesday', 'Get 25% off all pizzas every Tuesday', 'Pizza Palace', 25.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', '/promotions/pizza-tuesday', NOW(), NOW() + INTERVAL '14 days', 4);

-- Insert sample banners
INSERT INTO public.banners (title, description, image_url, link_url, link_type, sort_order, is_active, end_date) VALUES
('Summer Special', 'Get up to 50% off on selected restaurants', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=200&fit=crop', '/promotions/summer', 'external', 1, true, NOW() + INTERVAL '30 days'),
('Fast Delivery', 'Order now and get delivery in under 30 minutes', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&h=200&fit=crop', '/fast-delivery', 'external', 2, true, NOW() + INTERVAL '60 days'),
('New Restaurant Alert', 'Discover amazing new restaurants in your area', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=200&fit=crop', '/new-restaurants', 'external', 3, true, NOW() + INTERVAL '45 days');

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
INSERT INTO public.categories (name, slug, description, icon_name, color_code, base_price, display_order, is_featured) VALUES
('Restaurants', 'restaurants', 'Local restaurants and eateries', 'restaurant', '#FF6B6B', 0.00, 1, true),
('Fast Food', 'fast_food', 'Quick bites and fast food chains', 'fast-food', '#FFA500', 0.00, 2, true),
('Coffee & Tea', 'coffee', 'Coffee shops and tea houses', 'cafe', '#8B4513', 0.00, 3, true),
('Desserts', 'desserts', 'Ice cream, cakes, and sweet treats', 'ice-cream', '#FFB6C1', 0.00, 4, false),
('Healthy Food', 'healthy', 'Organic and healthy meal options', 'nutrition', '#32CD32', 0.00, 5, true),
('Asian Cuisine', 'asian', 'Chinese, Thai, Japanese, and more', 'restaurant', '#FF4500', 0.00, 6, true),
('Groceries', 'grocery', 'Fresh groceries and daily essentials', 'storefront', '#4CAF50', 0.00, 7, true),
('Pharmacy', 'pharmacy', 'Medicines and health products', 'medical', '#2196F3', 0.00, 8, false),
('Italian', 'italian', 'Pizza, pasta, and Italian classics', 'pizza', '#FF6347', 0.00, 9, true),
('Seafood', 'seafood', 'Fresh fish and ocean delicacies', 'fish', '#4682B4', 0.00, 10, false),
('Thai', 'thai', 'Authentic Thai cuisine and spices', 'leaf', '#FFD700', 0.00, 11, false),
('Japanese', 'japanese', 'Sushi, ramen, and Japanese dishes', 'fish', '#FF69B4', 0.00, 12, false),
('Indian', 'indian', 'Curry, tandoor, and Indian specialties', 'flame', '#FF8C00', 0.00, 13, false),
('Mexican', 'mexican', 'Tacos, burritos, and Mexican food', 'restaurant', '#32CD32', 0.00, 14, false)
ON CONFLICT (slug) DO NOTHING;