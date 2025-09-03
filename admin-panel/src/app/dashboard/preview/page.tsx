'use client'

import CustomerDashboardPreview from '@/components/CustomerDashboardPreview'

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <CustomerDashboardPreview />
      </div>
    </div>
  )
}



