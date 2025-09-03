import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://akqwnbrikxryikjyyyov.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNDU3NywiZXhwIjoyMDcxNjEwNTc3fQ.sw-1uz2zU7k077XjYJjvZjZy-0cHIIY1EPF_bfZvg1o'

// Add basic health check
export async function HEAD() {
  return NextResponse.json({ status: 'ok' })
}

// Create server-side client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔧 Server-side fetching user:', id)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Server-side user fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Server-side fetched user:', data)
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('❌ Server-side user fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 PATCH request received at /api/users/[id]')

    const { id } = await params
    console.log('🔧 User ID:', id)

    let body
    try {
      body = await request.json()
      console.log('🔧 Request body:', body)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({
        error: 'Invalid request body format'
      }, { status: 400 })
    }

    const { action, documentType } = body

    if (!action) {
      console.error('❌ Missing action parameter')
      return NextResponse.json({
        error: 'Missing action parameter'
      }, { status: 400 })
    }

    console.log(`🔧 Server-side updating ${documentType} verification for user:`, id)

    let updateData: any = {}

    // Handle document verification
    if (action === 'verify_document') {
      console.log(`🔧 Verifying ${documentType} document for user ${id}`)

      try {
        // Update all verification fields in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            documents_verified: true,
            verification_status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)

        if (updateError) {
          console.error('❌ Error updating user verification status:', updateError)
          return NextResponse.json({
            error: `Failed to update user verification: ${updateError.message}`
          }, { status: 500 })
        }

        console.log(`✅ User ${id} verification status updated to verified`)

      } catch (verificationError) {
        console.error('❌ Unexpected error during document verification:', verificationError)
        return NextResponse.json({
          error: `Unexpected error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    // Handle user status updates (existing functionality)
    else if (action === 'update_status') {
      updateData.verification_status = body.status

      // When approving, also set verification flags to true
      if (body.status === 'approved') {
        updateData.is_verified = true
        updateData.documents_verified = true
      } else if (body.status === 'rejected') {
        // When rejecting, set verification flags to false
        updateData.is_verified = false
        updateData.documents_verified = false
      }
    }

    // Update user profile if needed
    if (Object.keys(updateData).length > 0) {
      console.log('🔄 Updating profile with data:', updateData)
      console.log('🔄 Updating user ID:', id)

      const { data: updateResult, error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()

      if (profileError) {
        console.error('❌ Error updating profile:', profileError)
        console.error('❌ Profile error details:', JSON.stringify(profileError, null, 2))
        return NextResponse.json({
          error: profileError.message,
          details: profileError,
          updateData,
          userId: id
        }, { status: 500 })
      }

      console.log('✅ Profile updated successfully:', updateResult)
    }

    console.log(`✅ Successfully updated user verification (action: ${action})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Server-side update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fix URLs endpoint - for fixing existing incorrect URLs in database
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === 'fix_urls') {
      console.log(`🔧 Fixing URLs for user:`, id)

      // Fix profile picture URL
      const { data: profilePic } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', id)
        .single()

      if (profilePic?.profile_picture_url && !profilePic.profile_picture_url.startsWith('http')) {
        const fixedProfileUrl = `https://akqwnbrikxryikjyyyov.supabase.co/storage/v1/object/public/profile-pictures/${profilePic.profile_picture_url}`
        await supabase
          .from('profiles')
          .update({ profile_picture_url: fixedProfileUrl })
          .eq('id', id)
      }

      // Fix document URLs
      const documentsToFix = [
        { table: 'profiles', column: 'id_document_url', bucket: 'documents' },
        { table: 'profiles', column: 'proof_of_address_url', bucket: 'documents' },
        { table: 'profiles', column: 'drivers_license_url', bucket: 'documents' }
      ]

      for (const doc of documentsToFix) {
        const { data: docData } = await supabase
          .from(doc.table)
          .select(doc.column)
          .eq('id', id)
          .single()

        if (docData?.[doc.column] && !docData[doc.column].startsWith('http')) {
          const fixedUrl = `https://akqwnbrikxryikjyyyov.supabase.co/storage/v1/object/public/${doc.bucket}/${docData[doc.column]}`
          await supabase
            .from(doc.table)
            .update({ [doc.column]: fixedUrl })
            .eq('id', id)
        }
      }

      console.log(`✅ Fixed URLs for user:`, id)
      return NextResponse.json({ success: true, message: 'URLs fixed successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('❌ Server-side update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
