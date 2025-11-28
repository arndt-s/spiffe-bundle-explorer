/**
 * Represents a parsed SPIFFE ID
 */
export class SpiffeId {
  private readonly trustDomain: string;
  private readonly path: string;

  constructor(trustDomain: string, path: string) {
    this.trustDomain = trustDomain;
    this.path = path;
  }

  /**
   * Returns the full SPIFFE ID (e.g., "spiffe://example.org/workload/web")
   */
  toString(): string {
    return `spiffe://${this.trustDomain}${this.path}`;
  }

  /**
   * Returns the trust domain (e.g., "example.org")
   */
  getTrustDomain(): string {
    return this.trustDomain;
  }

  /**
   * Returns the path (e.g., "/workload/web")
   */
  getPath(): string {
    return this.path;
  }
}

/**
 * Parses a SPIFFE ID string and returns a SpiffeId object
 * 
 * @param spiffeIdString - The SPIFFE ID string to parse (e.g., "spiffe://example.org/workload/web")
 * @returns A SpiffeId object
 * @throws Error if the SPIFFE ID is invalid
 * 
 * @example
 * const id = parseSpiffeId("spiffe://example.org/workload/web");
 * console.log(id.toString()); // "spiffe://example.org/workload/web"
 * console.log(id.getTrustDomain()); // "example.org"
 * console.log(id.getPath()); // "/workload/web"
 */
export function parseSpiffeId(spiffeIdString: string): SpiffeId {
  if (!spiffeIdString) {
    throw new Error('SPIFFE ID cannot be empty');
  }

  // SPIFFE ID must start with "spiffe://"
  const scheme = 'spiffe://';
  if (!spiffeIdString.startsWith(scheme)) {
    throw new Error(`SPIFFE ID must start with "${scheme}"`);
  }

  // Remove the scheme
  const remainder = spiffeIdString.slice(scheme.length);

  if (!remainder) {
    throw new Error('SPIFFE ID must contain a trust domain');
  }

  // Find the first "/" to separate trust domain from path
  const firstSlashIndex = remainder.indexOf('/');

  let trustDomain: string;
  let path: string;

  if (firstSlashIndex === -1) {
    // No path, only trust domain
    trustDomain = remainder;
    path = '';
  } else if (firstSlashIndex === 0) {
    // Path starts immediately, no trust domain
    throw new Error('SPIFFE ID must contain a trust domain');
  } else {
    trustDomain = remainder.slice(0, firstSlashIndex);
    path = remainder.slice(firstSlashIndex);
  }

  // Validate trust domain is not empty
  if (!trustDomain) {
    throw new Error('Trust domain cannot be empty');
  }

  // Validate trust domain format (basic validation)
  // Trust domain should not contain invalid characters
  if (trustDomain.includes('//') || trustDomain.includes(' ')) {
    throw new Error('Trust domain contains invalid characters');
  }

  // Validate path format if present
  if (path) {
    // Path must start with "/"
    if (!path.startsWith('/')) {
      throw new Error('Path must start with "/"');
    }

    // Path should not contain empty segments or invalid patterns
    if (path.includes('//') || path.endsWith('/')) {
      throw new Error('Path contains invalid segments');
    }
  }

  return new SpiffeId(trustDomain, path);
}
