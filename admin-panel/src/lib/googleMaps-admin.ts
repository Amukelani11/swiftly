import { supabaseAdmin } from './supabase-admin';

export interface GoogleMapsConfig {
  apiKey?: string; // Not needed when using proxy
  useProxy?: boolean;
}

export class GoogleMapsClient {
  private config: GoogleMapsConfig;

  constructor(config: GoogleMapsConfig = {}) {
    this.config = {
      useProxy: true, // Default to using proxy for security
      ...config,
    };
  }

  /**
   * Get place autocomplete suggestions
   */
  async getPlaceAutocomplete(
    input: string,
    options: {
      types?: string;
      components?: string;
      location?: { lat: number; lng: number };
      radius?: number;
      language?: string;
    } = {}
  ) {
    const params: Record<string, any> = {
      input: input,
    };

    if (options.types) {
      params.types = options.types;
    }

    if (options.components) {
      params.components = options.components;
    }

    if (options.location) {
      params.location = `${options.location.lat},${options.location.lng}`;
    }

    if (options.radius) {
      params.radius = options.radius;
    }

    if (options.language) {
      params.language = options.language;
    }

    return this.makeRequest('places-autocomplete', params);
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string) {
    const params: Record<string, any> = {
      address: address,
    };

    return this.makeRequest('geocode', params);
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(lat: number, lng: number) {
    const params: Record<string, any> = {
      latlng: `${lat},${lng}`,
    };

    return this.makeRequest('reverse-geocode', params);
  }

  /**
   * Make a request to the Google Maps API through the proxy
   */
  private async makeRequest(endpoint: string, params: Record<string, any>) {
    if (!this.config.useProxy) {
      throw new Error('Direct API calls not supported. Use proxy mode for security.');
    }

    try {
      console.log(`Invoking google-maps-proxy with endpoint: ${endpoint}`);
      console.log(`Params:`, params);

      const { data, error } = await supabaseAdmin.functions.invoke('google-maps-proxy', {
        body: {
          path: endpoint,
          params,
        },
      });

      if (error) {
        console.error(`Google Maps API error for ${endpoint}:`, error);
        throw new Error(`Google Maps API error: ${error.message}`);
      }

      if (data.error) {
        console.error(`Google Maps API error for ${endpoint}:`, data);
        throw new Error(`Google Maps API error: ${data.error}`);
      }

      console.log(`Google Maps client received data:`, data);
      console.log(`Data type:`, typeof data);
      console.log(`Data keys:`, Object.keys(data));
      return data;
    } catch (error) {
      console.error(`Failed to call Google Maps API (${endpoint}):`, error);
      throw error;
    }
  }
}

// Export singleton instance for admin panel
export const googleMapsAdmin = new GoogleMapsClient();

