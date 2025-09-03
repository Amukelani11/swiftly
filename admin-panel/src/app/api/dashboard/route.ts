import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all dashboard data
    const [storesResult, bannersResult, sectionsResult, promotionsResult] = await Promise.all([
      // use safe store_public view for dashboard preview
      supabase.from('store_public').select('*').order('sort_order'),
      supabase.from('banners').select('*').order('sort_order'),
      supabase.from('dashboard_sections').select('*').order('sort_order'),
      supabase.from('promotions').select('*').order('sort_order')
    ])

    if (storesResult.error) throw storesResult.error
    if (bannersResult.error) throw bannersResult.error
    if (sectionsResult.error) throw sectionsResult.error
    if (promotionsResult.error) throw promotionsResult.error

    return NextResponse.json({
      stores: storesResult.data || [],
      banners: bannersResult.data || [],
      sections: sectionsResult.data || [],
      promotions: promotionsResult.data || []
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
