'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Mail, Phone, Car, FileText, Check, X } from 'lucide-react'
import { supabase, User as UserType } from '@/lib/supabase'

export default function UserDetail() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchUser(params.id as string)
    }
  }, [params.id])

  const fetchUser = async (userId: string) => {
    try {
      console.log('🔄 Fetching user via API:', userId)
      
      const response = await fetch(`/api/users/${userId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch user')
      }
      
      console.log('✅ Fetched user:', result.user)
      setUser(result.user)
    } catch (error) {
      console.error('Error fetching user:', error)
      alert('Failed to load user details. Please check your service role configuration.')
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (status: 'approved' | 'rejected') => {
    if (!user) return

    setUpdating(true)
    try {
      console.log(`🔄 Updating user ${user.id} status to ${status}...`)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          status
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user status')
      }

      console.log(`✅ Updated user ${user.id} status to ${status}`)
      // Refresh user data to get updated status
      await fetchUser(user.id)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const verifyDocument = async (documentType: 'id' | 'address' | 'drivers_license') => {
    if (!user) return

    setUpdating(true)
    try {
      console.log(`🔄 Verifying ${documentType} document for user ${user.id}...`)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify_document',
          documentType
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify document')
      }

      console.log(`✅ Verified ${documentType} document for user ${user.id}`)

      // Refresh user data to get updated verification status
      await fetchUser(user.id)
    } catch (error) {
      console.error('Error verifying document:', error)
      alert('Failed to verify document. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const fixUrls = async () => {
    if (!user) return

    setUpdating(true)
    try {
      console.log(`🔄 Fixing URLs for user ${user.id}...`)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fix_urls'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fix URLs')
      }

      console.log(`✅ Fixed URLs for user ${user.id}`)

      // Refresh user data to get updated URLs
      await fetchUser(user.id)
      alert('URLs fixed successfully!')
    } catch (error) {
      console.error('Error fixing URLs:', error)
      alert('Failed to fix URLs. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
              <p className="mt-1 text-sm text-gray-500">View and manage user application</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-lg ${
          user.verification_status === 'approved' 
            ? 'bg-green-50 border border-green-200'
            : user.verification_status === 'rejected'
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center">
            {user.verification_status === 'approved' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : user.verification_status === 'rejected' ? (
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            )}
                         <span className={`font-medium ${
               user.verification_status === 'approved' 
                 ? 'text-green-800'
                 : user.verification_status === 'rejected'
                 ? 'text-red-800'
                 : 'text-yellow-800'
             }`}>
               Status: {user.verification_status?.charAt(0).toUpperCase() + user.verification_status?.slice(1) || 'Not specified'}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                {/* Profile Picture */}
                {user.profile_picture_url && (
                  <div className="flex items-center">
                    <div className="mr-4">
                      <img 
                        src={user.profile_picture_url} 
                        alt="Profile Picture"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Profile Picture</p>
                      <a 
                        href={user.profile_picture_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 text-sm"
                      >
                        View Full Size
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Full Name</p>
                    <p className="text-sm text-gray-900">{user.full_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{user.phone || 'Not provided'}</p>
                  </div>
                </div>
                                 <div>
                   <p className="text-sm font-medium text-gray-500">Role</p>
                   <p className="text-sm text-gray-900">
                     {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Not specified'}
                     {user.provider_type && (
                       <span className="text-gray-500 ml-1">
                         ({user.provider_type.replace('_', ' ')})
                       </span>
                     )}
                   </p>
                 </div>
              </div>
            </div>

            {/* Vehicle Information (for personal shoppers) */}
            {user.provider_type === 'personal_shopper' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vehicle Type</p>
                      <p className="text-sm text-gray-900">{user.vehicle_type || 'Not provided'}</p>
                    </div>
                  </div>
                  {user.vehicle_make && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Make & Model</p>
                      <p className="text-sm text-gray-900">
                        {user.vehicle_make} {user.vehicle_model}
                      </p>
                    </div>
                  )}
                  {user.vehicle_year && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Year</p>
                      <p className="text-sm text-gray-900">{user.vehicle_year}</p>
                    </div>
                  )}
                  {user.vehicle_license_plate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">License Plate</p>
                      <p className="text-sm text-gray-900">{user.vehicle_license_plate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vehicle Verified</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.vehicle_verified 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.vehicle_verified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Location Information */}
            {(user.city || user.province) && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Location</h2>
                <div className="space-y-4">
                  {user.city && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">City</p>
                      <p className="text-sm text-gray-900">{user.city}</p>
                    </div>
                  )}
                  {user.province && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Province</p>
                      <p className="text-sm text-gray-900">{user.province}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Provider Information */}
            {(user.bio || user.experience_years) && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Provider Information</h2>
                <div className="space-y-4">
                  {user.bio && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Bio</p>
                      <p className="text-sm text-gray-900">{user.bio}</p>
                    </div>
                  )}
                  {user.experience_years && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Years of Experience</p>
                      <p className="text-sm text-gray-900">{user.experience_years} years</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Documents</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/users')
                        const data = await response.json()
                        alert(`API Test: ${data.message}\nEndpoint: ${data.endpoint}`)
                      } catch (error) {
                        alert(`API Test Failed: ${error}`)
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Test API
                  </button>
                  <button
                    onClick={fixUrls}
                    disabled={updating}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Fixing...' : 'Fix URLs'}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Documents Verified</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.documents_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.documents_verified ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* ID Document */}
                {user.id_document_url && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm font-medium text-gray-900">ID Document</p>
                          {user.document_verifications?.find(doc => doc.document_type === 'id')?.is_verified && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Status: {user.document_verifications?.find(doc => doc.document_type === 'id')?.is_verified
                            ? 'Verified'
                            : 'Not Verified'}
                        </p>
                                                <a
                          href={user.id_document_url.startsWith('http')
                            ? user.id_document_url
                            : `https://akqwnbrikxryikjyyyov.supabase.co/storage/v1/object/public/documents/${user.id_document_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-900 text-sm"
                        >
                          View Document
                        </a>
                        <p className="text-xs text-gray-400 mt-1">
                          {user.id_document_url.startsWith('http') ? 'Full URL' : 'Relative path - needs fixing'}
                        </p>
                      </div>
                      {!user.document_verifications?.find(doc => doc.document_type === 'id')?.is_verified && (
                        <button
                          onClick={() => verifyDocument('id')}
                          disabled={updating}
                          className="ml-4 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {updating ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Proof of Address */}
                {user.proof_of_address_url && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm font-medium text-gray-900">Proof of Address</p>
                          {user.document_verifications?.find(doc => doc.document_type === 'address')?.is_verified && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Status: {user.document_verifications?.find(doc => doc.document_type === 'address')?.is_verified
                            ? 'Verified'
                            : 'Not Verified'}
                        </p>
                        <a
                          href={user.proof_of_address_url.startsWith('http')
                            ? user.proof_of_address_url
                            : `https://akqwnbrikxryikjyyyov.supabase.co/storage/v1/object/public/documents/${user.proof_of_address_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-900 text-sm"
                        >
                          View Document
                        </a>
                      </div>
                      {!user.document_verifications?.find(doc => doc.document_type === 'address')?.is_verified && (
                        <button
                          onClick={() => verifyDocument('address')}
                          disabled={updating}
                          className="ml-4 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {updating ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver's License */}
                {user.drivers_license_url && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm font-medium text-gray-900">Driver's License</p>
                          {user.document_verifications?.find(doc => doc.document_type === 'drivers_license')?.is_verified && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Status: {user.document_verifications?.find(doc => doc.document_type === 'drivers_license')?.is_verified
                            ? 'Verified'
                            : 'Not Verified'}
                        </p>
                        <a
                          href={user.drivers_license_url.startsWith('http')
                            ? user.drivers_license_url
                            : `https://akqwnbrikxryikjyyyov.supabase.co/storage/v1/object/public/documents/${user.drivers_license_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-900 text-sm"
                        >
                          View Document
                        </a>
                      </div>
                      {!user.document_verifications?.find(doc => doc.document_type === 'drivers_license')?.is_verified && (
                        <button
                          onClick={() => verifyDocument('drivers_license')}
                          disabled={updating}
                          className="ml-4 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {updating ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* No documents message */}
                {!user.id_document_url && !user.proof_of_address_url && !user.drivers_license_url && (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            {user.hourly_rate && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hourly Rate</p>
                  <p className="text-sm text-gray-900">R{user.hourly_rate}/hour</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
              
              {user.verification_status === 'pending' && (
                <div className="space-y-3">
                  <button
                    onClick={() => updateUserStatus('approved')}
                    disabled={updating}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Approve Application'}
                  </button>
                  <button
                    onClick={() => updateUserStatus('rejected')}
                    disabled={updating}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Reject Application'}
                  </button>
                </div>
              )}

              {user.verification_status === 'approved' && (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Application approved</p>
                </div>
              )}

              {user.verification_status === 'rejected' && (
                <div className="text-center">
                  <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Application rejected</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  Updated: {new Date(user.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

