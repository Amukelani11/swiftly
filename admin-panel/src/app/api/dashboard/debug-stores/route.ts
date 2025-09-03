import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Stores API: Starting comprehensive stores table inspection');

    // Check if stores table exists
    console.log('🔍 Debug Stores API: Checking table existence...');
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('🔍 Debug Stores API: Table access error:', testError);
      return NextResponse.json({
        error: 'Stores table not found or not accessible',
        details: testError,
        suggestion: 'Check if stores table exists in your Supabase database'
      }, { status: 500 });
    }

    // Check if stores table exists by trying to get its structure
    console.log('🔍 Debug Stores API: Checking table structure...');

    // Check RLS policies that might be blocking access
    console.log('🔍 Debug Stores API: Checking RLS policies...');
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('get_rls_policies', { table_name: 'stores' })
      .catch(() => null); // This might not work, but let's try

    if (!rlsError && rlsData) {
      console.log('🔍 Debug Stores API: RLS policies for stores table:', rlsData);
    }

    // First, try to get all tables to see what's available
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    console.log('🔍 Debug Stores API: Available tables:', tablesData);

    // Now try to get stores table structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('stores')
      .select('*')
      .limit(5);

    if (sampleError) {
      console.error('🔍 Debug Stores API: Sample data error:', sampleError);
      return NextResponse.json({
        error: 'Cannot read from stores table',
        details: sampleError,
        availableTables: tablesData || [],
        suggestion: 'Check if stores table exists in your Supabase database. Available tables: ' + (tablesData ? tablesData.map(t => t.table_name).join(', ') : 'none')
      }, { status: 500 });
    }

    // Analyze the data
    const analysis = {
      totalStores: sampleData?.length || 0,
      tableStructure: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
      storesWithCategories: sampleData ? sampleData.filter(store => store.category).length : 0,
      sampleStores: sampleData || [],
      categoriesFound: sampleData ?
        [...new Set(sampleData.map(store => store.category).filter(Boolean))] : [],
      hasCategoryField: sampleData && sampleData.length > 0 ? 'category' in sampleData[0] : false
    };

    console.log('🔍 Debug Stores API: Analysis complete:', analysis);

    // Provide SQL query for manual check
    const sqlQuery = `
-- ULTIMATE FIX: Temporarily disable RLS to test, then fix properly

-- STEP 1: Temporarily disable RLS to confirm stores are accessible
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- STEP 2: Test access (should show 10 stores now)
SELECT COUNT(*) as stores_count FROM stores;

-- STEP 3: See your actual stores
SELECT name, category, address FROM stores ORDER BY created_at DESC LIMIT 5;

-- STEP 4: Re-enable RLS with proper policy
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create proper policy for service role access
DROP POLICY IF EXISTS "Service role full access" ON stores;
CREATE POLICY "Service role full access" ON stores
  FOR ALL USING (auth.role() = 'service_role');

-- STEP 6: Final test
SELECT COUNT(*) as final_count FROM stores;
    `;

    return NextResponse.json({
      success: true,
      analysis,
      sqlQuery,
      message: analysis.totalStores === 0
        ? 'No stores found in database. You need to add stores first.'
        : analysis.categoriesFound.length === 0
        ? 'Stores found but no categories detected. Stores may not have category field populated.'
        : `Found ${analysis.totalStores} stores with ${analysis.categoriesFound.length} unique categories.`,
      nextSteps: [
        '🚨 RLS BLOCKING ACCESS: Your 10 stores exist but can\'t be accessed',
        '1. Go to Supabase Dashboard → SQL Editor',
        '2. Run: ALTER TABLE stores DISABLE ROW LEVEL SECURITY;',
        '3. Run: SELECT COUNT(*) FROM stores; (should show 10)',
        '4. Run: SELECT name, category FROM stores LIMIT 3;',
        '5. Come back to CMS editor and click "🔄 Refresh Stores"',
        '6. If it works, run the full script below to re-enable RLS properly'
      ]
    });

  } catch (error) {
    console.error('🔍 Debug Stores API: Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error during stores inspection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
