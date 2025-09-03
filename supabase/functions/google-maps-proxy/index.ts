import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface GoogleMapsRequest {
  path: string;
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
}

// CORS headers - inline for Supabase Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Get request body for parameters first to extract endpoint
    let requestBody: GoogleMapsRequest | null = null;
    if (req.method === 'POST') {
      try {
        console.log('Processing POST request...');
        const bodyText = await req.text();
        console.log('Raw body text:', bodyText);

        if (bodyText && bodyText.trim()) {
          requestBody = JSON.parse(bodyText);
          console.log('Parsed request body:', requestBody);
        } else {
          console.log('Empty request body');
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        console.error('Body text was:', await req.clone().text());
        // Return early with error response
        return new Response(
          JSON.stringify({
            error: 'Invalid JSON in request body',
            details: error.message,
            receivedBody: await req.clone().text()
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Extract the API endpoint from the request body instead of URL path
    const endpoint = requestBody?.path || 'places'; // Default to places if not specified

    console.log(`Full URL: ${req.url}`);
    console.log(`Path parts:`, pathParts);
    console.log(`Processing endpoint from body: ${endpoint}`);

    // Get Google Maps API key from environment
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({
          error: 'Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY environment variable.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request body structure
    console.log('Validating request body:', { requestBody, hasParams: requestBody?.params, method: req.method });

    if (!requestBody) {
      console.error('Invalid request body structure:', { requestBody, hasParams: requestBody?.params });
      return new Response(
        JSON.stringify({
          error: 'Invalid request body. Expected { path: string, params: object }',
          debug: {
            requestBody,
            method: req.method,
            endpoint
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Ensure params exists
    if (!requestBody.params) {
      console.log('No params provided, setting empty object');
      requestBody.params = {};
    }

    // Route to appropriate Google Maps Platform API
    let googleMapsUrl = '';
    let requestParams: Record<string, string> = {};

    console.log(`Processing endpoint: ${endpoint}`);

    switch (endpoint) {
      // Core Maps APIs
      case 'directions':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
        break;

      case 'geocode':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        break;

      case 'reverse-geocode':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        break;

      case 'distance-matrix':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
        break;

      case 'static-map':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/staticmap';
        break;

      case 'streetview':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/streetview';
        break;

      // Places APIs
      case 'places-nearby':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        break;

      case 'places-text':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
        break;

      case 'places-details':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
        break;

      case 'places-photo':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/photo';
        break;

      case 'places-autocomplete':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
        break;

      case 'places-query-autocomplete':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/queryautocomplete/json';
        break;

      case 'places':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        break;

      case 'autocomplete':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
        break;

      // Routes API (Newer, more accurate routing)
      case 'routes-directions':
        googleMapsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        break;

      case 'routes-matrix':
        googleMapsUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
        break;

      // Roads API (for snap-to-road)
      case 'roads-nearest':
        googleMapsUrl = 'https://roads.googleapis.com/v1/nearestRoads';
        break;

      case 'roads-snap':
        googleMapsUrl = 'https://roads.googleapis.com/v1/snapToRoads';
        break;

      case 'roads-speed-limits':
        googleMapsUrl = 'https://roads.googleapis.com/v1/speedLimits';
        break;

      // Address Validation API
      case 'address-validation':
        googleMapsUrl = 'https://addressvalidation.googleapis.com/v1:addressvalidation';
        break;

      // Geolocation API
      case 'geolocation':
        googleMapsUrl = 'https://www.googleapis.com/geolocation/v1/geolocate';
        break;

      // Elevation API
      case 'elevation':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/elevation/json';
        break;

      case 'elevation-along-path':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/elevation/json';
        break;

      // Time Zone API
      case 'timezone':
        googleMapsUrl = 'https://maps.googleapis.com/maps/api/timezone/json';
        break;

      default:
        console.error(`Unknown endpoint: ${endpoint}`);
        return new Response(
          JSON.stringify({
            error: `Unknown endpoint: ${endpoint}. Supported endpoints: directions, geocode, reverse-geocode, distance-matrix, static-map, streetview, places-nearby, places-text, places-details, places-photo, places-autocomplete, places-query-autocomplete, places, autocomplete, routes-directions, routes-matrix, roads-nearest, roads-snap, roads-speed-limits, address-validation, geolocation, elevation, elevation-along-path, timezone`,
            status: 'ERROR'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    // Ensure we have a valid Google Maps URL
    if (!googleMapsUrl) {
      console.error('No Google Maps URL set for endpoint:', endpoint);
      return new Response(
        JSON.stringify({
          error: 'Invalid endpoint configuration',
          status: 'ERROR'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build parameters
    if (requestBody?.params) {
      requestParams = { ...requestBody.params };
    }

    // Add API key to all requests
    requestParams.key = GOOGLE_MAPS_API_KEY;

    // Build the full URL with parameters
    const paramString = new URLSearchParams(requestParams).toString();
    const fullUrl = `${googleMapsUrl}?${paramString}`;

    console.log(`Proxying request to: ${googleMapsUrl}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Request body:`, requestBody);
    console.log(`Parameters:`, Object.keys(requestParams).filter(k => k !== 'key'));

    // Make the request to Google Maps API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Maps API error: ${response.status}`, errorText);
      throw new Error(`Google Maps API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Google Maps API response:', data);

    // Check for Google Maps API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Maps API error:', data);
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Return the response
    console.log('Returning data to client:', { resultsCount: data.results?.length || 0, status: data.status });
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        status: 'ERROR'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
