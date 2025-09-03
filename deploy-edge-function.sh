#!/bin/bash

# Swiftly Edge Function Deployment Script
echo "🚀 Deploying Swiftly Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase first:"
    echo "   supabase login"
    exit 1
fi

# Deploy the auth function
echo "📦 Deploying auth function..."
supabase functions deploy auth

if [ $? -eq 0 ]; then
    echo "✅ Auth function deployed successfully!"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Copy your Supabase URL and anon key to your .env file:"
    echo "   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo ""
    echo "2. Run the database schema in your Supabase SQL editor:"
    echo "   Copy the contents of database_schema.sql and run it"
    echo ""
    echo "3. Test authentication in your app!"
    echo ""
    echo "🔗 Edge Function URL will be available at:"
    echo "   https://your-project.supabase.co/functions/v1/auth"
else
    echo "❌ Failed to deploy auth function"
    exit 1
fi








