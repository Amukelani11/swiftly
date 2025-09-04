# Customer Dashboard Setup Guide

## Overview
The Customer Dashboard has been redesigned to match the sleek, modern UI of world-class food delivery apps like Uber Eats, Bolt Food, and DoorDash. It now includes full CMS integration for dynamic content management.

## Features

### 🎨 Modern UI Design
- Clean, minimalist interface inspired by leading food delivery apps
- Smooth gradients and modern typography
- Card-based layouts with subtle shadows
- Responsive design that works on all screen sizes

### 🔧 CMS Integration
- Dynamic sections controlled by the `cms_pages` table
- Configurable layouts: pills, carousel, list, banner, text
- Real-time updates when CMS content changes
- Flexible section ordering and visibility controls

### 🏪 Store Management
- Real store data from the `stores` table
- Featured stores highlighting
- Rating and delivery time display
- Open/closed status indicators
- Free delivery badges

### 🎁 Promotions & Banners
- Dynamic promotional banners
- Discount codes and special offers
- Time-limited promotions
- Attractive visual presentation

### 🔍 Search Functionality
- Modern search bar design
- Placeholder text matching food delivery apps
- Ready for search implementation

## Setup Instructions

### 1. Database Setup

First, create the required tables by running these SQL scripts in your Supabase SQL editor:

```sql
-- Run additional_tables.sql to create stores, promotions, and banners tables
-- Run sample_dashboard_data.sql to populate with sample data
-- Run sample_cms_data.sql to configure the dashboard layout
```

### 2. Required Tables

The dashboard expects these tables to exist:

- `cms_pages` - For dynamic content management ✅
- `categories` - For service categories ✅ 
- `stores` - For restaurant/store listings (new)
- `promotions` - For deals and discounts (new)
- `banners` - For promotional banners (new)

### 3. CMS Configuration

The dashboard reads its layout from the `cms_pages` table with `page_key = 'customer_dashboard'`. The content structure should be:

```json
{
  "sections": [
    {
      "section_key": "search",
      "section_title": "Search",
      "layout": "text",
      "is_visible": true,
      "sort_order": 0
    },
    {
      "section_key": "banners",
      "section_title": "Special Offers", 
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
      "section_key": "popular_nearby",
      "section_title": "Popular near you",
      "layout": "carousel",
      "is_visible": true, 
      "sort_order": 3,
      "max_items": 6,
      "filters": {
        "open_only": true,
        "sort": "rating"
      }
    },
    {
      "section_key": "top_rated", 
      "section_title": "Top rated",
      "layout": "list",
      "is_visible": true,
      "sort_order": 4,
      "max_items": 5,
      "filters": {
        "sort": "rating"
      }
    },
    {
      "section_key": "promotions",
      "section_title": "Today's deals",
      "layout": "carousel", 
      "is_visible": true,
      "sort_order": 5,
      "max_items": 4
    }
  ]
}
```

## Design Features

### Header Design
- Modern location selector like Uber Eats
- Notification and profile icons
- Beautiful gradient background
- Clean typography hierarchy

### Search Bar
- Prominent search functionality
- Modern input styling with search icon
- Placeholder text optimized for food delivery

### Category Pills
- Horizontal scrolling category pills
- Colorful icons with rounded backgrounds
- Clean, touchable design

### Store Cards
- Two layouts: carousel and list view
- High-quality food imagery
- Rating stars with numerical ratings
- Delivery time and fee information
- Free delivery badges
- Closed store overlays
- Price range indicators

### Promotional Content
- Eye-catching banner carousel
- Promotion cards with discount badges
- Promo code display
- Gradient overlays for text readability

### Performance Features
- Optimized image loading
- Smooth scrolling animations
- Pull-to-refresh functionality
- Real-time CMS updates
- Efficient data fetching

## Usage

### For Administrators
Use the admin panel to:
1. Configure dashboard sections via CMS editor
2. Add/edit stores, categories, and promotions
3. Upload promotional banners
4. Control section visibility and ordering

### For Customers
The dashboard provides:
1. Intuitive search functionality
2. Browse by category
3. Discover popular and top-rated restaurants
4. View current promotions and deals
5. Easy store selection and navigation

## Customization

The dashboard is highly customizable through:
- CMS section configuration
- Dynamic data filtering
- Layout options (pills, carousel, list, banner)
- Section ordering and visibility
- Maximum items per section

## Next Steps

1. Implement search functionality
2. Add store detail navigation
3. Integrate with ordering system
4. Add user location services
5. Implement real-time distance calculation
6. Add favorites and order history

The dashboard is now ready for a world-class food delivery experience! 🚀