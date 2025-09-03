import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    return NextResponse.json({ store: data })

  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    console.log('🔄 Store Update API: Updating store', params.id, 'with data:', body)

    const { data, error } = await supabase
      .from('stores')
      .update(body)
      .eq('id', params.id)
      .select()

    if (error) {
      console.error('🔄 Store Update API: Supabase error:', error)
      throw error
    }

    console.log('🔄 Store Update API: Successfully updated store:', params.id, 'Result:', data[0])
    return NextResponse.json({ store: data[0] })

  } catch (error) {
    console.error('🔄 Store Update API: Error updating store:', params.id, error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    )
  }
}
