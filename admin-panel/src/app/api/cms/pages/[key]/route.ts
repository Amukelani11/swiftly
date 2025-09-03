import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { data, error } = await supabase.from('cms_pages').select('*').eq('page_key', params.key).eq('is_active', true).limit(1).single()
    if (error) throw error
    return NextResponse.json({ page: data })
  } catch (error: any) {
    console.error('Error fetching CMS page:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const body = await request.json()
    const { data, error } = await supabase.from('cms_pages').update(body).eq('page_key', params.key).select()
    if (error) throw error
    return NextResponse.json({ page: data?.[0] })
  } catch (error: any) {
    console.error('Error updating CMS page:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}



