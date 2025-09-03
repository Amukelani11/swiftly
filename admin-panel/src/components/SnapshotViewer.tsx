'use client'

import React, { useEffect, useState } from 'react'

interface SnapshotItem { name: string; publicURL: string; updated_at: string }

export default function SnapshotViewer() {
  const [items, setItems] = useState<SnapshotItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSnapshots = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard/snapshots')
      const json = await res.json()
      if (json.items) setItems(json.items)
    } catch (e) {
      console.error('Failed to fetch snapshots', e)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchSnapshots()
    const t = setInterval(fetchSnapshots, 5000)
    return () => clearInterval(t)
  }, [])

  const latest = items && items.length ? items[0] : null

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Live Device Snapshot</h3>
        <div className="text-sm text-gray-500">{loading ? 'Loading...' : (latest ? new Date(latest.updated_at).toLocaleString() : 'No snapshots')}</div>
      </div>
      {latest ? (
        <div className="w-full flex justify-center">
          <img src={latest.publicURL} alt={latest.name} style={{ width: 360, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }} />
        </div>
      ) : (
        <div className="text-sm text-gray-600">No snapshots uploaded yet. Use the mobile app snapshot upload or admin "Upload Snapshot" to push a live image.</div>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={fetchSnapshots} className="bg-purple-600 text-white px-3 py-1 rounded">Refresh</button>
        <a href="/api/dashboard/snapshots" className="text-sm text-gray-600">Open list</a>
      </div>
    </div>
  )
}



