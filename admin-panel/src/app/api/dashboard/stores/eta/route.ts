import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, category, max_distance_m = 50000, limit = 50 } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 })
    }

    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error

    // Compute distance and simple ETA estimate (distance / avg_speed)
    const avgSpeedMPerMin = 500 // 30 km/h ~ 500 m/min conservative for driving in city

    let filtered = (stores || []).map((s: any) => {
      const lat = s.latitude || 0
      const lon = s.longitude || 0
      const dist = (lat && lon) ? haversineDistance(latitude, longitude, lat, lon) : Number.MAX_SAFE_INTEGER
      const etaMin = Math.round(dist / avgSpeedMPerMin) + (s.delivery_time_min || 20)
      return { ...s, distance_m: dist, eta_min: etaMin }
    })

    if (category) {
      filtered = filtered.filter((s: any) => (s.category || '').toLowerCase() === category.toLowerCase())
    }

    filtered = filtered.filter((s: any) => s.distance_m <= max_distance_m)

    filtered.sort((a: any, b: any) => a.eta_min - b.eta_min)

    return NextResponse.json({ stores: filtered.slice(0, limit) })

  } catch (error) {
    console.error('Error computing ETA-sorted stores:', error)
    return NextResponse.json({ error: 'Failed to compute ETA' }, { status: 500 })
  }
}



