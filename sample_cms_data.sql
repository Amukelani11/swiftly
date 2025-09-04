-- Sample CMS data for customer dashboard
-- Insert this into your Supabase SQL editor to test the new dashboard
-- ALL content including categories, stores, banners, promotions is in the CMS

INSERT INTO public.cms_pages (page_key, title, content, is_active) 
VALUES (
  'customer_dashboard',
  'Customer Dashboard',
  '{
    "sections": [
      {
        "section_key": "search",
        "section_title": "",
        "layout": "text",
        "is_visible": true,
        "sort_order": 0
      },
      {
        "section_key": "banners",
        "section_title": "",
        "layout": "banner",
        "is_visible": true,
        "sort_order": 1,
        "max_items": 3,
        "banners": [
          {
            "id": "1",
            "title": "Summer Special",
            "description": "Get up to 50% off on selected restaurants",
            "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=200&fit=crop",
            "link_url": "/promotions/summer"
          },
          {
            "id": "2", 
            "title": "Fast Delivery",
            "description": "Order now and get delivery in under 30 minutes",
            "image_url": "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&h=200&fit=crop",
            "link_url": "/fast-delivery"
          }
        ]
      },
      {
        "section_key": "categories",
        "section_title": "What are you looking for?",
        "layout": "pills",
        "is_visible": true,
        "sort_order": 2,
        "max_items": 8,
        "categories": [
          {
            "id": "1",
            "name": "Restaurants",
            "slug": "restaurants",
            "icon_name": "restaurant",
            "color_code": "#FF6B6B"
          },
          {
            "id": "2",
            "name": "Fast Food", 
            "slug": "fast_food",
            "icon_name": "fast-food",
            "color_code": "#FFA500"
          },
          {
            "id": "3",
            "name": "Coffee",
            "slug": "coffee", 
            "icon_name": "cafe",
            "color_code": "#8B4513"
          },
          {
            "id": "4",
            "name": "Healthy",
            "slug": "healthy",
            "icon_name": "nutrition", 
            "color_code": "#32CD32"
          },
          {
            "id": "5",
            "name": "Groceries",
            "slug": "grocery",
            "icon_name": "storefront",
            "color_code": "#4CAF50"
          },
          {
            "id": "6",
            "name": "Desserts",
            "slug": "desserts",
            "icon_name": "ice-cream",
            "color_code": "#FFB6C1"
          }
        ]
      },
      {
        "section_key": "featured_stores",
        "section_title": "Featured restaurants",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 3,
        "max_items": 6,
        "stores": [
          {
            "id": "1",
            "name": "Fresh Market",
            "description": "Fresh groceries and organic produce",
            "banner_image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
            "category": "grocery",
            "rating": 4.8,
            "review_count": 245,
            "delivery_fee": 15,
            "delivery_time_min": 25,
            "delivery_time_max": 35,
            "is_open": true,
            "is_featured": true
          },
          {
            "id": "2",
            "name": "Ocean Basket", 
            "description": "Fresh seafood and Mediterranean cuisine",
            "banner_image_url": "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400",
            "category": "seafood",
            "rating": 4.6,
            "review_count": 189,
            "delivery_fee": 20,
            "delivery_time_min": 30,
            "delivery_time_max": 40,
            "is_open": true,
            "is_featured": true
          },
          {
            "id": "3",
            "name": "Pizza Palace",
            "description": "Wood-fired pizzas and Italian classics", 
            "banner_image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            "category": "italian",
            "rating": 4.7,
            "review_count": 312,
            "delivery_fee": 18,
            "delivery_time_min": 20,
            "delivery_time_max": 30,
            "is_open": true,
            "is_featured": true
          }
        ]
      },
      {
        "section_key": "popular_nearby",
        "section_title": "Popular near you",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 4,
        "max_items": 6,
        "stores": [
          {
            "id": "4",
            "name": "Coffee Corner",
            "description": "Artisan coffee and fresh pastries",
            "banner_image_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
            "category": "coffee",
            "rating": 4.9,
            "review_count": 156,
            "delivery_fee": 10,
            "delivery_time_min": 15,
            "delivery_time_max": 25,
            "is_open": true,
            "is_featured": false
          },
          {
            "id": "5",
            "name": "Sushi Express",
            "description": "Fresh sushi and Japanese cuisine",
            "banner_image_url": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400", 
            "category": "japanese",
            "rating": 4.8,
            "review_count": 167,
            "delivery_fee": 0,
            "delivery_time_min": 25,
            "delivery_time_max": 40,
            "is_open": true,
            "is_featured": true
          }
        ]
      },
      {
        "section_key": "promotions",
        "section_title": "Today'\''s deals",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 5,
        "max_items": 4,
        "promotions": [
          {
            "id": "1",
            "title": "50% Off First Order",
            "description": "Get 50% off your first order with any restaurant",
            "store": "Ocean Basket",
            "discount": 50,
            "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400"
          },
          {
            "id": "2",
            "title": "Free Delivery Weekend", 
            "description": "Free delivery on all orders this weekend",
            "store": "Fresh Market",
            "discount": 0,
            "image_url": "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400"
          },
          {
            "id": "3",
            "title": "Buy 2 Get 1 Free",
            "description": "Coffee special - buy 2 coffees get 1 free",
            "store": "Coffee Corner", 
            "discount": 33,
            "image_url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400"
          }
        ]
      }
    ]
  }',
  true
) ON CONFLICT (page_key) 
DO UPDATE SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();