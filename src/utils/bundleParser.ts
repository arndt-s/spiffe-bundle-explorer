import type {
  SPIFFEBundle,
  ParsedJWK,
  ParsedX509SVID,
} from '../types';
import { parseCertificateFromX5C } from './certificateParser';

export class CORSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CORSError';
  }
}

export async function fetchBundle(
  url: string,
  useProxy: boolean = false
): Promise<SPIFFEBundle> {
  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
    throw new Error('Bundle URL must use HTTPS protocol');
  }

  const fetchUrl = useProxy ? `https://api.cors.lol/?url=${encodeURIComponent(url)}` : url;

  try {
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      console.warn('Response Content-Type is not application/json');
    }

    const data = await response.json();

    if (!data.keys || !Array.isArray(data.keys)) {
      throw new Error('Invalid bundle structure: missing "keys" array');
    }

    return data as SPIFFEBundle;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new CORSError(
        'The bundle endpoint does not allow cross-origin requests.'
      );
    }
    throw error;
  }
}

export function parseBundle(bundle: SPIFFEBundle): {
  jwtKeys: ParsedJWK[];
  x509Keys: ParsedX509SVID[];
  witKeys: ParsedJWK[];
} {
  const jwtKeys: ParsedJWK[] = [];
  const x509Keys: ParsedX509SVID[] = [];
  const witKeys: ParsedJWK[] = [];

  bundle.keys.forEach((key, index) => {
    const use = key.use?.toLowerCase();

    try {
      if (use === 'jwt-svid') {
        jwtKeys.push({
          ...key,
          id: key.kid || `jwt-${index}`,
        });
      } else if (use === 'x509-svid') {
        if (key.x5c && key.x5c.length > 0) {
          const certificates = key.x5c.map((x5cEntry) =>
            parseCertificateFromX5C(x5cEntry)
          );

          x509Keys.push({
            id: `x509-${index}`,
            jwk: key,
            certificates,
          });
        } else {
          console.warn('X.509 SVID key missing x5c parameter:', key);
        }
      } else if (use === 'wit-svid') {
        witKeys.push({
          ...key,
          id: key.kid || `wit-${index}`,
        });
      } else {
        console.warn('Unknown or missing "use" parameter for key:', key);
      }
    } catch (error) {
      console.error(`Failed to parse key at index ${index}:`, error);
    }
  });

  return { jwtKeys, x509Keys, witKeys };
}

export function detectInputType(input: string): 'url' | 'json' | 'invalid' {
  const trimmed = input.trim();

  // Check if it looks like JSON
  if (trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      return 'invalid';
    }
  }

  // Check if it's a URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      new URL(trimmed);
      return 'url';
    } catch {
      return 'invalid';
    }
  }

  return 'invalid';
}

export function validateInput(input: string): { isValid: boolean; error?: string; type?: 'url' | 'json' } {
  if (!input || input.trim() === '') {
    return { isValid: false, error: 'URL or bundle JSON is required' };
  }

  const type = detectInputType(input);

  if (type === 'json') {
    // Validate JSON structure
    try {
      const parsed = JSON.parse(input.trim());
      if (!parsed.keys || !Array.isArray(parsed.keys)) {
        return { isValid: false, error: 'Invalid bundle structure: missing "keys" array' };
      }
      return { isValid: true, type: 'json' };
    } catch (err) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
  } else if (type === 'url') {
    const trimmed = input.trim();
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://localhost')) {
      return { isValid: false, error: 'URL must use HTTPS protocol (or http://localhost for testing)' };
    }
    return { isValid: true, type: 'url' };
  }

  return { isValid: false, error: 'Input must be either a valid HTTPS URL or bundle JSON' };
}

// Kept for backward compatibility
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  return validateInput(url);
}
