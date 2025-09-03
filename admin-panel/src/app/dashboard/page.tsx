'use client'

import { useState } from 'react'
import Link from 'next/link'
import InteractiveCmsEditor from '@/components/InteractiveCmsEditor'
import BulkFieldEditor from '@/components/BulkFieldEditor'

export default function DashboardManagement() {
  const [activeTab, setActiveTab] = useState<'cms' | 'bulk-edit'>('cms');

  const handleBulkUploadComplete = () => {
    // Refresh data if needed
    console.log('Bulk upload completed');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage stores, banners, and dashboard sections</p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('cms')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'cms'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🎨 CMS Editor
          </button>
          <button
            onClick={() => setActiveTab('bulk-edit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'bulk-edit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📝 Bulk Field Editor
          </button>
        </nav>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'cms' ? (
            <InteractiveCmsEditor navigation={{} as any} onBulkUploadComplete={handleBulkUploadComplete} />
          ) : (
            <BulkFieldEditor />
          )}
        </div>
      </div>
    </div>
  );
}

