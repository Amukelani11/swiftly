import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://akqwnbrikxryikjyyyov.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNDU3NywiZXhwIjoyMDcxNjEwNTc3fQ.sw-1uz2zU7k077XjYJjvZjZy-0cHIIY1EPF_bfZvg1o'

// Create server-side client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Get dashboard data for personal shopper home screen
export async function GET() {
  try {
    console.log('🏠 Fetching dashboard data...')

    // Fetch categories for "Shop by Category" section
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError)
    }

    // Fetch recent tasks/orders (last 5)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        category,
        status,
        budget_min,
        budget_max,
        final_price,
        created_at,
        updated_at,
        customer_id,
        profiles!tasks_customer_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (ordersError) {
      console.error('❌ Error fetching recent orders:', ordersError)
    }

    // Fetch featured providers (top rated, available)
    const { data: featuredProviders, error: providersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        rating,
        bio,
        skills,
        is_available,
        latitude,
        longitude,
        city,
        province
      `)
      .eq('role', 'provider')
      .eq('is_available', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
      .limit(6)

    if (providersError) {
      console.error('❌ Error fetching featured providers:', providersError)
    }

    // Mock store data for now (in production, this would come from a stores table)
    const mockStores = [
      {
        id: 'store_1',
        name: 'Checkers',
        logo: '🏪',
        rating: 4.8,
        deliveryTime: 15,
        deliveryFee: 25,
        distance: 2.1,
        isOpen: true,
        category: 'supermarket'
      },
      {
        id: 'store_2',
        name: 'Pick n Pay',
        logo: '🛒',
        rating: 4.6,
        deliveryTime: 20,
        deliveryFee: 30,
        distance: 3.8,
        isOpen: true,
        category: 'supermarket'
      },
      {
        id: 'store_3',
        name: 'Woolworths',
        logo: '🏬',
        rating: 4.9,
        deliveryTime: 25,
        deliveryFee: 35,
        distance: 4.2,
        isOpen: true,
        category: 'supermarket'
      },
      {
        id: 'store_4',
        name: 'Spar',
        logo: '🏪',
        rating: 4.4,
        deliveryTime: 18,
        deliveryFee: 28,
        distance: 1.5,
        isOpen: true,
        category: 'supermarket'
      }
    ]

    // Get user's location (mock for now - in production would use GPS)
    const userLocation = {
      latitude: -26.2041, // Johannesburg coordinates
      longitude: 28.0473,
      address: 'Sandton, Johannesburg'
    }

    const dashboardData = {
      categories: categories || [],
      recentOrders: recentOrders || [],
      featuredProviders: featuredProviders || [],
      featuredStores: mockStores,
      userLocation,
      promotions: [
        {
          id: 'promo_1',
          title: '20% OFF Fruits & Vegetables',
          description: 'Fresh produce from local farms',
          store: 'Checkers',
          discount: 20,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'promo_2',
          title: 'Buy 2 Get 1 FREE Cleaning Products',
          description: 'Stock up on household essentials',
          store: 'Pick n Pay',
          discount: 33,
          validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }
      ]
    }

    console.log('✅ Dashboard data fetched successfully')
    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
