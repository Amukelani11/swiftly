import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: upload base64 image to storage 'store-images' bucket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, screen = 'unknown' } = body

    if (!imageBase64) return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })

    const buffer = Buffer.from(imageBase64, 'base64')
    const fileName = `dashboards/${screen}-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('store-images')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      console.error('Snapshot upload error', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { publicURL } = supabase.storage.from('previews').getPublicUrl(fileName)

    return NextResponse.json({ url: publicURL })
  } catch (error: any) {
    console.error('Error uploading snapshot:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET: list recent snapshots
export async function GET() {
  try {
    const { data, error } = await supabase.storage.from('previews').list('dashboards', { limit: 100, sortBy: { column: 'name', order: 'desc' } })
    if (error) throw error

    const items = (data || []).map((f: any) => {
      const { publicURL } = supabase.storage.from('previews').getPublicUrl(f.name)
      return { name: f.name, publicURL, updated_at: f.updated_at }
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error listing snapshots:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}


