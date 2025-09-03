import React, { useState, useEffect, useRef } from 'react';
import { googleMapsAdmin } from '../lib/googleMaps-admin';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
    province?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address...",
  className = "",
  disabled = false
}: GooglePlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value.length > 2) {
        await searchPlaces(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (query: string) => {
    if (query.length < 3) return;

    console.log(`🔍 Google Places: Searching for "${query}"...`);
    setLoading(true);

    try {
      const response = await googleMapsAdmin.getPlaceAutocomplete(query, {
        types: 'establishment|geocode',
        components: 'country:za', // South Africa
      });

      console.log(`🔍 Google Places: Found ${response.predictions?.length || 0} suggestions`);

      if (response.predictions && Array.isArray(response.predictions)) {
        setSuggestions(response.predictions.slice(0, 5)); // Limit to 5 suggestions
        setShowSuggestions(true);
        console.log('✅ Google Places: Autocomplete suggestions loaded');
      } else {
        setSuggestions([]);
        console.log('⚠️ Google Places: No suggestions found');
      }
    } catch (error) {
      console.error('❌ Google Places: Error fetching autocomplete suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = async (prediction: any) => {
    const fullAddress = prediction.description;
    onChange(fullAddress);
    setShowSuggestions(false);
    setSuggestions([]);

    // Get detailed place information and coordinates
    try {
      setLoading(true);
      console.log('🔍 Google Places: Getting coordinates for selected address...');
      console.log(`🔍 Google Places: Address: "${fullAddress}"`);

      const geocodeResponse = await googleMapsAdmin.geocodeAddress(fullAddress);

      if (geocodeResponse.results && geocodeResponse.results.length > 0) {
        const result = geocodeResponse.results[0];
        const location = result.geometry.location;

        console.log('🔍 Google Places: Geocoding successful!');
        console.log(`🔍 Google Places: Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);

        // Extract city and province from address components
        const addressComponents = result.address_components;
        let city = '';
        let province = '';

        addressComponents.forEach((component: any) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
            console.log(`🔍 Google Places: City: ${city}`);
          }
          if (component.types.includes('administrative_area_level_1')) {
            province = component.long_name;
            console.log(`🔍 Google Places: Province: ${province}`);
          }
        });

        console.log('✅ Google Places: Address selection complete');

        onSelect({
          address: fullAddress,
          latitude: location.lat,
          longitude: location.lng,
          city: city,
          province: province,
        });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      // Still call onSelect with just the address if geocoding fails
      onSelect({
        address: fullAddress,
        latitude: 0,
        longitude: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 ${className}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                index === selectedIndex ? 'bg-purple-50 text-purple-900' : 'text-gray-900'
              }`}
              type="button"
            >
              <div className="flex items-start">
                <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.structured_formatting?.secondary_text || suggestion.description.split(',').slice(1).join(',')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && value.length > 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
          No places found
        </div>
      )}
    </div>
  );
}
