'use client'

import React, { useEffect, useState } from 'react'

interface Section {
  section_key: string
  section_title: string
  section_type?: string
  layout?: 'list' | 'grid' | 'carousel' | 'pills' | 'banner' | 'text'
  max_items?: number
  sort_order?: number
  is_visible?: boolean
  filters?: { category?: string; featured_only?: boolean; open_only?: boolean; sort?: 'eta' | 'rating' | 'distance' }
}

interface Props {
  pageKey?: string
  onSaved?: () => void
}

export default function CmsEditor({ pageKey = 'customer_dashboard', onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetchPage()
  }, [])

  async function fetchPage() {
    try {
      setLoading(true)
      const res = await fetch(`/api/cms/pages/${pageKey}`)
      const json = await res.json()
      if (json.page) {
        const content = json.page.content || {}
        setTitle(json.page.title || '')
        setSections(content.sections || [])
      }
    } catch (e) {
      console.error('Failed to load CMS page', e)
    } finally { setLoading(false) }
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function addSection() {
    setSections(prev => [...prev, {
      section_key: `section_${prev.length+1}`,
      section_title: 'New Section',
      section_type: 'list',
      layout: 'list',
      is_visible: true,
      max_items: 10,
      sort_order: prev.length
    }])
  }

  function removeSection(idx: number) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    try {
      setSaving(true)
      const content = { sections }
      const res = await fetch(`/api/cms/pages/${pageKey}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }) })
      if (!res.ok) throw new Error('Save failed')
      setLastSavedAt(Date.now())
      onSaved?.()
    } catch (e) {
      console.error(e)
      // no alert spam in autosave
    } finally { setLoading(false) }
  }

  // Autosave with debounce
  useEffect(() => {
    const t = setTimeout(() => { if (!loading) save() }, 800)
    return () => clearTimeout(t)
  }, [title, sections])

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">Page Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border rounded p-2" />
        <div className="text-xs text-gray-500 mt-1">
          {saving ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Sections</h4>
          <button onClick={addSection} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Add</button>
        </div>
        {sections.sort((a,b) => (a.sort_order||0) - (b.sort_order||0)).map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start mb-2 border rounded p-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600">Key</label>
              <input value={s.section_key} onChange={(e) => updateSection(i, { section_key: e.target.value })} className="border p-1 rounded w-full" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-600">Title</label>
              <input value={s.section_title} onChange={(e) => updateSection(i, { section_title: e.target.value })} className="border p-1 rounded w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600">Layout</label>
              <select value={s.layout || s.section_type || 'list'} onChange={(e) => updateSection(i, { layout: e.target.value as any, section_type: e.target.value as any })} className="border p-1 rounded w-full">
                <option value="list">List</option>
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
                <option value="pills">Pills</option>
                <option value="banner">Banner</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-600">Max</label>
              <input value={String(s.max_items || 10)} onChange={(e) => updateSection(i, { max_items: parseInt(e.target.value || '10') })} className="border p-1 rounded w-full" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-600">Visible</label>
              <input type="checkbox" checked={s.is_visible !== false} onChange={(e) => updateSection(i, { is_visible: e.target.checked })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600">Filter Category</label>
              <input value={s.filters?.category || ''} onChange={(e) => updateSection(i, { filters: { ...(s.filters||{}), category: e.target.value } })} className="border p-1 rounded w-full" />
            </div>
            <div className="col-span-12 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  // move up
                  const arr = [...sections]
                  if (i > 0) {
                    const prevOrder = arr[i-1].sort_order ?? (i-1)
                    const curOrder = arr[i].sort_order ?? i
                    arr[i-1].sort_order = curOrder
                    arr[i].sort_order = prevOrder
                    setSections(arr)
                  }
                }} className="text-sm px-2 py-1 border rounded">↑</button>
                <button onClick={() => {
                  // move down
                  const arr = [...sections]
                  if (i < arr.length - 1) {
                    const nextOrder = arr[i+1].sort_order ?? (i+1)
                    const curOrder = arr[i].sort_order ?? i
                    arr[i+1].sort_order = curOrder
                    arr[i].sort_order = nextOrder
                    setSections(arr)
                  }
                }} className="text-sm px-2 py-1 border rounded">↓</button>
              </div>
              <button onClick={() => removeSection(i)} className="text-red-600 text-sm">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={save} disabled={loading} className="bg-green-600 text-white px-3 py-1 rounded">Save Now</button>
      </div>
    </div>
  )
}



