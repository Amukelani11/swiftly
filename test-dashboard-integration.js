// Test script to verify dashboard CMS integration
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these from your actual Supabase project
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCMSIntegration() {
  console.log('🧪 Testing CMS Integration...\n');

  try {
    // Test 1: Check CMS pages
    console.log('1️⃣ Testing CMS Pages...');
    const { data: cmsPages, error: cmsError } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('page_key', 'customer_dashboard');

    if (cmsError) {
      console.error('❌ CMS Pages Error:', cmsError);
    } else {
      console.log('✅ CMS Pages loaded:', cmsPages?.length || 0, 'pages');
      if (cmsPages && cmsPages.length > 0) {
        console.log('   📄 Page:', cmsPages[0].title);
        console.log('   📋 Sections:', cmsPages[0].content?.sections?.length || 0);
      }
    }

    // Test 2: Check categories
    console.log('\n2️⃣ Testing Categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, slug, icon_name, color_code, is_active')
      .eq('is_active', true);

    if (categoriesError) {
      console.error('❌ Categories Error:', categoriesError);
    } else {
      console.log('✅ Categories loaded:', categories?.length || 0, 'categories');
      categories?.slice(0, 3).forEach(cat => {
        console.log(`   🏷️  ${cat.name} (${cat.slug}) - ${cat.color_code}`);
      });
    }

    // Test 3: Check stores
    console.log('\n3️⃣ Testing Stores...');
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, rating, is_featured, is_open')
      .limit(5);

    if (storesError) {
      console.error('❌ Stores Error:', storesError);
    } else {
      console.log('✅ Stores loaded:', stores?.length || 0, 'stores');
      stores?.forEach(store => {
        console.log(`   🏪 ${store.name} - ⭐ ${store.rating} ${store.is_featured ? '(Featured)' : ''} ${store.is_open ? '(Open)' : '(Closed)'}`);
      });
    }

    // Test 4: Check promotions
    console.log('\n4️⃣ Testing Promotions...');
    const { data: promotions, error: promotionsError } = await supabase
      .from('promotions')
      .select('id, title, discount, valid_until')
      .gte('valid_until', new Date().toISOString());

    if (promotionsError) {
      console.error('❌ Promotions Error:', promotionsError);
    } else {
      console.log('✅ Active Promotions loaded:', promotions?.length || 0, 'promotions');
      promotions?.forEach(promo => {
        const daysLeft = Math.ceil((new Date(promo.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`   🎁 ${promo.title} - ${promo.discount}% off (${daysLeft} days left)`);
      });
    }

    console.log('\n🎉 CMS Integration Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Mock function to simulate CMS-driven section rendering
function simulateCMSSections(cmsPage, data) {
  console.log('\n🎨 Simulating CMS-Driven Section Rendering...');
  
  if (!cmsPage?.content?.sections) {
    console.log('❌ No CMS sections found');
    return;
  }

  const sections = cmsPage.content.sections
    .filter(section => section.is_visible)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  sections.forEach(section => {
    console.log(`\n📱 Section: ${section.section_title}`);
    console.log(`   📐 Layout: ${section.layout}`);
    console.log(`   📊 Max Items: ${section.max_items}`);
    
    // Simulate data filtering based on section config
    let sectionData = [];
    switch (section.section_key) {
      case 'categories':
        sectionData = data.categories?.slice(0, section.max_items || 8) || [];
        break;
      case 'featured_stores':
        sectionData = data.stores?.filter(s => s.is_featured)?.slice(0, section.max_items || 6) || [];
        break;
      case 'popular_nearby':
        sectionData = data.stores?.filter(s => s.is_open)?.slice(0, section.max_items || 5) || [];
        break;
      case 'promotions':
        sectionData = data.promotions?.slice(0, section.max_items || 4) || [];
        break;
    }
    
    console.log(`   📋 Data Items: ${sectionData.length}`);
    if (section.filters) {
      console.log(`   🔍 Filters:`, JSON.stringify(section.filters));
    }
  });
}

if (require.main === module) {
  testCMSIntegration();
}

module.exports = { testCMSIntegration, simulateCMSSections };