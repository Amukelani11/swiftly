import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const stores = body.stores || []

    if (!Array.isArray(stores) || stores.length === 0) {
      return NextResponse.json({ error: 'No stores provided' }, { status: 400 })
    }

    // Basic server-side validation & normalize
    const toInsert = stores.map((s: any) => ({
      name: s.name,
      category: s.category,
      description: s.description || null,
      logo_url: s.logo_url || null,
      banner_image_url: s.banner_image_url || null,
      address: s.address || null,
      city: s.city || null,
      province: s.province || null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
      rating: s.rating ?? 0,
      review_count: s.review_count ?? 0,
      delivery_fee: s.delivery_fee ?? 0,
      delivery_time_min: s.delivery_time_min ?? null,
      delivery_time_max: s.delivery_time_max ?? null,
      is_open: !!s.is_open,
      is_featured: !!s.is_featured,
      is_active: s.is_active === undefined ? true : !!s.is_active,
      sort_order: s.sort_order ?? 0,
    }))

    // Insert in chunks to avoid large single queries
    const CHUNK = 200
    const results: any[] = []
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      const { data, error } = await supabase.from('stores').insert(chunk).select()
      if (error) {
        console.error('Bulk insert error', error)
        return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 })
      }
      results.push(...(data || []))
    }

    return NextResponse.json({ inserted: results.length, stores: results })

  } catch (error: any) {
    console.error('Error bulk inserting stores:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}



