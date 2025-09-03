'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseAnon } from '@/lib/supabase'

// Types matching the mobile app
interface Category {
  id: string
  name: string
  slug: string
  icon_name: string
  color_code: string
}

interface Store {
  id: string
  name: string
  description?: string
  logo_url?: string
  banner_image_url?: string
  category: string
  latitude?: number
  longitude?: number
  address?: string
  city?: string
  province?: string
  rating: number
  review_count: number
  delivery_fee: number
  delivery_time_min: number
  delivery_time_max: number
  is_open: boolean
  is_featured: boolean
  is_active: boolean
}

interface Promotion {
  id: string
  title: string
  description?: string
  store: string
  discount: number
}

interface DashboardSection {
  id: string
  section_key: string
  section_title: string
  is_visible: boolean
  sort_order: number
  section_type: string
  max_items: number
}

interface CustomerDashboardPreviewProps {
  onStoreClick?: (store: Store) => void
  onCategoryClick?: (category: Category) => void
  onPromotionClick?: (promotion: Promotion) => void
}

export default function CustomerDashboardPreview({
  onStoreClick,
  onCategoryClick,
  onPromotionClick
}: CustomerDashboardPreviewProps) {
  const [dashboardData, setDashboardData] = useState<{
    categories: Category[]
    featuredStores: Store[]
    promotions: Promotion[]
    sections: DashboardSection[]
    userLocation: { latitude: number; longitude: number; address: string }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [simLocation, setSimLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null)
  const [simLatInput, setSimLatInput] = useState<string>('')
  const [simLonInput, setSimLonInput] = useState<string>('')
  const [sortingByEta, setSortingByEta] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [cmsPage, setCmsPage] = useState<any | null>(null)
  const [cmsContent, setCmsContent] = useState<any>(null)
  const [isSavingCms, setIsSavingCms] = useState(false)

  // Fetch live data from Supabase
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      const [storesResult, categoriesResult, sectionsResult, promotionsResult] = await Promise.all([
        // use safe public view for client-side preview
        supabase.from('store_public').select('*').order('sort_order'),
        supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('dashboard_sections').select('*').eq('is_visible', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('is_active', true).order('sort_order')
      ])

      const categories = categoriesResult.data || []
      const stores = storesResult.data || []
      const sections = sectionsResult.data || []
      const promotions = promotionsResult.data || []

      // Mock user location for preview (can be overridden by simulated location)
      const userLocation = simLocation || { latitude: -26.2041, longitude: 28.0473, address: 'Sandton, Johannesburg' }

      // attempt to fetch CMS page content and merge
      try {
        const cmsRes = await fetch('/api/cms/pages/customer_dashboard')
        if (cmsRes.ok) {
          const cmsJson = await cmsRes.json()
          setCmsPage(cmsJson.page || null)
          setCmsContent(cmsJson.page?.content || null)
          const cmsSections = cmsJson.page?.content?.sections
          if (cmsSections && cmsSections.length) {
            // use cms sections when provided
            setDashboardData({ categories, featuredStores: stores, promotions, sections: cmsSections, userLocation })
          } else {
            setDashboardData({ categories, featuredStores: stores, promotions, sections, userLocation })
          }
        } else {
          setDashboardData({ categories, featuredStores: stores, promotions, sections, userLocation })
        }
      } catch (e) {
        setDashboardData({ categories, featuredStores: stores, promotions, sections, userLocation })
      }

      setFilteredStores(stores)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [simLocation])

  // save CMS content back to server
  const saveCms = async (contentOverride?: any) => {
    if (!cmsPage) return
    try {
      setIsSavingCms(true)
      const body = { content: contentOverride || cmsContent }
      const res = await fetch(`/api/cms/pages/${cmsPage.page_key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        // refresh
        await fetchDashboardData()
      } else {
        console.error('Failed to save CMS')
      }
    } catch (e) {
      console.error('Save CMS error', e)
    } finally { setIsSavingCms(false) }
  }

  const getSectionObj = (key: string) => {
    return (cmsContent?.sections || dashboardData?.sections || []).find((s: any) => s.section_key === key) || null
  }

  const updateSectionTitle = (key: string, newTitle: string) => {
    const sections = cmsContent?.sections ? [...cmsContent.sections] : [...(dashboardData?.sections || [])]
    const idx = sections.findIndex((s: any) => s.section_key === key)
    if (idx >= 0) {
      sections[idx] = { ...sections[idx], section_title: newTitle }
    } else {
      sections.push({ section_key: key, section_title: newTitle, section_type: 'list', max_items: 10 })
    }
    setCmsContent({ ...(cmsContent || {}), sections })
  }

  const addCmsSection = (afterIndex?: number) => {
    const sections = cmsContent?.sections ? [...cmsContent.sections] : []
    const newSec = { section_key: `section_${Date.now()}`, section_title: 'New Section', section_type: 'list', max_items: 6 }
    if (afterIndex === undefined) sections.push(newSec)
    else sections.splice(afterIndex + 1, 0, newSec)
    setCmsContent({ ...(cmsContent || {}), sections })
  }

  const removeCmsSection = (key: string) => {
    const sections = (cmsContent?.sections || []).filter((s: any) => s.section_key !== key)
    setCmsContent({ ...(cmsContent || {}), sections })
  }

  useEffect(() => {
    fetchDashboardData()

    // Auto-refresh every 30 seconds for live preview
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  // Realtime subscriptions to reflect admin changes instantly in preview
  useEffect(() => {
    // use anon client for realtime in browser
    const storeChannel = supabaseAnon
      .channel('public:stores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => fetchDashboardData())
      .subscribe()

    const sectionChannel = supabaseAnon
      .channel('public:dashboard_sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_sections' }, () => fetchDashboardData())
      .subscribe()

    return () => {
      try { supabaseAnon.removeChannel(storeChannel) } catch (e) {}
      try { supabaseAnon.removeChannel(sectionChannel) } catch (e) {}
    }
  }, [fetchDashboardData])

  // Filter stores based on active category
  useEffect(() => {
    if (!dashboardData) return

    let stores = [...dashboardData.featuredStores]

    if (activeCategory) {
      const cat = dashboardData.categories.find(c => c.id === activeCategory)
      if (cat) {
        stores = stores.filter(s => s.category === cat.slug || s.category === cat.name.toLowerCase())
      }
    }

    setFilteredStores(stores)
  }, [dashboardData, activeCategory])

  const handleCategoryPress = useCallback((category: Category) => {
    setActiveCategory(activeCategory === category.id ? null : category.id)
    onCategoryClick?.(category)
  }, [activeCategory, onCategoryClick])

  const handleStorePress = useCallback((store: Store) => {
    onStoreClick?.(store)
  }, [onStoreClick])

  const handlePromotionPress = useCallback((promotion: Promotion) => {
    onPromotionClick?.(promotion)
  }, [onPromotionClick])

  const sortByEta = async (lat: number, lon: number, category?: string) => {
    try {
      setSortingByEta(true)
      const res = await fetch('/api/dashboard/stores/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon, category, max_distance_m: 50000, limit: 50 })
      })
      const json = await res.json()
      if (res.ok && json.stores) {
        setFilteredStores(json.stores)
      }
    } catch (err) {
      console.error('Failed to sort by ETA', err)
    } finally {
      setSortingByEta(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Unable to load dashboard preview</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-200">
      {/* Status Bar */}
      <div className="bg-black h-6 flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-black rounded-full"></div>
          <div className="w-8 h-4 bg-black rounded-full"></div>
          <div className="w-4 h-4 bg-black rounded-full"></div>
        </div>
      </div>

      {/* Mobile Screen Content */}
      <div className="relative min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="px-6 py-6">
          {/* Welcome Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Customer Dashboard (Preview)</h1>
              <p className="text-sm text-gray-600">Simulate location and sort stores by ETA</p>
            </div>
            <div className="flex items-center space-x-2">
              <input value={simLatInput} onChange={(e) => setSimLatInput(e.target.value)} placeholder="lat" className="border p-1 rounded w-20 text-sm" />
              <input value={simLonInput} onChange={(e) => setSimLonInput(e.target.value)} placeholder="lon" className="border p-1 rounded w-20 text-sm" />
              <button onClick={() => {
                const lat = parseFloat(simLatInput)
                const lon = parseFloat(simLonInput)
                if (!isNaN(lat) && !isNaN(lon)) {
                  setSimLocation({ latitude: lat, longitude: lon, address: `Sim (${lat.toFixed(4)}, ${lon.toFixed(4)})` })
                }
              }} className="bg-gray-200 px-2 py-1 rounded text-sm">Set</button>
              <button onClick={() => { setSimLocation(null); setFilteredStores(dashboardData ? dashboardData.featuredStores : []) }} className="bg-gray-200 px-2 py-1 rounded text-sm">Reset</button>
              <button onClick={() => setEditMode(!editMode)} className={`px-2 py-1 rounded text-sm ${editMode ? 'bg-yellow-300' : 'bg-gray-200'}`}>{editMode ? 'Exit Edit' : 'Edit Live'}</button>
              <button onClick={() => {
                const loc = simLocation || dashboardData?.userLocation
                if (loc) sortByEta(loc.latitude, loc.longitude)
              }} disabled={sortingByEta} className={`px-2 py-1 rounded text-sm ${sortingByEta ? 'bg-gray-300 text-gray-700' : 'bg-purple-600 text-white'}`}>
                {sortingByEta ? (
                  <span className="inline-flex items-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white rounded-full mr-2" />
                    Sorting...
                  </span>
                ) : (
                  'Sort by ETA'
                )}
              </button>
            </div>
          </div>

          {/* Location Bar */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg border border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
                📍
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{dashboardData.userLocation.address}</p>
                <p className="text-sm text-gray-500">Tap to change location</p>
              </div>
              <div className="text-gray-400">⌄</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-8 shadow-lg border border-gray-200">
            <div className="flex items-center">
              <div className="text-gray-400 mr-3">🔍</div>
              <div className="flex-1">
                <p className="text-gray-600">Search for stores...</p>
              </div>
              <div className="text-purple-600">⚙️</div>
            </div>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="px-6 space-y-8 pb-20">
          {/* Categories */}
          {dashboardData.sections.find(s => s.section_key === 'categories')?.is_visible && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {dashboardData.sections.find(s => s.section_key === 'categories')?.section_title || 'Shop by Category'}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {dashboardData.categories.slice(0, 8).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryPress(category)}
                    className={`bg-white rounded-2xl p-4 shadow-md border-2 transition-all ${
                      activeCategory === category.id
                        ? 'border-purple-500 shadow-purple-200'
                        : 'border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl"
                      style={{ backgroundColor: category.color_code + '20' }}
                    >
                      {category.icon_name === 'leaf-outline' ? '🥬' :
                       category.icon_name === 'water-outline' ? '🥛' :
                       category.icon_name === 'restaurant-outline' ? '🍞' :
                       category.icon_name === 'fast-food-outline' ? '🥩' :
                       category.icon_name === 'sparkles-outline' ? '🧹' :
                       category.icon_name === 'cafe-outline' ? '☕' : '🏷️'}
                    </div>
                    <p className={`text-xs font-medium text-center ${
                      activeCategory === category.id ? 'text-purple-600' : 'text-gray-700'
                    }`}>
                      {category.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Stores */}
          {dashboardData.sections.find(s => s.section_key === 'featured_stores')?.is_visible && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {dashboardData.sections.find(s => s.section_key === 'featured_stores')?.section_title || 'Featured Stores'}
                </h2>
                <button className="text-purple-600 font-medium">See All</button>
              </div>

              <div className="space-y-4">
                {filteredStores.slice(0, 5).map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleStorePress(store)}
                    className="w-full bg-white rounded-2xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl mr-3 flex items-center justify-center text-xl">
                          {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="w-full h-full rounded-xl object-cover" />
                          ) : '🏪'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{store.name}</h3>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="text-yellow-400 mr-1">⭐</span>
                            <span>{store.rating.toFixed(1)}</span>
                            <span className="mx-2">•</span>
                            <span>{store.delivery_time_min}-{store.delivery_time_max}min</span>
                            <span className="mx-2">•</span>
                            <span>{(store as any).distance_m ? `${Math.round(((store as any).distance_m || 0) / 1000 * 10) / 10}km` : '—'}</span>
                            {(store as any).eta_min ? <><span className="mx-2">•</span><span className="font-medium">ETA { (store as any).eta_min }m</span></> : null}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        store.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {store.is_open ? 'Open' : 'Closed'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Delivery R{store.delivery_fee}</p>
                      <div className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium text-sm">
                        Order Now
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Promotions */}
          {dashboardData.sections.find(s => s.section_key === 'promotions')?.is_visible && dashboardData.promotions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {dashboardData.sections.find(s => s.section_key === 'promotions')?.section_title || 'Today\'s Deals'}
              </h2>
              <div className="space-y-4">
                {dashboardData.promotions.slice(0, 2).map((promotion) => (
                  <button
                    key={promotion.id}
                    onClick={() => handlePromotionPress(promotion)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-left shadow-lg"
                  >
                    <h3 className="font-bold text-lg mb-1">{promotion.title}</h3>
                    <p className="text-green-100 mb-3">{promotion.description}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm opacity-90">at {promotion.store}</p>
                      <div className="bg-white text-green-600 px-3 py-1 rounded-full font-bold text-sm">
                        {promotion.discount}% OFF
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Snapshot control (capture a rendering of the preview and upload) */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Preview Snapshot</div>
            <div className="flex items-center gap-2">
              <button onClick={async () => {
                try {
                  // capture the preview DOM node
                  const el = document.querySelector('.max-w-sm') as HTMLElement
                  if (!el) return
                  // use html2canvas if available, otherwise fallback to window.print style
                  // try dynamic import
                  const html2canvas = (await import('html2canvas')).default
                  const canvas = await html2canvas(el, { backgroundColor: null })
                  const dataUrl = canvas.toDataURL('image/png')
                  const base64 = dataUrl.split(',')[1]
                  const res = await fetch('/api/dashboard/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, screen: 'customer_dashboard' }) })
                  const json = await res.json()
                  if (res.ok) {
                    alert('Snapshot uploaded — ' + json.url)
                  } else {
                    alert('Snapshot failed: ' + (json.error || 'unknown'))
                  }
                } catch (err: any) {
                  console.error('Snapshot error', err)
                  alert('Snapshot error: ' + String(err))
                }
              }} className="bg-purple-600 text-white px-3 py-1 rounded">Upload Snapshot</button>
              <a href="/api/dashboard/snapshots" className="text-sm text-gray-600">View</a>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex justify-around">
            {[
              { icon: '🏠', label: 'Home', active: true },
              { icon: '🔍', label: 'Browse' },
              { icon: '📦', label: 'Orders' },
              { icon: '❤️', label: 'Favorites' },
              { icon: '👤', label: 'Profile' },
            ].map((item, index) => (
              <button
                key={index}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  item.active ? 'text-purple-600 bg-purple-50' : 'text-gray-400'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
