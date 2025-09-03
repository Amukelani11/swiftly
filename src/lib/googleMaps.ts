import { supabase } from './supabase';

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

  // ===== DELIVERY APP SPECIFIC METHODS =====

  /**
   * Find nearby stores/restaurants for pickup (Delivery App)
   */
  async findPickupLocations(
    location: { lat: number; lng: number },
    options: {
      radius?: number;
      type?: 'grocery_or_supermarket' | 'restaurant' | 'store' | 'pharmacy' | 'convenience_store';
      keyword?: string;
      openNow?: boolean;
      minPrice?: number;
      maxPrice?: number;
    } = {}
  ) {
    return this.nearbySearch(location, {
      radius: options.radius || 2000,
      type: options.type || 'grocery_or_supermarket',
      ...(options.keyword && { keyword: options.keyword }),
      ...(options.openNow !== undefined && { openNow: options.openNow }),
      ...(options.minPrice !== undefined && { minPrice: options.minPrice }),
      ...(options.maxPrice !== undefined && { maxPrice: options.maxPrice }),
    });
  }

  /**
   * Find nearby places
   */
  async nearbySearch(
    location: { lat: number; lng: number },
    options: {
      radius?: number;
      type?: string;
      keyword?: string;
      minPrice?: number;
      maxPrice?: number;
      openNow?: boolean;
      rankBy?: 'prominence' | 'distance';
    } = {}
  ) {
    const params: Record<string, any> = {
      location: `${location.lat},${location.lng}`,
    };

    if (options.radius) {
      params.radius = options.radius;
    }

    if (options.type) {
      params.type = options.type;
    }

    if (options.keyword) {
      params.keyword = options.keyword;
    }

    if (options.minPrice !== undefined) {
      params.min_price = options.minPrice;
    }

    if (options.maxPrice !== undefined) {
      params.max_price = options.maxPrice;
    }

    if (options.openNow) {
      params.opennow = true;
    }

    if (options.rankBy) {
      params.rankby = options.rankBy;
    }

    return this.makeRequest('places', params);
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

      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
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

// Export singleton instance
export const googleMaps = new GoogleMapsClient();
