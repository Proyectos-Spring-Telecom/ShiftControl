export interface NominatimReverseResponse {
  display_name?: string;
  address?: Record<string, string>;
  lat?: string;
  lon?: string;
  error?: string;
}

export interface ReverseGeocodingResult {
  displayName: string | null;
  address: Record<string, string> | null;
  lat: number;
  lon: number;
}
