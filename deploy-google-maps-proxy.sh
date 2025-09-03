#!/bin/bash

# Google Maps Proxy Edge Function Deployment Script
# This script helps deploy the secure Google Maps proxy to Supabase

echo "🚀 Deploying Google Maps Proxy Edge Function..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ You are not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

echo "📋 Checking Supabase project status..."
supabase status

echo ""
echo "🔧 Setting up environment variables..."
echo "Please make sure you have set the GOOGLE_MAPS_API_KEY secret:"
echo ""
echo "Option 1: Using Supabase Dashboard:"
echo "   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/secrets"
echo "   2. Add a new secret named 'GOOGLE_MAPS_API_KEY'"
echo "   3. Set the value to your Google Maps API key"
echo ""
echo "Option 2: Using Supabase CLI:"
echo "   supabase secrets set GOOGLE_MAPS_API_KEY=your_api_key_here"
echo ""

read -p "Have you set up the GOOGLE_MAPS_API_KEY secret? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set up the GOOGLE_MAPS_API_KEY secret first."
    exit 1
fi

echo ""
echo "📦 Deploying edge function..."

# Deploy the edge function
supabase functions deploy google-maps-proxy --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Google Maps Proxy deployed successfully!"
    echo ""
    echo "🧪 Testing the deployment..."

    # Test the function with a simple request
    supabase functions invoke google-maps-proxy --method POST --data '{"path": "geocode", "params": {"address": "1600 Amphitheatre Parkway, Mountain View, CA"}}'

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Function test successful!"
        echo ""
        echo "🎉 Your Google Maps Proxy is ready to use!"
        echo ""
        echo "📖 Usage:"
        echo "   - From your app, call: supabase.functions.invoke('google-maps-proxy/directions', {...})"
        echo "   - Supported endpoints: directions, geocode, places, place-details, distance-matrix, autocomplete"
        echo "   - API key is automatically included and secured"
        echo ""
        echo "🔒 Security: Your API key is never exposed to the client app!"
    else
        echo ""
        echo "⚠️ Function deployed but test failed. Please check your configuration."
        echo ""
        echo "🔍 Troubleshooting:"
        echo "   1. Verify your GOOGLE_MAPS_API_KEY is correct"
        echo "   2. Check Supabase function logs: supabase functions logs google-maps-proxy"
        echo "   3. Ensure your Google Maps API key has the required APIs enabled"
    fi
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Make sure you're in the correct project directory"
    echo "   2. Check that all files are in the correct locations:"
    echo "      - supabase/functions/google-maps-proxy/index.ts"
    echo "      - supabase/functions/_shared/cors.ts"
    echo "   3. Verify your Supabase project is properly configured"
fi

echo ""
echo "📚 Next Steps:"
echo "   1. Update your app to use the Google Maps client"
echo "   2. Import: import { googleMaps } from '../lib/googleMaps'"
echo "   3. Use: const directions = await googleMaps.getDirections(origin, destination)"
echo ""
echo "🔗 Documentation:"
echo "   - Supabase Edge Functions: https://supabase.com/docs/guides/functions"
echo "   - Google Maps Platform: https://developers.google.com/maps/documentation"


