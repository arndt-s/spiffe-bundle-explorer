import type {
  SPIFFEBundle,
  SPIFFEBundleMap,
  ParsedJWK,
  ParsedX509SVID,
  ParsedBundleEntry,
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
): Promise<SPIFFEBundle | SPIFFEBundleMap> {
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

    if (isBundleMap(data)) {
      return data;
    }
    if (data && Array.isArray((data as SPIFFEBundle).keys)) {
      return data as SPIFFEBundle;
    }
    throw new Error('Invalid bundle structure: expected a JWK Set with "keys" or a SPIFFE Bundle Map with "trust_domains"');
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

export function isBundleMap(value: unknown): value is SPIFFEBundleMap {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { keys?: unknown; trust_domains?: unknown };
  if (Array.isArray(candidate.keys)) {
    return false;
  }
  return (
    candidate.trust_domains !== null &&
    typeof candidate.trust_domains === 'object' &&
    !Array.isArray(candidate.trust_domains)
  );
}

export function parseBundleMap(map: SPIFFEBundleMap): ParsedBundleEntry[] {
  const entries: ParsedBundleEntry[] = [];

  for (const [trustDomain, bundle] of Object.entries(map.trust_domains)) {
    if (!bundle || !Array.isArray(bundle.keys)) {
      throw new Error(
        `Invalid bundle for trust domain "${trustDomain}": missing "keys" array`
      );
    }
    const parsed = parseBundle(bundle);
    entries.push({
      trustDomain,
      bundle,
      jwtKeys: parsed.jwtKeys,
      x509Keys: parsed.x509Keys,
      witKeys: parsed.witKeys,
    });
  }

  return entries;
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
      if (isBundleMap(parsed)) {
        for (const [trustDomain, bundle] of Object.entries(parsed.trust_domains)) {
          if (!bundle || !Array.isArray((bundle as SPIFFEBundle).keys)) {
            return {
              isValid: false,
              error: `Invalid bundle for trust domain "${trustDomain}": missing "keys" array`,
            };
          }
        }
        return { isValid: true, type: 'json' };
      }
      if (!parsed || !Array.isArray(parsed.keys)) {
        return {
          isValid: false,
          error: 'Invalid bundle structure: expected a JWK Set with "keys" or a SPIFFE Bundle Map with "trust_domains"',
        };
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
