/**
 * Encodes a string to base64url format (URL-safe base64)
 * @param str String to encode
 * @returns base64url encoded string
 */
export function base64urlEncode(str: string): string {
  // First encode to base64
  const base64 = btoa(str);

  // Convert to base64url by replacing characters and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes a base64url encoded string
 * @param str base64url encoded string
 * @returns decoded string
 */
export function base64urlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);

  // Decode from base64
  return atob(base64);
}
