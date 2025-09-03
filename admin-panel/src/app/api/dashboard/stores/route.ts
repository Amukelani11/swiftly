import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Dashboard Stores API: Fetching stores');
    console.log('🏪 Dashboard Stores API: Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // First check if stores table exists and get its structure
    console.log('🏪 Dashboard Stores API: Checking stores table...');

    const { data: tableInfo, error: tableError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('🏪 Dashboard Stores API: Error accessing stores table:', tableError);
      return NextResponse.json(
        { error: `Database error: ${tableError.message}` },
        { status: 500 }
      );
    }

    console.log('🏪 Dashboard Stores API: Stores table accessible, fetching all data...');

    // Try with RLS bypassed first
    console.log('🏪 Dashboard Stores API: Attempting to fetch with RLS bypassed...');
    const { data: rawData, error: rawError } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🏪 Dashboard Stores API: Raw query result - data length:', rawData?.length, 'error:', rawError);

    // If raw query fails, try RPC approach
    let data = rawData;
    let error = rawError;

    if (rawError || !rawData || rawData.length === 0) {
      console.log('🏪 Dashboard Stores API: Raw query failed or returned empty, trying RPC approach...');
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_all_stores');

        if (!rpcError && rpcData) {
          console.log('🏪 Dashboard Stores API: RPC query successful:', rpcData.length, 'stores');
          data = rpcData;
          error = null;
        } else {
          console.log('🏪 Dashboard Stores API: RPC query failed, trying direct SQL...');
          // Try direct SQL query
          const { data: sqlData, error: sqlError } = await supabase
            .rpc('execute_sql', {
              sql: 'SELECT * FROM stores ORDER BY created_at DESC'
            });

          if (!sqlError && sqlData) {
            console.log('🏪 Dashboard Stores API: Direct SQL successful:', sqlData.length, 'stores');
            data = sqlData;
            error = null;
          }
        }
      } catch (rpcErr) {
        console.log('🏪 Dashboard Stores API: RPC approach failed:', rpcErr);
      }
    }

    if (error) {
      console.error('🏪 Dashboard Stores API: Error fetching stores:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      )
    }

    console.log(`🏪 Dashboard Stores API: Successfully fetched ${data.length} stores`);
    if (data && data.length > 0) {
      console.log(`🏪 Dashboard Stores API: Sample store:`, data[0]);
      console.log(`🏪 Dashboard Stores API: Sample categories:`, data.slice(0, 5).map(s => s.category));
    }
    return NextResponse.json({ stores: data })

  } catch (error) {
    console.error('🏪 Dashboard Stores API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}