-- Sample CMS data for customer dashboard
-- Insert this into your Supabase SQL editor to test the new dashboard

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
        "max_items": 3
      },
      {
        "section_key": "categories",
        "section_title": "What are you looking for?",
        "layout": "pills",
        "is_visible": true,
        "sort_order": 2,
        "max_items": 8
      },
      {
        "section_key": "featured_stores",
        "section_title": "Featured restaurants",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 3,
        "max_items": 6,
        "filters": {
          "featured_only": true,
          "open_only": true
        }
      },
      {
        "section_key": "popular_nearby",
        "section_title": "Popular near you",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 4,
        "max_items": 6,
        "filters": {
          "open_only": true,
          "sort": "rating"
        }
      },
      {
        "section_key": "promotions",
        "section_title": "Today'\''s deals",
        "layout": "carousel",
        "is_visible": true,
        "sort_order": 5,
        "max_items": 4
      },
      {
        "section_key": "top_rated",
        "section_title": "Top rated",
        "layout": "list",
        "is_visible": true,
        "sort_order": 6,
        "max_items": 5,
        "filters": {
          "sort": "rating"
        }
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