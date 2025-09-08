// Use the built-in Deno.serve for Supabase Edge Functions runtime

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

Deno.serve(async (req) => {
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
        // Avoid re-reading the request stream; log the known parse failure
        // The original body text is already logged above
        // Return early with error response
        return new Response(
          JSON.stringify({
            error: 'Invalid JSON in request body',
            details: error.message,
            // Body echoed earlier in logs; omit echoing back for security
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
      // Shopping/Product Search via Google Custom Search JSON API
      case 'shopping-search': {
        // Reuse the same API key as Maps if it's enabled for Custom Search API
        const CSE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
        // CX can be provided via env or per-request override
        const CSE_CX = Deno.env.get('GOOGLE_CSE_CX') || Deno.env.get('CSE_CX') || requestBody.params?.cx;
        if (!CSE_KEY || !CSE_CX) {
          return new Response(
            JSON.stringify({ error: 'CSE not configured. Ensure GOOGLE_MAPS_API_KEY (enabled for Custom Search API) and GOOGLE_CSE_CX (or provide params.cx) are set.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Helper: normalize to an absolute, https URL if possible
        const toAbsoluteUrl = (maybeUrl: string | undefined, base?: string): string | undefined => {
          try {
            if (!maybeUrl || typeof maybeUrl !== 'string') return undefined;
            let u = maybeUrl.trim();
            if (!u) return undefined;
            if (u.startsWith('//')) u = `https:${u}`;
            // new URL resolves relative paths against base
            const abs = base ? new URL(u, base).toString() : new URL(u).toString();
            // Force https for mixed content safety
            return abs.replace(/^http:\/\//i, 'https://');
          } catch {
            return undefined;
          }
        };

        // Extract best image from CSE pagemap/metatags
        const extractImage = (
          pm: any,
          og: Record<string, any>,
          product: any,
          pageUrl: string,
          host?: string,
        ): string | undefined => {
          const pick = (...keys: string[]) => keys.map(k => og?.[k]).find(Boolean) as string | undefined;
          const fromThumb = pm?.cse_thumbnail?.[0]?.src; // known tiny
          const fromCse = pm?.cse_image?.[0]?.src;
          const fromOg = pick(
            'og:image:secure_url',
            'og:image:url',
            'og:image',
            'twitter:image:src',
            'twitter:image',
            'image',
          );
          const fromProduct = product?.image || product?.imageurl;

          // Try to read width/height hints from metatags
          const ogW = Number(og['og:image:width'] || og['twitter:image:width'] || 0);
          const ogH = Number(og['og:image:height'] || og['twitter:image:height'] || 0);

          const looksTiny = (u?: string): boolean => {
            if (!u || typeof u !== 'string') return true;
            const urlStr = u.toLowerCase();
            if (urlStr.includes('thumbnail') || urlStr.includes('thumb') || urlStr.includes('/small')) return true;
            try {
              const parsed = new URL(u, pageUrl);
              const qp = parsed.searchParams;
              const w = Number(qp.get('w') || qp.get('width') || qp.get('wid') || qp.get('imageWidth') || 0);
              const h = Number(qp.get('h') || qp.get('height') || qp.get('hei') || qp.get('imageHeight') || 0);
              if ((w && w < 200) || (h && h < 200)) return true;
            } catch {}
            return false;
          };

          const ogGoodSize = ogW >= 300 || ogH >= 300;
          const cseLooksTiny = looksTiny(fromCse);
          const ogLooksTiny = looksTiny(fromOg);

          const ogFirstHosts = ['checkers.co.za', 'www.checkers.co.za', 'shoprite.co.za', 'www.shoprite.co.za'];
          const preferOgHost = host && ogFirstHosts.some(d => host === d || host.endsWith(`.${d}`));

          // Selection logic:
          // - If on an OG-preferred host and OG is not tiny (or has decent width), use OG
          // - Else if cse_image exists and isn't tiny, use it
          // - Else try product image
          // - Else last resort thumbnail
          let chosen = undefined as string | undefined;
          if (preferOgHost && fromOg && (!ogLooksTiny || ogGoodSize)) {
            chosen = fromOg;
          } else if (fromCse && !cseLooksTiny) {
            chosen = fromCse;
          } else if (fromOg && !ogLooksTiny) {
            chosen = fromOg;
          } else if (fromProduct) {
            chosen = fromProduct;
          } else {
            chosen = fromThumb;
          }

          return toAbsoluteUrl(chosen, pageUrl);
        };

        let q = requestBody.params?.q || '';
        const num = Math.min(parseInt(requestBody.params?.num ?? '8', 10) || 8, 10);
        const gl = requestBody.params?.gl || 'za';
        const wide = !!requestBody.params?.wide;
        const allowedHostsParam: string[] | undefined = requestBody.params?.allowedHosts;
        const defaultRetailers = [
          'picknpay.co.za',
          // 'checkers.co.za', // removed per request
          'woolworths.co.za',
          'shoprite.co.za',
          'takealot.com',
          'spar.co.za',
          'makro.co.za',
          'game.co.za'
        ];
        const allowedHosts = (!wide ? (allowedHostsParam && Array.isArray(allowedHostsParam) && allowedHostsParam.length ? allowedHostsParam : defaultRetailers) : []);

        // Bias query toward retailer domains if CX searches entire web
        if (!wide && !requestBody.params?.cx) {
          const sites = allowedHosts.map(d => `site:${d}`).join(' OR ');
          // AND the site filters to the query to keep it tight
          q = q ? `${q} (${sites})` : `(${sites})`;
        }

        const cseParams = new URLSearchParams({
          key: CSE_KEY,
          cx: CSE_CX,
          q,
          num: String(num),
          gl,
          safe: 'active',
          // Ask only relevant fields to trim payload
          fields: 'items(title,link,snippet,pagemap/cse_image,pagemap/cse_thumbnail,pagemap/metatags,pagemap/product,pagemap/offer,pagemap/aggregateoffer)'
        });
        const cseUrl = `https://www.googleapis.com/customsearch/v1?${cseParams.toString()}`;
        const resp = await fetch(cseUrl, { method: 'GET' });
        if (!resp.ok) {
          const t = await resp.text();
          return new Response(JSON.stringify({ error: 'CSE request failed', status: resp.status, body: t }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const data = await resp.json();

        // Broader blacklist (social, news, shorteners) with subdomain matching
        const blacklistDomains = [
          'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com', 't.co',
          'facebook.com', 'www.facebook.com', 'm.facebook.com',
          'pinterest.com', 'www.pinterest.com', 'za.pinterest.com',
          'reddit.com', 'www.reddit.com',
          'instagram.com', 'www.instagram.com',
          'wikipedia.org', 'en.wikipedia.org',
          'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
          // Exclude Checkers completely
          'checkers.co.za', 'www.checkers.co.za'
        ];
        const isBlacklisted = (host?: string) =>
          !!host && blacklistDomains.some(d => host === d || host.endsWith(`.${d}`));
        const isAllowed = (host?: string) =>
          wide || !host || allowedHosts.length === 0 || allowedHosts.some(d => host === d || host.endsWith(`.${d}`));

        const items = (data.items || [])
          .map((it: any, idx: number) => {
            const pm = it.pagemap || {};
            const product = (pm.product && pm.product[0]) || null;
            const offers = (pm.offer && pm.offer[0]) || (pm.aggregateoffer && pm.aggregateoffer[0]) || null;
            const og = (pm.metatags && pm.metatags[0]) || {};
            let host: string | undefined;
            try { host = new URL(it.link).host; } catch {}

            const imageUrl = extractImage(pm, og, product, it.link, host);
            // naive size extraction from title
            const sizeMatch = (it.title || '').match(/(\d+\s?(g|kg|ml|l|pack))/i);
            const priceMeta = og['product:price:amount'] || og['og:price:amount'] || offers?.price || offers?.lowprice;
            const currencyMeta = og['product:price:currency'] || og['og:price:currency'] || offers?.pricecurrency || offers?.priceCurrency;

            return {
              id: it.link || `cse-${idx}`,
              title: it.title || product?.name || 'Product',
              brand: product?.brand || undefined,
              size: (product?.size || (sizeMatch && sizeMatch[0])) || undefined,
              price: priceMeta || undefined,
              currency: currencyMeta || undefined,
              imageUrl: imageUrl || undefined,
              url: it.link,
              host,
            };
          })
          // keep only allowed domains (unless wide) and drop social/news + require image
          .filter((p: any) => isAllowed(p.host) && !isBlacklisted(p.host) && !!p.imageUrl);

        return new Response(JSON.stringify({ items }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
